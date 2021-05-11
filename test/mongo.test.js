/*
  MIT License,
  Copyright (c) 2010-2021, Richard Rodger and other contributors.
*/

'use strict'

var Util = require('util')
const Assert = require('assert')
const SpecHelpers = require('./support/helpers')

var Seneca = require('seneca')
var Async = require('async')

const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const expect = Code.expect

const lab = (exports.lab = Lab.script())
const { describe, before, beforeEach, after, afterEach } = lab
const it = make_it(lab)

var Shared = require('seneca-store-test')

var si = Seneca().test()

var senecaMerge = Seneca().test()

describe('mongo tests', function () {
  before({}, function (done) {
    if (si.version >= '2.0.0') {
      si.use('entity')
      senecaMerge.use('entity')
    }
    senecaMerge.use(require('..'), {
      uri: 'mongodb://127.0.0.1:27017',
      db: 'senecatest',
      merge: false,
    })
    si.use(require('..'), {
      uri: 'mongodb://127.0.0.1:27017',
      db: 'senecatest',
    })
    si.ready(done)
  })

  describe('basic tests', () => {
    Shared.basictest({
      seneca: si,
      senecaMerge: senecaMerge,
      script: lab
    })
  })

  describe('limit tests', () => {
    Shared.limitstest({
      seneca: si,
      script: lab
    })
  })

  describe('sort tests', () => {
    Shared.sorttest({
      seneca: si,
      script: lab
    })
  })

  describe('upsert tests', () => {
    before(prepareForRaceConditionTesting)

    after(unprepareAfterRaceConditionTesting)

    Shared.upserttest({
      seneca: si,
      script: lab
    })

    // NOTE: WARNING: The reason we need a unique index on the users.email
    // field is for Mongo to be able to avert race conditions. Without it,
    // the plugin will fail the race condition tests.
    //
    // It is a case of a leaky abstraction that we "know" what collection
    // and what field will be used in a race condition test in seneca-store-test.
    // We may want to come up with a better alternative in the future.
    //
    function prepareForRaceConditionTesting() {
      return new Promise((resolve, reject) => {
        return si.make('users').native$((err, db) => {
          if (err) {
            return reject(err)
          }

          return db.collection('users')
            .createIndex({ email: 1 }, { unique: true }, err => {
              if (err) {
                return reject(err)
              }

              return resolve()
            })
        })
      })
    }

    function unprepareAfterRaceConditionTesting() {
      return new Promise((resolve, reject) => {
        return si.make('users').native$((err, db) => {
          if (err) {
            return reject(err)
          }

          return db.collection('users')
            .dropIndex({ email: 1 }, err => {
              if (err) {
                return reject(err)
              }

              return resolve()
            })
        })
      })
    }

  })

  describe('extra tests', () => {
    it('extra test', function (done) {
      extratest(si, done)
    })

    describe('#save$', () => {
      describe('creating a new entity', () => {
        describe('the save$ query includes the id$ field', () => {
          const si = makeSenecaForTest()

          beforeEach(() => waitOnSeneca(si))

          beforeEach(clearDb)

          afterEach(clearDb)


          const new_id = 'ffffa6f73a861890cc1f4e23'

          it('creates a new entity with the given id', fin => {
            si.test(fin)

            si.make('user')
              .data$({ first_name: 'Frank', last_name: 'Sinatra' })
              .save$({ id$: new_id }, err => {
                if (err) {
                  return fin(err)
                }

                si.make('user').list$({}, (err, users) => {
                  if (err) {
                    return fin(err)
                  }

                  expect(users.length).to.equal(1)

                  const user = users[0]

                  expect(user.id).to.equal(new_id)

                  return fin()
                })
              })
          })

          it('passes the new entitity to the save$ callback', fin => {
            si.test(fin)

            si.make('user')
              .data$({ first_name: 'Frank', last_name: 'Sinatra' })
              .save$({ id$: new_id }, (err, user) => {
                if (err) {
                  return fin(err)
                }

                expect(user).to.contain({
                  id: new_id,
                  first_name: 'Frank',
                  last_name: 'Sinatra'
                })

                return fin()
              })
          })

          function clearDb() {
            return new Promise((resolve, reject) => {
              si.make('user').remove$({ all$: true }, err => {
                if (err) {
                  return reject(err)
                }
                
                return resolve()
              })
            })
          }
        })

        describe('the mongo store plugin is passed the `generate_id` option', () => {
          const new_id = 'ffffa6f73a861890cc1f4e23'

          const si = makeSenecaForTest({
            mongo_store_opts: {
              generate_id(_ent) {
                return new_id
              }
            }
          })

          beforeEach(() => waitOnSeneca(si))

          beforeEach(clearDb)

          afterEach(clearDb)

          it('creates a new entity with the given id', fin => {
            si.test(fin)

            si.make('user')
              .data$({ first_name: 'Frank', last_name: 'Sinatra' })
              .save$(err => {
                if (err) {
                  return fin(err)
                }

                si.make('user').list$({}, (err, users) => {
                  if (err) {
                    return fin(err)
                  }

                  expect(users.length).to.equal(1)

                  const user = users[0]

                  expect(user.id).to.equal(new_id)

                  return fin()
                })
              })
          })

          it('passes the new entitity to the save$ callback', fin => {
            si.test(fin)

            si.make('user')
              .data$({ first_name: 'Frank', last_name: 'Sinatra' })
              .save$((err, user) => {
                if (err) {
                  return fin(err)
                }

                expect(user).to.contain({
                  id: new_id,
                  first_name: 'Frank',
                  last_name: 'Sinatra'
                })

                return fin()
              })
          })

          function clearDb() {
            return new Promise((resolve, reject) => {
              si.make('user').remove$({ all$: true }, err => {
                if (err) {
                  return reject(err)
                }
                
                return resolve()
              })
            })
          }
        })

        describe('both the save$.id$ field is present and the plugin includes the `generate_id` option', () => {
          const new_id_via_generate_id = 'ffffa6f73a861890cc1f4e23'
          const new_id_via_save_query = 'bbbba6f73a861890cc1f4e23'

          const si = makeSenecaForTest({
            mongo_store_opts: {
              generate_id(_ent) {
                return new_id_via_generate_id
              }
            }
          })

          beforeEach(() => waitOnSeneca(si))

          beforeEach(clearDb)

          afterEach(clearDb)

          it('creates a new entity with the id in the save$ query', fin => {
            si.test(fin)

            si.make('user')
              .data$({ first_name: 'Frank', last_name: 'Sinatra' })
              .save$({ id$: new_id_via_save_query }, err => {
                if (err) {
                  return fin(err)
                }

                si.make('user').list$({}, (err, users) => {
                  if (err) {
                    return fin(err)
                  }

                  expect(users.length).to.equal(1)

                  const user = users[0]

                  expect(user.id).to.equal(new_id_via_save_query)

                  return fin()
                })
              })
          })

          it('passes the new entitity to the save$ callback', fin => {
            si.test(fin)

            si.make('user')
              .data$({ first_name: 'Frank', last_name: 'Sinatra' })
              .save$({ id$: new_id_via_save_query }, (err, user) => {
                if (err) {
                  return fin(err)
                }

                expect(user).to.contain({
                  id: new_id_via_save_query,
                  first_name: 'Frank',
                  last_name: 'Sinatra'
                })

                return fin()
              })
          })

          function clearDb() {
            return new Promise((resolve, reject) => {
              si.make('user').remove$({ all$: true }, err => {
                if (err) {
                  return reject(err)
                }
                
                return resolve()
              })
            })
          }
        })
      })

      describe('updating an existing entity', () => {
        describe('the merge:false option is passed to the plugin', () => {
          const si = makeSenecaForTest({
            mongo_store_opts: {
              merge: false
            }
          })

          beforeEach(() => waitOnSeneca(si))

          beforeEach(clearDb)

          beforeEach(() => new Promise((resolve, reject) => {
            si.make('user')
              .data$({ first_name: 'Frank', last_name: 'Sinatra' })
              .save$(err => {
                if (err) {
                  return reject(err)
                }

                return resolve()
              })
          }))


          let target_user_id

          beforeEach(() => new Promise((resolve, reject) => {
            si.make('user')
              .data$({ first_name: 'Elvis', last_name: 'Presley' })
              .save$((err, user) => {
                if (err) {
                  return reject(err)
                }

                Assert.ok(user, 'user')
                target_user_id = SpecHelpers.fetchProp(user, 'id')

                return resolve()
              })
          }))


          let target_user

          beforeEach(() => new Promise((resolve, reject) => {
            // Do a fresh fetch from the db.
            //
            si.make('user')
              .load$(target_user_id, (err, user) => {
                if (err) {
                  return reject(err)
                }

                Assert.ok(user, 'user')
                target_user = user

                return resolve()
              })
          }))

          afterEach(clearDb)


          it('replaces the existing entity', fin => {
            si.test(fin)

            target_user
              .data$({ first_name: 'ELVIS' })
              .save$(err => {
                if (err) {
                  return fin(err)
                }

                si.make('user').list$({}, (err, users) => {
                  if (err) {
                    return fin(err)
                  }

                  expect(users.length).to.equal(2)

                  expect(users[0]).to.contain({
                    first_name: 'Frank',
                    last_name: 'Sinatra'
                  })

                  expect(users[1]).to.contain({
                    id: target_user_id,
                    first_name: 'ELVIS',
                    last_name: 'Presley'
                  })

                  return fin()
                })
              })
          })

          function clearDb() {
            return new Promise((resolve, reject) => {
              si.make('user').remove$({ all$: true }, err => {
                if (err) {
                  return reject(err)
                }
                
                return resolve()
              })
            })
          }
        })

        describe('without the merge option', () => {
          const si = makeSenecaForTest()

          beforeEach(() => waitOnSeneca(si))

          beforeEach(clearDb)

          beforeEach(() => new Promise((resolve, reject) => {
            si.make('user')
              .data$({ first_name: 'Frank', last_name: 'Sinatra' })
              .save$(err => {
                if (err) {
                  return reject(err)
                }

                return resolve()
              })
          }))


          let target_user_id

          beforeEach(() => new Promise((resolve, reject) => {
            si.make('user')
              .data$({ first_name: 'Elvis', last_name: 'Presley' })
              .save$((err, user) => {
                if (err) {
                  return reject(err)
                }

                Assert.ok(user, 'user')
                target_user_id = SpecHelpers.fetchProp(user, 'id')

                return resolve()
              })
          }))


          let target_user

          beforeEach(() => new Promise((resolve, reject) => {
            // Do a fresh fetch from the db.
            //
            si.make('user')
              .load$(target_user_id, (err, user) => {
                if (err) {
                  return reject(err)
                }

                Assert.ok(user, 'user')
                target_user = user

                return resolve()
              })
          }))

          afterEach(clearDb)


          it('updates the existing entity', fin => {
            si.test(fin)

            target_user
              .data$({ first_name: 'ELVIS' })
              .save$(err => {
                if (err) {
                  return fin(err)
                }

                si.make('user').list$({}, (err, users) => {
                  if (err) {
                    return fin(err)
                  }

                  expect(users.length).to.equal(2)

                  expect(users[0]).to.contain({
                    first_name: 'Frank',
                    last_name: 'Sinatra'
                  })

                  expect(users[1]).to.contain({
                    id: target_user_id,
                    first_name: 'ELVIS',
                    last_name: 'Presley'
                  })

                  return fin()
                })
              })
          })

          function clearDb() {
            return new Promise((resolve, reject) => {
              si.make('user').remove$({ all$: true }, err => {
                if (err) {
                  return reject(err)
                }
                
                return resolve()
              })
            })
          }
        })
      })

      describe('extra upsert tests', () => {
        describe('plugin options include the "generate_id" function', () => {
          describe('matching entity exists', () => {
            const new_id = 'bbbba6f73a861890cc1f4e23'

            const si = makeSenecaForTest({
              mongo_store_opts: {
                generate_id(ent) {
                  if ('age' in ent) {
                    return new_id
                  }

                  return null
                }
              }
            })

            beforeEach(() => waitOnSeneca(si))

            beforeEach(clearDb)


            let target_user_id

            beforeEach(() => new Promise((resolve, reject) => {
              si.make('user')
                .data$({ first_name: 'Elvis', last_name: 'Presley' })
                .save$((err, user) => {
                  if (err) {
                    return reject(err)
                  }

                  Assert.ok(user, 'user')
                  target_user_id = SpecHelpers.fetchProp(user, 'id')

                  return resolve()
                })
            }))


            let target_user

            beforeEach(() => new Promise((resolve, reject) => {
              // Do a fresh fetch from the db.
              //
              si.make('user')
                .load$(target_user_id, (err, user) => {
                  if (err) {
                    return reject(err)
                  }

                  Assert.ok(user, 'user')
                  target_user = user

                  return resolve()
                })
            }))


            afterEach(clearDb)

            it('updates the fields and ignores the generate_id option', fin => {
              si.test(fin)

              si.make('user')
                .data$({ first_name: 'Elvis', last_name: 'PRESLEY', age: 25 })
                .save$({ upsert$: ['first_name'] }, err => {
                  if (err) {
                    return fin(err)
                  }

                  si.make('user').list$({}, (err, users) => {
                    if (err) {
                      return fin(err)
                    }

                    expect(users.length).to.equal(1)

                    expect(users[0]).to.contain({
                      first_name: 'Elvis',
                      last_name: 'PRESLEY',
                      age: 25
                    })

                    expect(users[0].id).not.to.equal(new_id)

                    return fin()
                  })
                })
            })
          })

          describe('matching entity does not exist', () => {
            const new_id = 'ffffa6f73a861890cc1f4e23'

            const si = makeSenecaForTest({
              mongo_store_opts: {
                generate_id(_ent) {
                  return new_id
                }
              }
            })

            beforeEach(() => waitOnSeneca(si))

            beforeEach(clearDb)

            afterEach(clearDb)

            it('creates a new entity with the given id', fin => {
              si.test(fin)

              si.make('user')
                .data$({ first_name: 'Frank', last_name: 'Sinatra' })
                .save$({ upsert$: ['first_name'] }, err => {
                  if (err) {
                    return fin(err)
                  }

                  si.make('user').list$({}, (err, users) => {
                    if (err) {
                      return fin(err)
                    }

                    expect(users.length).to.equal(1)

                    const user = users[0]

                    expect(user.id).to.equal(new_id)

                    return fin()
                  })
                })
            })
          })

          function clearDb() {
            return new Promise((resolve, reject) => {
              si.make('user').remove$({ all$: true }, err => {
                if (err) {
                  return reject(err)
                }
                
                return resolve()
              })
            })
          }
        })
      })
    })

    function waitOnSeneca(seneca) {
      return new Promise(fin => {
        return si.ready(fin)
      })
    }
  })
})

