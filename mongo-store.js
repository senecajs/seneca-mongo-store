/* Copyright (c) 2010-2020 Richard Rodger and other contributors, MIT License */
'use strict'

//var _ = require('lodash')
var Mongo = require('mongodb')
var Dot = require('mongo-dot-notation')
var MongoClient = Mongo.MongoClient
var ObjectID = Mongo.ObjectID

var name = 'mongo-store'

/*
native$ = object => use object as query, no meta settings
native$ = array => use first elem as query, second elem as meta settings
*/

function idstr(obj) {
  return obj && obj.toHexString ? obj.toHexString() : '' + obj
}

function makeid(hexstr) {
  if ('string' === typeof hexstr && 24 === hexstr.length) {
    try {
      return ObjectID.createFromHexString(hexstr)
    } catch (e) {
      return hexstr
    }
  }

  return hexstr
}

function fixquery(qent, q) {
  var qq = {}

  if (!q.native$) {
    if ('string' === typeof q) {
      qq = {
        _id: makeid(q),
      }
    } else if (Array.isArray(q)) {
      qq = {
        _id: {
          $in: q.map((id) => {
            return makeid(id)
          }),
        },
      }
    } else {
      if (q.id) {
        if (Array.isArray(q.id)) {
          qq._id = {
            $in: q.id.map((id) => {
              return makeid(id)
            }),
          }
        } else {
          qq._id = makeid(q.id)
        }

        //delete q.id
      } else {
        for (var qp in q) {
          if ('id' !== qp && !qp.match(/\$$/)) {
            if (Array.isArray(q[qp])) {
              qq[qp] = { $in: q[qp] }
            } else {
              qq[qp] = q[qp]
            }
          }
        }
      }
    }
  } else {
    qq = Array.isArray(q.native$) ? q.native$[0] : q.native$
  }

  return qq
}

function metaquery(qent, q) {
  var mq = {}

  if (!q.native$) {
    if (q.sort$) {
      for (var sf in q.sort$) break
      var sd = q.sort$[sf] < 0 ? 'descending' : 'ascending'
      mq.sort = [[sf, sd]]
    }

    if (q.limit$) {
      mq.limit = q.limit$ >= 0 ? q.limit$ : 0
    }

    if (q.skip$) {
      mq.skip = q.skip$ >= 0 ? q.skip$ : 0
    }

    if (q.fields$) {
      mq.fields = q.fields$
    }
  } else {
    mq = Array.isArray(q.native$) ? q.native$[1] : mq
  }

  return mq
}

