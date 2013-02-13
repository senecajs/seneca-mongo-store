/* Copyright (c) 2013 Richard Rodger */
"use strict";


var assert = require('assert')

var seneca = require('seneca')()


describe('defer', function(){

  it('fails', function() {
    try {
      seneca.use(require('..'),{
        connect:true
      })
      assert.fail()
    }
    catch(e) {
      assert.ok(e)
    }
  })

  it('passes', function() {
    seneca.use(require('..'),{
      connect:false
    })
  })
})