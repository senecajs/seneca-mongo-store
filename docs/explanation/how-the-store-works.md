# How the store works

## Lifecycle

The plugin builds a store object with `save`, `load`, `list`, `remove`,
`close` and `native` functions and hands it to the seneca-entity store
`init` function. On Seneca 4 with seneca-entity 28 that function is the
`entity/init` export; older seneca-entity versions decorated `seneca.store`
instead, and the plugin uses that when present. seneca-entity registers one
action per command and canon, and adds the close hook.

The plugin then adds its `init:mongo-store` action, which Seneca runs while
loading the plugin. It connects with `MongoClient.connect`, so `ready` only
fires once MongoDB is reachable. A connection error is fatal.

`seneca.close()` runs the close hook, which closes the client. Until it is
closed, the driver keeps sockets open and the process does not exit.

## Ids

MongoDB uses `_id`; Seneca entities use `id`. Documents are read with
`_id` converted to a hex string in `id`. Ids of 24 hex characters are
converted back to `ObjectId` in queries, so both generated and custom string
ids work.

## Updates and upserts

Updates use `findOneAndUpdate` with `$set` by default, so an entity loaded
with fewer fields does not erase the others. MongoDB can insert two
documents when two upserts race; the store retries on a duplicate key error,
which only helps when the upsert fields have a unique index.

## Seneca 3 versus Seneca 4

The store code is the same for both. Differences are in the surrounding
packages: seneca-entity 28 exports the store init function, Seneca 4 closes
through `sys:seneca,cmd:close`, does not wrap errors, and reads plugin
options only from `use()` and `options.plugin`.

## Limits

The plugin uses the `mongodb` 3.7 driver, which logs deprecation warnings
(for example for `returnOriginal` and `fields`) but works with MongoDB 9.0.
`sort$` uses only its first field.
