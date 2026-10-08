# Getting started

In this tutorial you store fruit in MongoDB through the Seneca entity API.

## 1. Start MongoDB

The repository has a `docker-compose.yml` that starts MongoDB 9.0 on host
port 27117:

```sh
npm run services:up
```

Any MongoDB server works; change the URI below to point at yours.

## 2. Install

```sh
npm install seneca seneca-entity @seneca/mongo-store
```

## 3. Write the program

This is [examples/getting-started.js](../examples/getting-started.js). Inside
this repository it loads the plugin with `require('../..')`; in your own
project use `require('@seneca/mongo-store')` or `.use('mongo-store', ...)`.

```js
const Seneca = require('seneca')

const host = process.env.SENECA_TEST_MONGO_HOST || '127.0.0.1'
const port = process.env.SENECA_TEST_MONGO_PORT || '27117'

async function main() {
  const seneca = Seneca()
    .test()
    .use('entity')
    .use(require('../..'), {
      uri: 'mongodb://' + host + ':' + port,
      db: 'getting_started',
    })

  await new Promise((resolve) => seneca.ready(resolve))

  const apple = await seneca
    .entity('fruit')
    .data$({ name: 'Pink Lady', price: 0.99 })
    .save$()
  console.log('saved', apple.id.length, apple.name, apple.price)

  const loaded = await seneca.entity('fruit').load$(apple.id)
  console.log('loaded', loaded.name)

  const cheap = await seneca.entity('fruit').list$({ price: { $lt: 1 } })
  console.log('cheap fruit', cheap.length >= 1)

  await seneca.entity('fruit').remove$({ all$: true })
  const left = await seneca.entity('fruit').list$()
  console.log('left after remove', left.length)

  await new Promise((resolve) => seneca.close(resolve))
}

main()
```

## 4. Run it

```sh
node docs/examples/getting-started.js
```

Output with `seneca@4.0.0-rc5` (test mode log lines omitted):

```
saved 24 Pink Lady 0.99
loaded Pink Lady
cheap fruit true
left after remove 0
```

## What happens

* `use('entity')` adds the entity API. `seneca-mongo-store` registers itself
  as the store for every entity (`-/-/-`).
* The store connects to MongoDB in its init action, before `ready` fires.
* `save$` inserts a document into the `fruit` collection. The MongoDB
  `ObjectId` is returned as a 24 character hex string in `id`.
* `{ price: { $lt: 1 } }` passes a MongoDB operator straight to the query.
  The store logs a deprecation warning for this; see
  [Query with MongoDB features](../how-to/query-with-mongodb-features.md).
* `close` closes the MongoDB client, so the process exits.

## Next steps

* [Configure the connection](../how-to/configure-the-connection.md)
* [Options reference](../reference/options.md)
* [How the store works](../explanation/how-the-store-works.md)