// describe('mongo tests', function () {

//   // TODO: not in shared any more, id this needed?
//   // it('close test', function (done) {
//   //   Shared.closetest(si, testcount, done)
//   // })
// })

function extratest(si, done) {
  Async.series(
    {
      native: function (cb) {
        var foo = si.make$('foo')
        foo.native$(function (err, db) {
          if (err) return cb(err)

          db.collection('foo', function (err, coll) {
            if (err) return cb(err)

            coll.find({}, {}, function (err, cursor) {
              if (err) return cb(err)

              cursor.each(function (err, entry) {
                if (err) return cb(err)
                if (!entry) {
                  cb()
                }
              })
            })
          })
        })
      },

      native_query: function (cb) {
        var nat = si.make$('nat')
        nat.remove$({ all$: true }, function (err) {
          if (err) return cb(err)

          nat.a = 1
          nat.save$(function (err, nat) {
            if (err) return cb(err)

            nat = nat.make$()
            nat.a = 2
            nat.save$(function (err, nat) {
              if (err) return cb(err)

              nat.list$(
                {
                  native$: [
                    {
                      /* $or:[{a:1},{a:2}]*/
                    },
                    { sort: [['a', -1]] },
                  ],
                },
                function (err, list) {
                  if (err) return cb(err)
                  Assert.equal(2, list.length)
                  Assert.equal(2, list[0].a)
                  Assert.equal(1, list[1].a)
                  cb()
                }
              )
            })
          })
        })
      },

      remove: function (cb) {
        var cl = si.make$('lmt')
        cl.remove$({ all$: true }, function (err, foo) {
          if (err) return cb(err)
          cb()
        })
      },

      insert1st: function (cb) {
        var cl = si.make$('lmt')
        cl.p1 = 'v1'
        cl.save$(function (err, foo) {
          if (err) return cb(err)
          cb()
        })
      },

      insert2nd: function (cb) {
        var cl = si.make$('lmt')
        cl.p1 = 'v2'
        cl.save$(function (err, foo) {
          if (err) return cb(err)
          cb()
        })
      },

      insert3rd: function (cb) {
        var cl = si.make$('lmt')
        cl.p1 = 'v3'
        cl.save$(function (err, foo) {
          if (err) return cb(err)
          cb()
        })
      },

      listall: function (cb) {
        var cl = si.make({ name$: 'lmt' })
        cl.list$({}, function (err, lst) {
          if (err) return cb(err)
          Assert.equal(3, lst.length)
          cb()
        })
      },

      listlimit1skip1: function (cb) {
        var cl = si.make({ name$: 'lmt' })
        cl.list$({ limit$: 1, skip$: 1 }, function (err, lst) {
          if (err) return cb(err)
          Assert.equal(1, lst.length)
          cb()
        })
      },

      listlimit2skip3: function (cb) {
        var cl = si.make({ name$: 'lmt' })
        cl.list$({ limit$: 2, skip$: 3 }, function (err, lst) {
          if (err) return cb(err)
          Assert.equal(0, lst.length)
          cb()
        })
      },

      listlimit5skip2: function (cb) {
        var cl = si.make({ name$: 'lmt' })
        cl.list$({ limit$: 5, skip$: 2 }, function (err, lst) {
          if (err) return cb(err)
          Assert.equal(1, lst.length)
          cb()
        })
      },

      insertUpdate: function (cb) {
        var cl = si.make$('lmt')
        cl.p1 = 'value1'
        cl.p2 = 2
        cl.save$(function (err, foo) {
          if (err) return cb(err)
          Assert.ok(foo.id)
          Assert.equal(foo.p1, 'value1')
          Assert.equal(foo.p2, 2)

          delete foo.p1
          foo.p2 = 2.2

          foo.save$(function (err, foo) {
            if (err) return cb(err)

            foo.load$({ id: foo.id }, function (err, foo) {
              if (err) return cb(err)
              Assert.ok(foo.id)
              Assert.equal(foo.p1, 'value1')
              Assert.equal(foo.p2, 2.2)
              cb()
            })
          })
        })
      },

      fieldor: function (cb) {
        si.make('zed').remove$({ all$: true })
        si.make('zed', { p1: 'a', p2: 10 }).save$()
        si.make('zed', { p1: 'b', p2: 20 }).save$()
        si.make('zed', { p1: 'c', p2: 30 }).save$()
        si.make('zed', { p1: 'a', p2: 40 }).save$()
        si.ready(function () {
          si.make('zed').list$(function (err, list) {
            expect(list.length).equal(4)

            si.make('zed').list$({ p1: 'a' }, function (err, list) {
              //console.log(list)
              expect(list.length).equal(2)

              // OR on list values ($in operator)
              si.make('zed').list$({ p1: ['a', 'b'] }, function (err, list) {
                //console.log(list)
                expect(list.length).equal(3)

                var ids = list.map((ent) => ent.id)
                si.make('zed').list$({ id: ids }, function (err, list) {
                  //console.log(list)
                  expect(list.length).equal(3)

                  cb()
                })
              })
            })
          })
        })
      },
    },
    function (err, out) {
      if (err) return done(err)
      done()
    }
  )
}

