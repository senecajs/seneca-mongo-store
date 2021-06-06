/* Copyright (c) 2010-2020 Richard Rodger and other contributors, MIT License */
'use strict'

const Mongo = require('mongodb')
const Dot = require('mongo-dot-notation')
const MongoClient = Mongo.MongoClient

const name = 'mongo-store'

const {
  ensure_id,
  makeid,
  idstr,
  fixquery,
  metaquery,
  makeent,
  should_merge
} = require('./lib/common')

/*
native$ = object => use object as query, no meta settings
native$ = array => use first elem as query, second elem as meta settings
*/

module.exports = function (opts) {
  const seneca = this
  let desc

  let dbinst = null
  let dbclient = null
  let collmap = {}

  function error(args, err, cb) {
    if (err) {
      seneca.log.error('entity', err, args, { store: name })

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
    return MongoClient.connect(
      conf.uri,

      { useUnifiedTopology: true },

      function (err, client) {
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
    const canon = ent.canon$({ object: true })
    const collname = (canon.base ? canon.base + '_' : '') + canon.name

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

  const store = {
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
        const upsert_fields = isUpsert(msg)

        if (null == upsert_fields) {
          return createNew(msg, coll, done)
        }

        return doUpsert(upsert_fields, msg, coll, done)


        function isUpsert(msg) {
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
              const fent = makeent(doc, msg.ent, seneca)

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
            const fent = makeent(doc, msg.ent, seneca)

            seneca.log.debug('save/insert', msg.ent, desc)

            return done(null, fent)
          })
        }
      }


      function update(msg, coll, done) {
        const ent = msg.ent
        const entp = ent.data$(false)

        const q = { _id: makeid(ent.id) }
        delete entp.id

        let set = entp
        let func = 'replaceOne'

        if (should_merge(ent, opts)) {
          set = Dot.flatten(entp)
          func = 'updateOne'
        }

        coll[func](q, set, { upsert: true }, function (err) {
          if (!error(msg, err, done)) {
            seneca.log.debug('save/update', ent, desc)

            coll.findOne(q, {}, function (err, doc) {
              if (!error(msg, err, done)) {
                return done(null, makeent(doc, ent, seneca))
              }
            })
          }
        })
      }
    },

    load: function (args, cb) {
      const qent = args.qent
      const q = args.q

      return getcoll(args, qent, function (err, coll) {
        if (!error(args, err, cb)) {
          const mq = metaquery(q)
          const qq = fixquery(q)

          return coll.findOne(qq, mq, function (err, entp) {
            if (!error(args, err, cb)) {
              let fent = null
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
      const qent = args.qent
      const q = args.q

      return getcoll(args, qent, function (err, coll) {
        if (!error(args, err, cb)) {
          const mq = metaquery(q)
          const qq = fixquery(q)

          return coll.find(qq, mq, function (err, cur) {
            if (!error(args, err, cb)) {
              const list = []

              cur.each(function (err, entp) {
                if (!error(args, err, cb)) {
                  if (entp) {
                    let fent = null
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
      const qent = args.qent
      const q = args.q

      const all = q.all$ // default false
      const load = null == q.load$ ? false : q.load$ // default false

      getcoll(args, qent, function (err, coll) {
        if (!error(args, err, cb)) {
          const qq = fixquery(q)
          const mq = metaquery(q)

          if (all) {
            return coll.find(qq, mq, function (err, cur) {
              if (!error(args, err, cb)) {
                const list = []
                const toDelete = []

                cur.each(function (err, entp) {
                  if (!error(args, err, cb)) {
                    if (entp) {
                      let fent = null
                      if (entp) {
                        toDelete.push(entp._id)
                        entp.id = idstr(entp._id)
                        delete entp._id
                        fent = qent.make$(entp)
                      }
                      list.push(fent)
                    } else {
                      coll.deleteMany({ _id: { $in: toDelete } }, function (err) {
                        seneca.log.debug('remove/all', q, desc)
                        cb(err, null)
                      })
                    }
                  }
                })
              }
            })
          } else {
            return coll.findOne(qq, mq, function (err, entp) {
              if (!error(args, err, cb)) {
                if (entp) {
                  return coll.deleteOne({ _id: entp._id }, {}, function (err) {
                    seneca.log.debug('remove/one', q, entp, desc)
                    const ent = load ? entp : null
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

  const meta = seneca.store.init(seneca, opts, store)
  desc = meta.desc

  seneca.add({ init: store.name, tag: meta.tag }, function (args, done) {
    configure(opts, function (err) {
      if (err) {
        return seneca.die('store', err, { store: store.name, desc: desc })
      }

      return done()
    })
  })

  return {
    name: store.name,
    tag: meta.tag,
    export: {
      mongo: () => dbinst,
    }
  }
}
