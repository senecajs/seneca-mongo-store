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

function idstr (obj) {
  return obj && obj.toHexString ? obj.toHexString() : '' + obj
}

function makeid (hexstr) {
  if (_.isString(hexstr) && hexstr.length === 24) {
    try {
      return ObjectID.createFromHexString(hexstr)
    } catch (e) {
      return hexstr
    }
  }

  return hexstr
}

function fixquery (qent, q) {
  var qq = {}

  if (!q.native$) {
    for (var qp in q) {
      if (!qp.match(/\$$/)) {
        qq[qp] = q[qp]
      }
    }
    if (qq.id) {
      qq._id = makeid(qq.id)
      delete qq.id
    }
  } else {
    qq = _.isArray(q.native$) ? q.native$[0] : q.native$
  }

  return qq
}

function metaquery (qent, q) {
  var mq = {}

  if (!q.native$) {
    if (q.sort$) {
      for (var sf in q.sort$) break
      var sd = q.sort$[sf] < 0 ? 'descending' : 'ascending'
      mq.sort = [[sf, sd]]
    }

    if (q.limit$) {
      mq.limit = q.limit$
    }

    if (q.skip$) {
      mq.skip = q.skip$
    }

    if (q.fields$) {
      mq.fields = q.fields$
    }
  } else {
    mq = _.isArray(q.native$) ? q.native$[1] : mq
  }

  return mq
}

module.exports = function (opts) {
  var seneca = this
  var desc

  var dbinst = null
  var collmap = {}

  function error (args, err, cb) {
    if (err) {
      seneca.log.error('entity', err, { store: name })
      cb(err)
      return true
    } else return false
  }

  function configure (conf, cb) {
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
      conf.uri += conf.port ? ':' + conf.port : ''
      conf.uri += '/' + (conf.db || conf.name)
    }

    // Extend the db options with some defaults
    // See http://mongodb.github.io/node-mongodb-native/2.0/reference/connecting/connection-settings/ for options
    var options = seneca.util.deepextend(
      {
        db: {},
        server: {},
        replset: {},
        mongos: {}
      },
      conf.options
    )

    // Connect using the URI
    MongoClient.connect(conf.uri, options, function (err, db) {
      if (err) {
        return seneca.die('connect', err, conf)
      }

      // Set the instance to use throughout the plugin
      dbinst = db
      seneca.log.debug('init', 'db open', conf)
      cb(null)
    })
  }

  function getcoll (args, ent, cb) {
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
      if (dbinst) {
        dbinst.close(cb)
      } else return cb()
    },

    save: function (args, cb) {
      var ent = args.ent

      var update = !!ent.id

      getcoll(args, ent, function (err, coll) {
        if (!error(args, err, cb)) {
          var entp = {}

          var fields = ent.fields$()
          fields.forEach(function (field) {
            entp[field] = ent[field]
          })
          if (!update && void 0 !== ent.id$) {
            entp._id = makeid(ent.id$)
          }

          if (update) {
            var q = { _id: makeid(ent.id) }
            delete entp.id
            var upsert = 'upsert$' in ent ? ent.upsert$ : true
            coll.updateOne(q, { $set: entp }, { upsert: upsert }, function (
              err,
              update
            ) {
              if (!error(args, err, cb)) {
                seneca.log.debug('save/update', ent, desc)
                cb(null, ent)
              }
            })
          } else {
            coll.insertOne(entp, function (err, inserts) {
              if (!error(args, err, cb)) {
                ent.id = idstr(inserts.ops[0]._id)

                seneca.log.debug('save/insert', ent, desc)
                cb(null, ent)
              }
            })
          }
        }
      })
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
                    if (entp) {
                      entp.id = idstr(entp._id)
                      delete entp._id

                      fent = qent.make$(entp)
                    }
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
      var load = _.isUndefined(q.load$) ? true : q.load$ // default true

      getcoll(args, qent, function (err, coll) {
        if (!error(args, err, cb)) {
          var qq = fixquery(qent, q)

          if (all) {
            coll.deleteMany(qq, {}, function (err) {
              seneca.log.debug('remove/all', q, desc)
              cb(err)
            })
          } else {
            var mq = metaquery(qent, q)
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
          coll.findOne({}, {}, function (err, entp) {
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
    }
  }

  var meta = seneca.store.init(seneca, opts, store)
  desc = meta.desc

  seneca.add({ init: store.name, tag: meta.tag }, function (args, done) {
    configure(opts, function (err) {
      if (err) {
        return seneca.die('store', err, { store: store.name, desc: desc })
      }
      return done()
    })
  })

  return { name: store.name, tag: meta.tag }
}