module.exports = function (opts) {
  var seneca = this
  var desc

  var dbinst = null
  var dbclient = null
  var collmap = {}

  function error(args, err, cb) {
    if (err) {
      seneca.log.error('entity', err, { store: name })

      // TODO: The callback should probably be invoked through
      // process.nextTick.
      //
      cb(err)
      return true
    } else return false
  }

  function configure(conf, cb) {
    // defer connection
    // TODO: expose connection action
    //if (!_.isUndefined(conf.connect) && !conf.connect) {
    if (false === conf.connect) {
      return cb()
    }

    // Turn the hash into a mongo uri
    if (!conf.uri) {
      conf.uri = 'mongodb://'
      conf.uri += conf.username ? conf.username : ''
      conf.uri += conf.password ? ':' + conf.password + '@' : ''
      conf.uri += conf.host || conf.server
      conf.uri += conf.port ? ':' + conf.port : ':27017'
    }

    conf.db = conf.db || conf.name

    // Connect using the URI
    MongoClient.connect(conf.uri, function (err, client) {
      if (err) {
        return seneca.die('connect', err, conf)
      }
      dbclient = client
      // Set the instance to use throughout the plugin
      dbinst = client.db(conf.db)
      seneca.log.debug('init', 'db open', conf.db)
      cb(null)
    })
  }

  function getcoll(args, ent, cb) {
    var canon = ent.canon$({ object: true })

    var collname = (canon.base ? canon.base + '_' : '') + canon.name

    if (!collmap[collname]) {
      dbinst.collection(collname, function (err, coll) {
        if (!error(args, err, cb)) {
          collmap[collname] = coll
          cb(null, coll)
        }
      })
    } else {
      cb(null, collmap[collname])
    }
  }

  var store = {
    name: name,

    close: function (args, cb) {
      if (dbclient) {
        dbclient.close(cb)
      } else return cb()
    },

    save: function (args, cb) {
      const is_update = Boolean(args.ent.id)

      if (is_update) {
        return updateExisting(args, cb)
      }

      return createAndSave(args, cb)


      function createAndSave(args, cb) {
        return upsertIfRequested(args, function (err, upsert) {
          if (error(args, err, cb)) {
            return
          }

          if (upsert.upsert_requested) {
            return cb(null, upsert.out)
          }

          return createNew(args, cb)
        })


        function upsertIfRequested(args, cb) {
          const query_for_save = args.q

          if (Array.isArray(query_for_save.upsert$)) {
            const upsert_on = query_for_save.upsert$
            const public_entdata = args.ent.data$(false)

            if (upsert_on.length > 0 && upsert_on.every(p => p in public_entdata)) {
              const filter_by = upsert_on
                .reduce((acc, field) => {
                  acc[field] = args.ent[field]
                  return acc
                }, {})

              const replacement = (() => {
                const o = Dot.flatten(Object.assign({}, public_entdata))


                const NO_SPECIFIC_ID_REQUESTED = {}

                const id = tryMakeIdIfRequested(args, {
                  when_no_specific_id_requested: NO_SPECIFIC_ID_REQUESTED
                })


                if (id !== NO_SPECIFIC_ID_REQUESTED) {
                  o.$setOnInsert = { _id: id }
                }

                return o
              })()

              return getcoll(args, args.ent, function (err, coll) {
                if (error(args, err, cb)) {
                  return
                }

                return coll.updateOne(
                  filter_by,
                  replacement,
                  { upsert: true },

                  function (err /*, _upsert*/) {
                    if (error(args, err, cb)) {
                      return
                    }

                    return coll.findOne(public_entdata, function (err, entu) {
                      if (error(args, err, cb)) {
                        return
                      }

                      // NOTE: If, at this point, for some reason the document
                      // has been removed by a competing process, return null.
                      //
                      // TODO: Verify in tests that `entu` is null if not found.
                      // 
                      if (!entu) {
                        return cb(null, { upsert_requested: true, out: null })
                      }

                      return cb(null, { upsert_requested: true, out: entu })
                    })
                  }
                )
              })
            }
          }

          return cb(null, { upsert_requested: false, out: null })
        }


        function createNew(args, cb) {
          return getcoll(args, args.ent, function (err, coll) {
            if (error(args, err, cb)) {
              return
            }


            const new_doc = (function () {
              const public_entdata = args.ent.data$(false)


              const NO_SPECIFIC_ID_REQUESTED = {}

              const id = tryMakeIdIfRequested(args, {
                when_no_specific_id_requested: NO_SPECIFIC_ID_REQUESTED
              })


              const new_doc = Object.assign({}, public_entdata)

              if (id !== NO_SPECIFIC_ID_REQUESTED) {
                new_doc._id = id
              }

              return new_doc
            })()


            return coll.insertOne(new_doc, function (err, inserts) {
              if (error(args, err, cb)) {
                return
              }

              const entu = inserts.ops[0]
              let fent = null

              if (entu) {
                entu.id = idstr(entu._id)
                delete entu._id
                //fent = args.ent.make$(_.cloneDeep(entu))
                fent = args.ent.make$(seneca.util.deep(entu))
              }

              seneca.log.debug('save/insert', args.ent, desc)

              return cb(null, fent)
            })
          })
        }


        function tryMakeIdIfRequested(args, { when_no_specific_id_requested }) {
          const ent = args.ent

          if (undefined !== ent.id$) {
            return makeid(ent.id$)
          }

          if (opts.generate_id) {
            return makeid(opts.generate_id(ent))
          }

          return when_no_specific_id_requested
        }
      }


      function updateExisting(args, cb) {
        return getcoll(args, args.ent, function (err, coll) {
          if (error(args, err, cb)) {
            return
          }

          var ent = args.ent
          var entp = ent.data$(false)

          var q = { _id: makeid(ent.id) }
          delete entp.id

          var shouldMerge = true
          if (opts.merge !== false && ent.merge$ === false) {
            shouldMerge = false
          }
          if (opts.merge === false && ent.merge$ !== true) {
            shouldMerge = false
          }

          var set = entp
          var func = 'replaceOne'

          if (shouldMerge) {
            set = Dot.flatten(entp)
            func = 'updateOne'
          }

          coll[func](q, set, { upsert: true }, function (err) {
            if (!error(args, err, cb)) {
              seneca.log.debug('save/update', ent, desc)

              coll.findOne(q, {}, function (err, entu) {
                if (!error(args, err, cb)) {
                  var fent = null
                  if (entu) {
                    entu.id = idstr(entu._id)
                    delete entu._id
                    //fent = ent.make$(_.cloneDeep(entu))
                    fent = ent.make$(seneca.util.deep(entu))
                  }
                  cb(null, fent)
                }
              })
            }
          })
        })
      }
    },

    load: function (args, cb) {
      var qent = args.qent
      var q = args.q

      getcoll(args, qent, function (err, coll) {
        if (!error(args, err, cb)) {
          var mq = metaquery(qent, q)
          var qq = fixquery(qent, q)

          coll.findOne(qq, mq, function (err, entp) {
            if (!error(args, err, cb)) {
              var fent = null
              if (entp) {
                entp.id = idstr(entp._id)
                delete entp._id
                fent = qent.make$(entp)
              }
              seneca.log.debug('load', q, fent, desc)
              cb(null, fent)
            }
          })
        }
      })
    },

    list: function (args, cb) {
      var qent = args.qent
      var q = args.q

      getcoll(args, qent, function (err, coll) {
        if (!error(args, err, cb)) {
          var mq = metaquery(qent, q)
          var qq = fixquery(qent, q)

          coll.find(qq, mq, function (err, cur) {
            if (!error(args, err, cb)) {
              var list = []

              cur.each(function (err, entp) {
                if (!error(args, err, cb)) {
                  if (entp) {
                    var fent = null
                    entp.id = idstr(entp._id)
                    delete entp._id
                    fent = qent.make$(entp)
                    list.push(fent)
                  } else {
                    seneca.log.debug('list', q, list.length, list[0], desc)
                    cb(null, list)
                  }
                }
              })
            }
          })
        }
      })
    },

    remove: function (args, cb) {
      var qent = args.qent
      var q = args.q

      var all = q.all$ // default false
      var load = null == q.load$ ? false : q.load$ // default false

      getcoll(args, qent, function (err, coll) {
        if (!error(args, err, cb)) {
          var qq = fixquery(qent, q)
          var mq = metaquery(qent, q)

          if (all) {
            coll.find(qq, mq, function (err, cur) {
              if (!error(args, err, cb)) {
                var list = []
                var toDelete = []

                cur.each(function (err, entp) {
                  if (!error(args, err, cb)) {
                    if (entp) {
                      var fent = null
                      if (entp) {
                        toDelete.push(entp._id)
                        entp.id = idstr(entp._id)
                        delete entp._id
                        fent = qent.make$(entp)
                      }
                      list.push(fent)
                    } else {
                      coll.remove({ _id: { $in: toDelete } }, function (err) {
                        seneca.log.debug('remove/all', q, desc)
                        cb(err, null)
                      })
                    }
                  }
                })
              }
            })
          } else {
            coll.findOne(qq, mq, function (err, entp) {
              if (!error(args, err, cb)) {
                if (entp) {
                  coll.deleteOne({ _id: entp._id }, {}, function (err) {
                    seneca.log.debug('remove/one', q, entp, desc)
                    var ent = load ? entp : null
                    cb(err, ent)
                  })
                } else cb(null)
              }
            })
          }
        }
      })
    },

    native: function (args, done) {
      dbinst.collection('seneca', function (err, coll) {
        if (!error(args, err, done)) {
          coll.findOne({}, {}, function (err) {
            if (!error(args, err, done)) {
              done(null, dbinst)
            } else {
              done(err)
            }
          })
        } else {
          done(err)
        }
      })
    },
  }

  var meta = seneca.store.init(seneca, opts, store)
  desc = meta.desc

  seneca.add({ init: store.name, tag: meta.tag }, function (args, done) {
    configure(opts, function (err) {
      if (err)
        return seneca.die('store', err, { store: store.name, desc: desc })
      return done()
    })
  })

  return {
    name: store.name,
    tag: meta.tag,
    export: {
      mongo: () => dbinst,
    },
  }
}
