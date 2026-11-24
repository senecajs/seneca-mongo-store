![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js][] data storage plugin.

# @seneca/mongo-store

A MongoDB store for the Seneca entity API: `save$`, `load$`, `list$` and
`remove$` read and write MongoDB collections. Version 6 works with
Seneca 4 and `@seneca/entity` 29, on Node.js 24 or later. Published on npm
as `@seneca/mongo-store` (releases up to 5.0.1 were published unscoped as
`seneca-mongo-store`; Seneca 3 users stay on `seneca-mongo-store@5`).

[![npm version][npm-badge]][npm-url]
[![Build](https://github.com/senecajs/seneca-mongo-store/actions/workflows/build.yml/badge.svg)](https://github.com/senecajs/seneca-mongo-store/actions/workflows/build.yml)
[![Maintainability](https://api.codeclimate.com/v1/badges/5948324b4b0c8fbc6471/maintainability)](https://codeclimate.com/github/senecajs/seneca-mongo-store/maintainability)

| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
|---|---|

## Install

```sh
npm install seneca@^4 @seneca/entity @seneca/mongo-store
```

You need a MongoDB server; `npm run services:up` in this repository starts
one with Docker.

## Quick Example

```js
const Seneca = require('seneca')

const seneca = Seneca()
  .use('@seneca/entity')
  .use('@seneca/mongo-store', { uri: 'mongodb://127.0.0.1:27017', db: 'mydb' })

seneca.ready(async function () {
  const apple = await seneca
    .entity('fruit')
    .data$({ name: 'Pink Lady', price: 0.99 })
    .save$()
  console.log('apple.id = ' + apple.id)
  seneca.close()
})
```

## More Examples

* [Getting started](docs/tutorials/getting-started.md) (runnable:
  [docs/examples/getting-started.js](docs/examples/getting-started.js))
* [Configure the connection](docs/how-to/configure-the-connection.md)
* [Query with MongoDB features](docs/how-to/query-with-mongodb-features.md)
* [Run the tests locally](docs/how-to/run-the-tests-locally.md)
* [Migrate from Seneca 3](docs/how-to/migrate-from-seneca-3.md)

## Motivation

Seneca entities give business logic one data API; the store decides where
the data lives. This plugin lets that data live in MongoDB, while still
allowing MongoDB queries when you need them. See
[How the store works](docs/explanation/how-the-store-works.md).

## Support

* Questions and bugs: [GitHub issues][github issue]
* Seneca documentation: [senecajs.org](http://senecajs.org)
* Sponsored by [Voxgig](https://www.voxgig.com)

## API

| Topic | Reference |
| ----- | --------- |
| Options (`uri`, `host`, `port`, `db`, `merge`, `generate_id`, ...) | [Options](docs/reference/options.md) |
| Entity commands and query directives (`sort$`, `limit$`, `native$`, ...) | [Messages](docs/reference/messages.md) |
| Exports (`mongo`) and `intern` | [API](docs/reference/api.md) |

The full feature index is in [docs/README.md](docs/README.md).

## Contributing

The [Senecajs org][] encourages open participation. To run the tests (Node.js
24 or later, devDependency `seneca@^4.0.0`):

```sh
npm install
npm run services:up   # MongoDB 9.0 on 127.0.0.1:27117
npm test
npm run services:down
```

Set `SENECA_TEST_MONGO_HOST` / `SENECA_TEST_MONGO_PORT` to use another
server. Details: [Run the tests locally](docs/how-to/run-the-tests-locally.md).
The CI workflow is delivered as a patch in [.patches](.patches/README.md)
(`git am .patches/*.patch`).

## Background

This plugin uses the [MongoDB Node.js driver][node-mongodb-native]
(`mongodb` 3.7) and has been part of Seneca since 2010.

| Plugin | Seneca | Entity plugin | Node | MongoDB tested |
| ------ | ------ | ------------- | ---- | -------------- |
| 6.0 | 4 | `@seneca/entity` 29 | 24 or later | 7.0 |
| 5.0 | 3 | `seneca-entity` 18 | 10 to 14 | 3.6 |

License: MIT, see [LICENSE](LICENSE).

[Seneca.js]: https://www.npmjs.com/package/seneca
[Senecajs org]: https://github.com/senecajs/
[node-mongodb-native]: https://github.com/mongodb/node-mongodb-native
[github issue]: https://github.com/senecajs/seneca-mongo-store/issues
[npm-badge]: https://img.shields.io/npm/v/@seneca/mongo-store.svg
[npm-url]: https://npmjs.com/package/@seneca/mongo-store
