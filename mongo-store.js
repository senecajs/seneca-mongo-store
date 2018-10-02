/* Copyright (c) 2010-2015 Richard Rodger, MIT License */
'use strict'

var _ = require('lodash')
var Mongo = require('mongodb')
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
  if (_.isString(hexstr) && 24 === hexstr.length) {
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
    if (_.isString(q)) {
      qq = {
        _id: makeid(q)
      }
    } else if (_.isArray(q)) {
      qq = {
        _id: {
          $in: q.map(id => {
            return makeid(id)
          })
        }
      }
    } else {
      for (var qp in q) {
        if (!qp.match(/\$$/)) {
          qq[qp] = q[qp]
        }
      }
      if (qq.id) {
        qq._id = makeid(qq.id)
        delete qq.id
      }
    }
  } else {
    qq = _.isArray(q.native$) ? q.native$[0] : q.native$
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
      mq.projection = q.fields$
    }

    if (q.hint$) {
      mq.hint = q.hint$
    }
  }
  else {
    mq = _.isArray(q.native$) ? q.native$[1] : mq
  }

  return mq
}

module.exports = function(opts) {
  var seneca = this
  var desc

  var dbclient = null
  var defaultDB
  var collmap = {}

  function error(args, err, cb) {
    if (err) {
      seneca.log.error('entity', err, { store: name })
      cb(err)
      return true
    } else return false
  }

  function configure(conf, cb) {
    // defer connection
    // TODO: expose connection action
    if (!_.isUndefined(conf.connect) && !conf.connect) {
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

    // Keeping trace of the default database name to use throughout the plugin if canon entity's zone is not defined
    defaultDB = conf.db = conf.db || conf.name

    // Connect using the URI
    MongoClient.connect(
      conf.uri,
      { useNewUrlParser: true },
      function(err, client) {
        if (err) {
          return seneca.die('connect', err, conf)
        }
        dbclient = client
        seneca.log.debug('init', 'db connect', conf.uri)
        cb(null)
      }
    )
  }

  function getcoll(args, ent, cb) {
    var canon = ent.canon$({ object: true })

    var zone = canon.zone ? canon.zone : defaultDB
    var collname = (canon.base ? canon.base + '_' : '') + canon.name

    if (_.isEmpty(zone)) cb(new Error('No canon/zone define in entity ' + collname + ' and no default database defined.'))

    collmap[zone] = collmap[zone] || {}
    if (!collmap[zone][collname]) {
      let db = dbclient.db(zone)
      db.collection(collname, function (err, coll) {
        if (!error(args, err, cb)) {
          collmap[zone][collname] = coll
          cb(null, coll, db)
        }
      })
    }
    else {
      cb(null, collmap[zone][collname])
    }
  }

  var store = {
    name: name,

    close: function(args, cb) {
      if (dbclient) {
        dbclient.close(cb)
      } else return cb()
    },

    save: function(args, cb) {
      var ent = args.ent

      var update = !!ent.id

      getcoll(args, ent, function(err, coll) {
        if (!error(args, err, cb)) {
          var entp = {}

          var fields = ent.fields$()
          fields.forEach(function(field) {
            entp[field] = ent[field]
          })

          if (!update) {
            var id
            if (undefined !== ent.id$) {
              id = ent.id$
            } else if (opts.generate_id) {
              id = opts.generate_id(ent)
            }

            entp._id = makeid(id)

            coll.insertOne(entp, function(err, inserts) {
              if (!error(args, err, cb)) {
                ent.id = idstr(inserts.ops[0]._id)
                seneca.log.debug('save/insert', ent, desc)
                cb(null, _.cloneDeep(ent))
              }
            })
          } else {
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
              set = { $set: entp }
              func = 'updateOne'
            }

            var handle = function (err) {
              if (!error(args, err, cb)) {
                seneca.log.debug('save/update', ent, desc)
                coll.findOne(q, {}, function(err, entu) {
                  if (!error(args, err, cb)) {
                    var fent = null
                    if (entu) {
                      entu.id = idstr(entu._id)
                      delete entu._id
                      fent = ent.make$(entu)
                    }
                    cb(null, fent)
                  }
                })
              }
            }

            coll[func](q, set, { upsert: true }, function(err) {
              // https://jira.mongodb.org/browse/SERVER-14322 => catch duplicate key and retry one time
              if (err && err.message.includes('E11000')) {
                seneca.log.warn('Duplicate key caught:', err.message)
                // retry
                coll[func](q, set, { upsert: true }, handle)
              } else handle(err)
            })
          }
        }
      })
    },

    load: function (args, cb) {
      var qent = args.qent
      var q = args.q

      getcoll(args, qent, function(err, coll) {
        if (!error(args, err, cb)) {
          var mq = metaquery(qent, q)
          var qq = fixquery(qent, q)

          coll.findOne(qq, mq, function(err, entp) {
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

    list: function(args, cb) {
      var qent = args.qent
      var q = args.q

      getcoll(args, qent, function(err, coll) {
        if (!error(args, err, cb)) {
          var mq = metaquery(qent, q)
          var qq = fixquery(qent, q)

          coll.find(qq, mq, function(err, cur) {
            if (!error(args, err, cb)) {
              var list = []

              cur.forEach(function(entp) {
                var fent = null
                entp.id = idstr(entp._id)
                delete entp._id
                fent = qent.make$(entp)
                list.push(fent)
              }).then(function() {
                seneca.log.debug('list', q, list.length, list[0], desc)
                cb(null, list)
              }).catch(function(err) {
                error(args, err, cb)
              })
            }
          })
        }
      })
    },

    remove: function(args, cb) {
      var qent = args.qent
      var q = args.q

      var all = q.all$ // default false
      var load = _.isUndefined(q.load$) ? false : q.load$ // default false

      getcoll(args, qent, function(err, coll) {
        if (!error(args, err, cb)) {
          var qq = fixquery(qent, q)
          var mq = metaquery(qent, q)

          if (all) {
            coll.find(qq, mq, function(err, cur) {
              if (!error(args, err, cb)) {
                var list = []
                var toDelete = []

                cur.forEach(function(entp) {
                  if (entp) {
                    var fent = null
                    if (entp) {
                      toDelete.push(entp._id)
                      entp.id = idstr(entp._id)
                      delete entp._id
                      fent = qent.make$(entp)
                    }
                    list.push(fent)
                  }
                }).then(function() {
                  coll.deleteMany({ _id: { $in: toDelete } }, function(err) {
                    seneca.log.debug('remove/all', q, desc)
                    cb(err, null)
                  })
                }).catch(function(err) {
                  error(args, err, cb)
                })
              }
            })
          } else {
            coll.findOne(qq, mq, function(err, entp) {
              if (!error(args, err, cb)) {
                if (entp) {
                  coll.deleteOne({ _id: entp._id }, {}, function(err) {
                    entp.id = idstr(entp._id)
                    delete entp._id
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
      var zone = defaultDB
      if (args.ent) {
        var canon = args.ent.canon$({object: true})
        zone = canon.zone ? canon.zone : defaultDB
      }
      var db = dbclient.db(zone)
      db.collection('seneca', function (err, coll) {
        if (!error(args, err, done)) {
          coll.findOne({}, {}, function(err) {
            if (!error(args, err, done)) {
              done(null, db)
            }
            else {
              done(err)
            }
          })
        } else {
          done(err)
        }
      })
    }
  }

  var meta = seneca.store.init(seneca, opts, store)
  desc = meta.desc

  seneca.add({ init: store.name, tag: meta.tag }, function(args, done) {
    configure(opts, function(err) {
      if (err)
        return seneca.die('store', err, { store: store.name, desc: desc })
      return done()
    })
  })

  return { name: store.name, tag: meta.tag }
}
