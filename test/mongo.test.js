/* Copyright (c) 2010-2013 Richard Rodger */
"use strict";


var assert = require('assert')


var seneca = require('seneca')
var shared = seneca.test.store.shared
var async = require('async')


var si = seneca()
si.use(require('..'),{
  name:'senecatest',
  host:'127.0.0.1',
  port:27017,
  options:{
    // uncomment to test
    // native_parser:true
    w: 1
  }
})

si.__testcount = 0
var testcount = 0


describe('mongo', function(){
  it('basic', function(done){
    testcount++
    shared.basictest(si,done)
  })

  it('extra', function(done){
    testcount++
    extratest(si,done)
  })

  it('limit/skip', function (done) {
    testcount++
    testlimitskip(si, done)
  })

  it('close', function(done){
    shared.closetest(si,testcount,done)
  })
})



function extratest(si,done) {
  console.log('EXTRA')

  var foo = si.make$('foo')
  foo.native$(function(err,db){
    assert.ok(null==err)

    db.collection('foo',function(err,coll){
      assert.ok(null==err)

      coll.find({},{},function(err,cursor){
        assert.ok(null==err)

        cursor.each(function (entry) {
          if (!entry) {
            done()
          }
        })
      })
    })
  })

  si.__testcount++
}

function testlimitskip(si, done) {
  console.log('Test Limit/Skip')

  async.series(
    {
      remove: function (cb) {
        var cl = si.make$('lmt')
        // clear 'lmt' collection
        cl.remove$({all$: true}, function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      insert1st: function (cb) {
        var cl = si.make$('lmt')
        cl.p1 = 'v1'
        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      insert2nd: function (cb) {
        var cl = si.make$('lmt')
        cl.p1 = 'v2'
        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      insert3rd: function (cb) {
        var cl = si.make$('lmt')
        cl.p1 = 'v3'
        cl.save$(function (err, foo) {
          assert.ok(null == err)
          cb()
        })
      },

      listall: function (cb) {
        var cl = si.make({name$: 'lmt'})
        cl.list$({}, function (err, lst) {
          assert.ok(null == err)
          assert.equal(3, lst.length)
          cb()
        })
      },

      listlimit1skip1: function (cb) {
        var cl = si.make({name$: 'lmt'})
        cl.list$({limit$: 1, skip$: 1}, function (err, lst) {
          assert.ok(null == err)
          assert.equal(1, lst.length)
          cb()
        })
      },

      listlimit2skip3: function (cb) {
        var cl = si.make({name$: 'lmt'})
        cl.list$({limit$: 2, skip$: 3}, function (err, lst) {
          assert.ok(null == err)
          assert.equal(0, lst.length)
          cb()
        })
      },

      listlimit5skip2: function (cb) {
        var cl = si.make({name$: 'lmt'})
        cl.list$({limit$: 5, skip$: 2}, function (err, lst) {
          assert.ok(null == err)
          assert.equal(1, lst.length)
          cb()
        })
      }

    },
    function (err, out) {
      si.__testcount++
      done()
    }
  )
}
