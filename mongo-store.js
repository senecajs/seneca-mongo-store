/* Copyright (c) 2010-2020 Richard Rodger and other contributors, MIT License */
'use strict'

//var _ = require('lodash')
var Mongo = require('mongodb')
var Dot = require('mongo-dot-notation')
var MongoClient = Mongo.MongoClient

var name = 'mongo-store'

const {
  ensure_id,
  makeid,
  idstr,
  fixquery,
  metaquery
} = require('./lib/common')

/*
native$ = object => use object as query, no meta settings
native$ = array => use first elem as query, second elem as meta settings
*/

module.exports = function (opts) {
  var seneca = this
  var desc

  var dbinst = null
  var dbclient = null
  var collmap = {}

  function error(_args, err, cb) {
    if (err) {
      seneca.log.error('entity', err, { store: name })

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

    save: function (msg, done) {
      return getcoll(msg, msg.ent, function (err, coll) {
        if (error(msg, err, done)) {
          return
        }

        const is_update = null != msg.ent.id

        if (is_update) {
          return update(msg, coll, done)
        }

        return create(msg, coll, done)
      })


      function create(msg, coll, done) {
        const upsert_fields = isUpsertRequested(msg)

        if (null == upsert_fields) {
          return createNew(msg, coll, done)
        }

        return doUpsert(upsert_fields, msg, coll, done)


        function isUpsertRequested(msg) {
          if (null == msg.q) {
            return null
          }

          if (!Array.isArray(msg.q.upsert$)) {
            return null
          }

          const upsert_fields = msg.q.upsert$.filter(p => !p.includes('$'))
          const public_entdata = msg.ent.data$(false)

          const is_upsert = upsert_fields.length > 0 &&
            upsert_fields.every(p => p in public_entdata)

          return is_upsert ? upsert_fields : null
        }

        function doUpsert(upsert_fields, msg, coll, done) {
          const public_entdata = msg.ent.data$(false)

          const filter_by = upsert_fields
            .reduce((acc, field) => {
              acc[field] = msg.ent[field]
              return acc
            }, {})

          const replacement = (() => {
            const o = Dot.flatten(Object.assign({}, public_entdata))
            const id = ensure_id(msg.ent, opts)

            if (null != id) {
              o.$setOnInsert = { _id: id }
            }

            return o
          })()

          return coll.findOneAndUpdate(
            filter_by,
            replacement,
            { upsert: true, returnOriginal: false },

            function (err, update) {
              if (error(msg, err, done)) {
                return
              }

              const doc = update.value
              const fent = makeEntityOfDocument(doc, msg.ent)

              seneca.log.debug('save/upsert', msg.ent, desc)

              return done(null, fent)
            }
          )
        }


        function createNew(msg, coll, done) {
          const new_doc = (function () {
            const public_entdata = msg.ent.data$(false)
            const id = ensure_id(msg.ent, opts)


            const new_doc = Object.assign({}, public_entdata)

            if (null != id) {
              new_doc._id = id
            }

            return new_doc
          })()


          return coll.insertOne(new_doc, function (err, inserts) {
            if (error(msg, err, done)) {
              return
            }

            const doc = inserts.ops[0]
            const fent = makeEntityOfDocument(doc, msg.ent)

            seneca.log.debug('save/insert', msg.ent, desc)

            return done(null, fent)
          })
        }
      }


      function update(msg, coll, done) {
        var ent = msg.ent
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
          if (!error(msg, err, done)) {
            seneca.log.debug('save/update', ent, desc)

            coll.findOne(q, {}, function (err, doc) {
              if (!error(msg, err, done)) {
                return done(null, makeEntityOfDocument(doc, ent))
              }
            })
          }
        })
      }

      function makeEntityOfDocument(doc, ent) {
        if (null == doc) {
          return null
        }

        doc.id = idstr(doc._id)
        delete doc._id

        return ent.make$(seneca.util.deep(doc))
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
