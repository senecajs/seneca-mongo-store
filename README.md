# seneca-mongo-store

### Node.js seneca data storage module for MongoDB.

This module is a plugin for the Seneca framework. It provides a
storage engine that uses MongoDB to persist data. This module is for production use.
it also provides an example of a document-oriented storage plugin code base.


### Support

If you're using this module, feel free to contact me on twitter if you
have any questions! :) [@rjrodger](http://twitter.com/rjrodger)

Current Version: 0.1.3

Tested on: node 0.8.16, seneca 0.5.2



### Quick example

```JavaScript
var seneca = require('seneca')()
seneca.use('mongo-store',{
  name:'dbname',
  host:'127.0.0.1',
  port:27017
})

seneca.ready(function(){
  var apple = seneca.make$('fruit')
  apple.name  = 'Pink Lady'
  apple.price = 0.99
  apple.save$(function(err,apple){
    console.log( "apple.id = "+apple.id  )
  })
})
```


## Install

```sh
npm install seneca
npm install seneca-mongodb-store
```


## Usage

You don't use this module directly. It provides an underlying data storage engine for the Seneca entity API:

```JavaScript
var entity = seneca.make$('typename')
entity.someproperty = "something"
entity.anotherproperty = 100

entity.save$( function(err,entity){ ... } )
entity.load$( {id: ...}, function(err,entity){ ... } )
entity.list$( {property: ...}, function(err,entity){ ... } )
entity.remove$( {id: ...}, function(err,entity){ ... } )
```


## Test

```bash
cd test
mocha mongo.test.js --seneca.log.print
```