var si2 = Seneca()

describe('mongo regular connection test', function () {
  before({}, function (done) {
    if (si2.version >= '2.0.0') {
      si2.use('entity')
    }
    si2.use(require('..'), {
      name: 'senecatest',
      host: '127.0.0.1',
      port: 27017,
    })

    si2.ready(done)
  })

  it('simple test', function (done) {
    var foo = si2.make('foo')
    foo.p1 = 'v1'
    foo.p2 = 'v2'

    foo.save$(function (err, foo1) {
      expect(err).to.not.exist()
      expect(foo1.id).to.exist()

      foo1.load$(foo1.id, function (err, foo2) {
        expect(err).to.not.exist()
        expect(foo2).to.exist()
        expect(foo2.id).to.equal(foo1.id)
        expect(foo2.p1).to.equal('v1')
        expect(foo2.p2).to.equal('v2')

        done()
      })
    })
  })
})

function make_it(lab) {
  return function it(name, opts, func) {
    if ('function' === typeof opts) {
      func = opts
      opts = {}
    }

    lab.it(
      name,
      opts,
      Util.promisify(function (x, fin) {
        func(fin)
      })
    )
  }
}

function makeSenecaForTest(opts = {}) {
  const seneca = Seneca({ log: 'test' })

  if (seneca.version >= '2.0.0') {
    seneca.use('entity')
  }


  const { mongo_store_opts } = opts

  seneca.use(require('..'), {
    uri: 'mongodb://127.0.0.1:27017',
    db: 'senecatest',
    ...mongo_store_opts
  })


  return seneca
}

