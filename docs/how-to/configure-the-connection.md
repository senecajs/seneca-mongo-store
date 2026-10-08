# Configure the connection

Goal: point the store at your MongoDB server and database.

## Use a URI

```js
seneca.use('mongo-store', {
  uri: 'mongodb://127.0.0.1:27017',
  db: 'mydb',
})
```

`uri` is passed to `MongoClient.connect` unchanged. The database is chosen
by `db` (or `name`), not by a path in the URI: the store calls
`client.db(db)`, and when `db` and `name` are both missing the driver uses
the database named in the URI, or `test`.

## Use host and port

```js
seneca.use('mongo-store', {
  host: '127.0.0.1', // or server
  port: 27017, // default 27017
  name: 'mydb', // or db
})
```

The store builds `mongodb://<host>:<port>` from these options when `uri` is
not set.

## Add credentials

Put them in the URI, URL encoded:

```js
seneca.use('mongo-store', {
  uri: 'mongodb://user:p%40ss@db.example.com:27017/?authSource=admin',
  db: 'mydb',
})
```

`username` and `password` options also exist, but they are inserted into the
URI without encoding; see [Options](../reference/options.md#username-password).

## Defer the connection

`connect: false` skips the connection in the init action. Entity operations
then fail, because there is no database handle. It is only useful when the
plugin is loaded but never used, for example in a configuration check.

## Use several stores

Load the plugin more than once with different tags and a seneca-entity
`map`, so each store owns some entity canons:

```js
seneca
  .use('entity')
  .use('mongo-store$main', { uri: 'mongodb://127.0.0.1:27017', db: 'main' })
  .use('mongo-store$audit', {
    uri: 'mongodb://127.0.0.1:27017',
    db: 'audit',
    map: { '-/-/audit_log': '*' },
  })
```

## Pass driver options

Driver connection options (pool size, TLS, timeouts) can be given as URI
query parameters, for example `?maxPoolSize=20&tls=true`. The plugin itself
always passes `{ useUnifiedTopology: true }` and nothing else.
