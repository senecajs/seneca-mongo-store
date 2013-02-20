/* Copyright (c) 2010-2013 Richard Rodger */
"use strict";


var assert = require('assert')


var seneca = require('seneca')
var shared = seneca.test.store.shared


var si = seneca()
si.use(require('..'),{
  name:'senecatest',
  host:'127.0.0.1',
  port:27017,
  options:{
    // uncomment to test
    // native_parser:true
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

        cursor.each(function(entry){if(!entry){done()}})
      })
    })
  })

  si.__testcount++
}
