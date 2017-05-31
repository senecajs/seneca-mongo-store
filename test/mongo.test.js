'use strict'

var Seneca = require('seneca')
var Async = require('async')
var Q = require('q')
var _ = require('lodash')

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
  default_plugins: {
    'mem-store': false
  }
})

si.__testcount = 0
var testcount = 0


describe('mongo tests', function () {
  before({}, function (done) {
    if (si.version >= '2.0.0') {
      si.use('entity')
    }

    si.use(require('..'), {
      uri: 'mongodb://127.0.0.1/senecatest'
    })
    si.ready(done)
  })

  it('basic test', function (done) {
    testcount++
    si.test(done)
    Shared.basictest(si, done)
  })

  it('extra test', function (done) {
    testcount++
    si.test(done)
    extratest(si, done)
  })

  it('close test', function (done) {
    si.test(done)
    Shared.closetest(si, testcount, done)
  })
})


function extratest (si, done) {
  console.log('EXTRA')

  Async.series(
    {
      native: function (cb) {
        var foo = si.make$('foo')
        foo.native$(function (err, db) {
          Assert.ok(null == err)

          db.collection('foo', function (err, coll) {
            Assert.ok(null == err)

            coll.find({}, {}, function (err, cursor) {
              Assert.ok(null == err)

              cursor.each(function (entry) {
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
          Assert.ok(null == err)

          nat.a = 1
          nat.save$(function (err, nat) {
            Assert.ok(null == err)

            nat = nat.make$()
            nat.a = 2
            nat.save$(function (err, nat) {
              Assert.ok(null == err)

              nat.list$({native$: [{/* $or:[{a:1},{a:2}]*/}, {sort: [['a', -1]]}]}, function (err, list) {
                Assert.ok(null == err)
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
          Assert.ok(null == err)
          cb()
        })
      },

      insert1st: function (cb) {
        var cl = si.make$('lmt')
        cl.p1 = 'v1'
        cl.save$(function (err, foo) {
          Assert.ok(null == err)
          cb()
        })
      },

      insert2nd: function (cb) {
        var cl = si.make$('lmt')
        cl.p1 = 'v2'
        cl.save$(function (err, foo) {
          Assert.ok(null == err)
          cb()
        })
      },

      insert3rd: function (cb) {
        var cl = si.make$('lmt')
        cl.p1 = 'v3'
        cl.save$(function (err, foo) {
          Assert.ok(null == err)
          cb()
        })
      },

      listall: function (cb) {
        var cl = si.make({name$: 'lmt'})
        cl.list$({}, function (err, lst) {
          Assert.ok(null == err)
          Assert.equal(3, lst.length)
          cb()
        })
      },

      listlimit1skip1: function (cb) {
        var cl = si.make({name$: 'lmt'})
        cl.list$({limit$: 1, skip$: 1}, function (err, lst) {
          Assert.ok(null == err)
          Assert.equal(1, lst.length)
          cb()
        })
      },

      listlimit2skip3: function (cb) {
        var cl = si.make({name$: 'lmt'})
        cl.list$({limit$: 2, skip$: 3}, function (err, lst) {
          Assert.ok(null == err)
          Assert.equal(0, lst.length)
          cb()
        })
      },

      listlimit5skip2: function (cb) {
        var cl = si.make({name$: 'lmt'})
        cl.list$({limit$: 5, skip$: 2}, function (err, lst) {
          Assert.ok(null == err)
          Assert.equal(1, lst.length)
          cb()
        })
      },

      insertUpdate: function (cb) {
        var cl = si.make$('lmt')
        cl.p1 = 'value1'
        cl.p2 = 2
        cl.p3 = 'unsetMe'
        cl.save$(function (err, foo) {
          Assert.ok(null == err)
          Assert.ok(foo.id)
          Assert.equal(foo.p1, 'value1')
          Assert.equal(foo.p2, 2)
          Assert.equal(foo.p3, 'unsetMe')

          delete foo.p1
          foo.p2 = 2.2
          foo.$unset = {p3: ''}

          foo.save$(function (err, foo) {
            Assert.ok(null == err)

            foo.load$({id: foo.id}, function (err, foo) {
              if (err) done(err)

              Assert.ok(foo.id)
              Assert.equal(foo.p1, 'value1')
              Assert.equal(foo.p2, 2.2)
              Assert.equal(foo.hasOwnProperty('p3'), false, 'should have remove unset property')

              cb()
            })
          })
        })
      },

      insertUpdateUnsetOnly: function (cb) {
        var cl = si.make$('lmt')
        cl.u1 = 'value1'
        cl.u2 = 2
        cl.save$(function (err, foo) {
          Assert.ok(null == err)
          Assert.ok(foo.id)
          Assert.equal(foo.u1, 'value1')
          Assert.equal(foo.u2, 2)

          cl = si.make$('lmt')
          cl.id = foo.id
          cl.$unset = {u1: ''}

          cl.save$(function (err, foo) {
            Assert.ok(null == err)

            foo.load$({id: foo.id}, function (err, foo) {
              if (err) done(err)

              Assert.ok(foo.id)
              Assert.equal(foo.hasOwnProperty('u1'), false)
              Assert.equal(foo.u2, 2)
              cb()
            })
          })
        })
      },

      updateMulti: function (cb) {
        var e = si.make$('lmt')
        var el1 = Q.nbind(e.save$, e)({multi: 'updateMulti', m: 1, p: 'a'})

        e = si.make$('lmt')
        var el2 = Q.nbind(e.save$, e)({multi: 'updateMulti', m: 2, p: 'b'})

        e = si.make$('lmt')
        var el3 = Q.nbind(e.save$, e)({multi: 'updateMulti', m: 3, p: 'a'})

        function updateMulti () {
          e = si.make$('lmt')
          e.$multi = {p: 'a'}
          e.u = 'updated'
          return Q.nbind(e.save$, e)()
        }

        function list () {
          e = si.make$('lmt')
          return Q.nbind(e.list$, e)({multi: 'updateMulti'})
        }

        function assertList (list) {
          list = list.map(function (el) {
            return _.pick(el, ['m', 'u'])
          })
          Assert.deepEqual(_.find(list, {m: 1}), {m: 1, u: 'updated'})
          Assert.deepEqual(_.find(list, {m: 2}), {m: 2})
          Assert.deepEqual(_.find(list, {m: 3}), {m: 3, u: 'updated'})
        }

        Q.all([el1, el2, el3])
          .spread(updateMulti)
          .then(list)
          .then(assertList)
          .fin(cb)
          .done()
      },

      updateMultiWithId$in: function (cb) {
        var e = si.make$('lmt')
        var el1 = Q.nbind(e.save$, e)({multi: 'updateMultiWithId$in', m: 1, p: 'a'})

        e = si.make$('lmt')
        var el2 = Q.nbind(e.save$, e)({multi: 'updateMultiWithId$in', m: 2, p: 'b'})

        e = si.make$('lmt')
        var el3 = Q.nbind(e.save$, e)({multi: 'updateMultiWithId$in', m: 3, p: 'a'})

        function updateMulti (el1, el2, el3) {
          e = si.make$('lmt')
          e.$multi = {id: {$in: [el2.id, el3.id]}}
          e.u = 'updated'
          return Q.nbind(e.save$, e)()
        }

        function list () {
          e = si.make$('lmt')
          return Q.nbind(e.list$, e)({multi: 'updateMultiWithId$in'})
        }

        function assertList (list) {
          list = list.map(function (el) {
            return _.pick(el, ['m', 'u'])
          })
          Assert.deepEqual(_.find(list, {m: 1}), {m: 1})
          Assert.deepEqual(_.find(list, {m: 2}), {m: 2, u: 'updated'})
          Assert.deepEqual(_.find(list, {m: 3}), {m: 3, u: 'updated'})
        }

        Q.all([el1, el2, el3])
          .spread(updateMulti)
          .then(list)
          .then(assertList)
          .fin(cb)
          .done()
      }
    },
    function (err, out) {
      if (err) done(err)
      si.__testcount++
      done()
    }
  )

  si.__testcount++
}

var siNative = Seneca({
  default_plugins: {
    'mem-store': false
  }
})

describe('mongo native tests', function () {
  before({}, function (done) {
    if (siNative.version >= '2.0.0') {
      siNative.use('entity')
    }
    siNative.use(require('..'), {
      uri: 'mongodb://127.0.0.1/senecatest',
      options: {
        native_parser: true
      }
    })

    siNative.ready(done)
  })

  it('basic native', function (done) {
    Shared.basictest(siNative, done)
  })
})


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
