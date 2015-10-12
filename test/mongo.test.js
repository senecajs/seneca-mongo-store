"use strict";

var seneca = require('seneca')
var shared = require('seneca-store-test')
var async = require('async')
var Lab = require('lab')
var lab = exports.lab = Lab.script()

// make lab look like BDD
var describe = lab.describe;
var it = lab.it;

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

  async.series(
    {
      native: function(cb){
        var foo = si.make$('foo')
        foo.native$(function(err,db){
          assert.ok(null==err)

          db.collection('foo',function(err,coll){
            assert.ok(null==err)

            coll.find({},{},function(err,cursor){
              assert.ok(null==err)

              cursor.each(function (entry) {
                if (!entry) {
                  cb()
                }
              })
            })
          })
        })
      },

      native_query: function(cb){
        var nat = si.make$('nat')
        nat.remove$({all$:true}, function(err){
          assert.ok(null==err)

          nat.a=1
          nat.save$(function(err,nat){
            assert.ok(null==err)

            nat = nat.make$()
            nat.a=2
            nat.save$(function(err,nat){
              assert.ok(null==err)

              nat.list$({native$:[{/*$or:[{a:1},{a:2}]*/},{sort:[['a',-1]]}]},function(err,list){
                assert.ok(null==err)
                //console.log(list)
                assert.equal(2,list.length)
                assert.equal(2,list[0].a)
                assert.equal(1,list[1].a)
                cb()
              })
            })
          })
        })
      },
    },
    function (err, out) {
      si.__testcount++
      done()
    }
  )

  si.__testcount++
}
