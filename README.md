![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js][] data storage plugin

# seneca-mongo-store
[![npm version][npm-badge]][npm-url]
[![Build](https://github.com/senecajs/seneca-mongo-store/workflows/build/badge.svg)][https://github.com/senecajs/seneca-mongo-store/actions/workflows/build.yml]
[![Coveralls][BadgeCoveralls]][Coveralls]
[![Dependency Status][david-badge]][david-url]
[![Maintainability](https://api.codeclimate.com/v1/badges/5948324b4b0c8fbc6471/maintainability)](https://codeclimate.com/github/senecajs/seneca-mongo-store/maintainability)
[![DeepScan grade](https://deepscan.io/api/teams/5016/projects/11815/branches/175630/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=5016&pid=11815&bid=175630)
[![Gitter chat][gitter-badge]][gitter-url]

[![js-standard-style][standard-badge]][standard-style]

This module is a plugin for [Seneca.js][]. It provides a storage engine that uses
MongoDb to persist data.

If you're using this module, and need help, you can:

- Post a [github issue][],
- Tweet to [@senecajs][],
- Ask on the [Gitter][gitter-url].

If you are new to Seneca in general, please take a look at [senecajs.org][]. We have everything from
tutorials to sample apps to help get you up and running quickly.

### Seneca compatibility

Supports Seneca versions **3.x**

### Supported functionality
All Seneca data store supported functionality is implemented in [seneca-store-test](https://github.com/senecajs/seneca-store-test) as a test suite. The tests represent the store functionality specifications.

## Install
To install, simply use npm. Remember you will need to install [Seneca.js][]
separately.

```
npm install seneca
npm install seneca-mongo-store
```

## Quick Example

```js
var seneca = require('seneca')()
seneca
  .use("entity")
  .use('mongo-store', {
    uri: 'mongodb://120.0.0.1:27017/dbname'
  })

seneca.ready(function () {
  var apple = seneca.make$('fruit')
  apple.name  = 'Pink Lady'
  apple.price = 0.99
  apple.save$(function (err,apple) {
    console.log( "apple.id = "+apple.id  )
  })
})
```

## Connection Options

You can connect to MongoDB in a few different ways:

```js
// URI pattern which gets passed directly to the native MongoDB .connect() method
seneca.use('mongo-store', {
  uri: 'mongodb://120.0.0.1:27017/dbname',
  options: {}
})

// Key based connection gets transformed into a mongodb:// URI
seneca.use('mongo-store', {
  name: 'dbname',
  host: '127.0.0.1',
  port: 27017,
  options: {}
})
```

The `options` also gets passed into the MongoDB .connect() method. Refer to the [Connection Settings](http://mongodb.github.io/node-mongodb-native/2.0/reference/connecting/connection-settings/) documentation for a list of those options.

## Usage

You don't use this module directly. It provides an underlying data storage engine for the Seneca entity API:

```js
var entity = seneca.make$('typename')
entity.someproperty = "something"
entity.anotherproperty = 100

entity.save$(function (err, entity) { ... })
entity.load$({id: ...}, function (err, entity) { ... })
entity.list$({property: ...}, function (err, entity) { ... })
entity.remove$({id: ...}, function (err, entity) { ... })
```


### Query Support

The standard Seneca query format is supported:

- `.list$({f1:v1, f2:v2, ...})` implies pseudo-query `f1==v1 AND f2==v2, ...`.

- `.list$({f1:v1, ..., sort$:{field1:1}})` means sort by f1, ascending.

- `.list$({f1:v1, ..., sort$:{field1:-1}})` means sort by f1, descending.

- `.list$({f1:v1, ..., limit$:10})` means only return 10 results.

- `.list$({f1:v1, ..., skip$:5})` means skip the first 5.

- `.list$({f1:v1, ..., fields$:['fd1','f2']})` means only return the listed fields.

Note: you can use `sort$`, `limit$`, `skip$` and `fields$` together.

- `.list$({f1:v1, ..., sort$:{field1:-1}, limit$:10})` means sort by f1, descending and only return 10 results.

### Native Driver

As with all seneca stores, you can access the native driver, in this case, the `node-mongodb-native` `collection`
object using `entity.native$(function (err,collection) {...})`. Below we have included a demonstration on how to
write a SQL query using Mongo aggregate in Seneca:

```SQL
SELECT cust_id, count(*) FROM orders GROUP BY cust_id HAVING count(*) > 1
```

```js
var aggregateQuery = [
  {
    $group: { _id: "$cust_id", count: { $sum: 1 } }
  },
  {
    $match: { count: { $gt: 1 } }
  }
];

orders_ent.native$(function (err, db) {
	var collection = db.collection('orders');
	collection.aggregate(aggregateQuery, function (err, list) {
		if (err) return done(err);
		console.log("Found records:", list);
	});
});
````

You can also use: `entity.list$({f1:v1,...}, {native$:[{-mongo-query-}, {-mongo-options-}]})` which allows you to specify
a native mongo query per [node-mongodb-native][]

## Contributing
The [Senecajs org][] encourages open participation. If you feel you can help in any way, be it with
documentation, examples, extra testing, or new features please get in touch.

## To run tests with Docker
Build the Mongo Docker image:

```sh
npm run build

```

Start the Mongo container:
```sh
npm run start
```

Stop the Mongo container:
```sh
npm run stop
```

While the container is running you can run the tests into another terminal:
```sh
npm run test
```

#### Testing for Mac users
Before the tests can be run you must run `docker-machine env default` and copy the docker host address (example: '192.168.99.100').
This address must be inserted into the test/mongo.test.js file as the value for the host variable (uri). The tests can now be run.


## License
Copyright (c) 2012 - 2016, Richard Rodger and other contributors.
Licensed under [MIT][].

[MIT]: ./LICENSE.txt
[npm-badge]: https://img.shields.io/npm/v/seneca-mongo-store.svg
[npm-url]: https://npmjs.com/package/seneca-mongo-store
[travis-badge]: https://api.travis-ci.org/senecajs/seneca-mongo-store.svg
[travis-url]: https://travis-ci.org/senecajs/seneca-mongo-store
[Coveralls]: https://coveralls.io/github/senecajs/seneca-mongo-store?branch=master
[BadgeCoveralls]: https://coveralls.io/repos/github/senecajs/seneca-mongo-store/badge.svg?branch=master
[david-badge]: https://david-dm.org/senecajs/seneca-mongo-store.svg
[david-url]: https://david-dm.org/senecajs/seneca-mongo-store
[gitter-badge]: https://badges.gitter.im/senecajs/seneca.svg
[gitter-url]: https://gitter.im/senecajs/seneca
[standard-badge]: https://raw.githubusercontent.com/feross/standard/master/badge.png
[standard-style]: https://github.com/feross/standard
[Senecajs org]: https://github.com/senecajs/
[Seneca.js]: https://www.npmjs.com/package/seneca
[senecajs.org]: http://senecajs.org/
[node-mongodb-native]: http://mongodb.github.io/node-mongodb-native/markdown-docs/queries.html
[github issue]: https://github.com/senecajs/seneca-mongo-store/issues
[@senecajs]: http://twitter.com/senecajs
