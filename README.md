![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js][] data storage plugin.

# @seneca/mongo-store
[![npm version][npm-badge]][npm-url]
[![Build](https://github.com/senecajs/seneca-mongo-store/actions/workflows/build.yml/badge.svg)](https://github.com/senecajs/seneca-mongo-store/actions/workflows/build.yml)
[![Coveralls][BadgeCoveralls]][Coveralls]
[![Maintainability](https://api.codeclimate.com/v1/badges/5948324b4b0c8fbc6471/maintainability)](https://codeclimate.com/github/senecajs/seneca-mongo-store/maintainability)
[![DeepScan grade](https://deepscan.io/api/teams/5016/projects/11815/branches/175630/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=5016&pid=11815&bid=175630)

| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
|---|---|

## Install

To install, simply use npm. Remember you will need to install [Seneca.js][] separately.

```sh
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

## More Examples

See [test/](test/) for usage examples.

## Motivation

This module is a plugin for [Seneca.js][]. It provides a storage engine that uses MongoDB to persist data.

## Support

If you're using this module and need help, you can:

- Post a [github issue][]
- Tweet to [@senecajs][]
- Ask on the [Gitter][gitter-url]

## API

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

### Connection Options

```js
// URI pattern
seneca.use('mongo-store', {
  uri: 'mongodb://120.0.0.1:27017/dbname',
  options: {}
})

// Key based connection
seneca.use('mongo-store', {
  name: 'dbname',
  host: '127.0.0.1',
  port: 27017,
  options: {}
})
```

### Query Support

- `.list$({f1:v1, f2:v2, ...})` implies pseudo-query `f1==v1 AND f2==v2, ...`.
- `.list$({f1:v1, ..., sort$:{field1:1}})` means sort by f1, ascending.
- `.list$({f1:v1, ..., sort$:{field1:-1}})` means sort by f1, descending.
- `.list$({f1:v1, ..., limit$:10})` means only return 10 results.
- `.list$({f1:v1, ..., skip$:5})` means skip the first 5.
- `.list$({f1:v1, ..., fields$:['fd1','f2']})` means only return the listed fields.

### Native Driver

Access the native driver using `entity.native$(function (err,collection) {...})`.

## Contributing

The [Senecajs org][] encourages open participation. If you feel you can help in any way, be it with documentation, examples, extra testing, or new features please get in touch.

### Running tests with Docker

Build the Mongo Docker image:

```sh
npm run build
```

Start the Mongo container:

```sh
npm run start
```

Run the tests:

```sh
npm run test
```

Stop the Mongo container:

```sh
npm run stop
```

## Background

This plugin uses the [node-mongodb-native][] driver.

[Seneca.js]: https://www.npmjs.com/package/seneca
[Senecajs org]: https://github.com/senecajs/
[node-mongodb-native]: http://mongodb.github.io/node-mongodb-native/markdown-docs/queries.html
[github issue]: https://github.com/senecajs/seneca-mongo-store/issues
[@senecajs]: http://twitter.com/senecajs
[gitter-url]: https://gitter.im/senecajs/seneca
[npm-badge]: https://img.shields.io/npm/v/seneca-mongo-store.svg
[npm-url]: https://npmjs.com/package/seneca-mongo-store
[Coveralls]: https://coveralls.io/github/senecajs/seneca-mongo-store?branch=master
[BadgeCoveralls]: https://coveralls.io/repos/github/senecajs/seneca-mongo-store/badge.svg?branch=master