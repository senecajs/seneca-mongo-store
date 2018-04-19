'use strict'

var Seneca = require('seneca')
var Async = require('async')

var Lab = require('lab')
var Assert = require('assert')
var Code = require('code')
var expect = Code.expect

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var before = lab.before

var Shared = require('seneca-store-test')

var si = Seneca({
  log: 'debug'
})

var senecaMerge = Seneca({
  log: 'debug'
})

before({}, function (done) {
  if (si.version >= '2.0.0') {
    si.use('entity')
    senecaMerge.use('entity')
  }
  senecaMerge.use(require('..'), {
    uri: 'mongodb://127.0.0.1:27017',
    db: 'senecatest',
    merge: false
  })
  si.use(require('..'), {
    uri: 'mongodb://127.0.0.1:27017',
    db: 'senecatest'
  })
  si.ready(done)
})

describe('shared tests', function () {
  Shared.basictest({
    seneca: si,
    senecaMerge: senecaMerge,
    script: lab
  })

  Shared.limitstest({
    seneca: si,
    script: lab
  })

  Shared.sorttest({
    seneca: si,
    script: lab
  })
})

describe('mongo tests', function () {
  it('extra test', function (done) {
    extratest(si, done)
  })
  // TODO: not in shared any more, id this needed?
  // it('close test', function (done) {
  //   Shared.closetest(si, testcount, done)
  // })
})


function extratest (si, done) {
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
        nat.remove$({all$: true}, function (err) {
          if (err) return cb(err)

          nat.a = 1
          nat.save$(function (err, nat) {
            if (err) return cb(err)

            nat = nat.make$()
            nat.a = 2
            nat.save$(function (err, nat) {
              if (err) return cb(err)

              nat.list$({native$: [{/* $or:[{a:1},{a:2}]*/}, {sort: [['a', -1]]}]}, function (err, list) {
                if (err) return cb(err)
                Assert.equal(2, list.length)
                Assert.equal(2, list[0].a)
                Assert.equal(1, list[1].a)
                cb()
              })
            })
          })
        })
      },

      remove: function (cb) {
        var cl = si.make$('lmt')
        cl.remove$({all$: true}, function (err, foo) {
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
        var cl = si.make({name$: 'lmt'})
        cl.list$({}, function (err, lst) {
          if (err) return cb(err)
          Assert.equal(3, lst.length)
          cb()
        })
      },

      listlimit1skip1: function (cb) {
        var cl = si.make({name$: 'lmt'})
        cl.list$({limit$: 1, skip$: 1}, function (err, lst) {
          if (err) return cb(err)
          Assert.equal(1, lst.length)
          cb()
        })
      },

      listlimit2skip3: function (cb) {
        var cl = si.make({name$: 'lmt'})
        cl.list$({limit$: 2, skip$: 3}, function (err, lst) {
          if (err) return cb(err)
          Assert.equal(0, lst.length)
          cb()
        })
      },

      listlimit5skip2: function (cb) {
        var cl = si.make({name$: 'lmt'})
        cl.list$({limit$: 5, skip$: 2}, function (err, lst) {
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

            foo.load$({id: foo.id}, function (err, foo) {
              if (err) return cb(err)
              Assert.ok(foo.id)
              Assert.equal(foo.p1, 'value1')
              Assert.equal(foo.p2, 2.2)
              cb()
            })
          })
        })
      }
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
      port: 27017
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
