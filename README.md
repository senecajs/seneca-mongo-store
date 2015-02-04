# seneca-mongo-store

### Seneca node.js data-storage plugin for MongoDB.

This module is a plugin for the Seneca framework. It provides a
storage engine that uses MongoDB to persist data. This module is for production use.
It also provides an example of a document-oriented storage plugin code-base.

The Seneca framework provides an 
[ActiveRecord-style data storage API](http://senecajs.org/data-entities.html). 
Each supported database has a plugin, such as this one, that
provides the underlying Seneca plugin actions required for data
persistence.


### Support

If you're using this module, feel free to contact me on twitter if you
have any questions! :) [@rjrodger](http://twitter.com/rjrodger)

Current Version: 0.2.0

Tested on: Node 0.10.36, Seneca 0.6.1



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
npm install seneca-mongo-store
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


### Queries

The standard Seneca query format is supported:

   * `entity.list$({field1:value1, field2:value2, ...})` implies pseudo-query `field1==value1 AND field2==value2, ...`
   * you can only do AND queries. That's all folks. Ya'll can go home now. The Fat Lady has sung.
   * `entity.list$({f1:v1,...},{sort$:{field1:1}})` means sort by field1, ascending
   * `entity.list$({f1:v1,...},{sort$:{field1:-1}})` means sort by field1, descending
   * `entity.list$({f1:v1,...},{limit$:10})` means only return 10 results
   * `entity.list$({f1:v1,...},{skip$:5})` means skip the first 5
   * `entity.list$({f1:v1,...},{fields$:['field1','field2']})` means only return the listed fields (avoids pulling lots of data out of the database)
   * you can use sort$, limit$, skip$ and fields$ together
   * `entity.list$({f1:v1,...},{native$:[{-mongo-query-},{-mongo-options-}]})` allows you to specify a native mongo query, as per [node-mongodb-native](http://mongodb.github.com/node-mongodb-native/markdown-docs/queries.html) 


### Native Driver

As with all seneca stores, you can access the native driver, in this case, 
the `node-mongodb-native` `collection` object using `entity.native$(function(err,collection){...})`.

How to write this SQL query using Mongo aggregate in Seneca:

```SQL
// SELECT cust_id, count(*) FROM orders GROUP BY cust_id HAVING count(*) > 1
```

```JavaScript
var aggregateQuery = [{ $group: { _id: "$cust_id", count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } } ];

orders_ent.native$(function(err, db){
	var collection = db.collection('orders');
	collection.aggregate(aggregateQuery, function(err, list){
		if(err) return done(err);
		console.log("Found records:", list);
		// ...
						
	}); // end aggregate 
}); // end native$
````

## Test

```bash
cd test
mocha mongo.test.js --seneca.log.print
```


