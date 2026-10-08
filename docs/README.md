# seneca-mongo-store documentation

The documentation follows the [Diátaxis](https://diataxis.fr/) structure.
Start with the tutorial, use the how-to guides for tasks, look things up in
the reference, and read the explanation to understand the design.

## Tutorials

| Tutorial | What you build |
| -------- | -------------- |
| [Getting started](tutorials/getting-started.md) | A program that saves, loads, lists and removes entities in MongoDB. |

The programs are in [examples](examples/).

## How-to guides

| Guide | Covers |
| ----- | ------ |
| [Configure the connection](how-to/configure-the-connection.md) | URI or host/port settings, credentials, deferred connection, several stores. |
| [Query with MongoDB features](how-to/query-with-mongodb-features.md) | Sort, paging, fields, `$in`, MongoDB operators, `native$`, the native driver. |
| [Run the tests locally](how-to/run-the-tests-locally.md) | Docker Compose, environment variables, Seneca 4 builds, Node versions. |
| [Migrate from Seneca 3](how-to/migrate-from-seneca-3.md) | What changes when the store runs on Seneca 4. |

## Reference

| Page | Contents |
| ---- | -------- |
| [Options](reference/options.md) | Every plugin option with type, default and effect. |
| [Messages](reference/messages.md) | Entity action patterns, query directives, replies and errors. |
| [API](reference/api.md) | Exports and the `intern` helpers. |

## Explanation

| Page | Topic |
| ---- | ----- |
| [How the store works](explanation/how-the-store-works.md) | Lifecycle, id mapping, updates and upserts, Seneca 3 versus 4. |

## Feature index

| Feature | Kind | Documented in |
| ------- | ---- | ------------- |
| `uri` | option | [Options](reference/options.md#uri) |
| `host`, `server` | option | [Options](reference/options.md#host-server) |
| `port` | option | [Options](reference/options.md#port) |
| `username`, `password` | option | [Options](reference/options.md#username-password) |
| `db`, `name` | option | [Options](reference/options.md#db-name) |
| `connect` | option | [Options](reference/options.md#connect) |
| `merge` | option | [Options](reference/options.md#merge) |
| `generate_id` | option | [Options](reference/options.md) |
| `mongo_operator_shortcut` | option | [Options](reference/options.md) |
| `map` | option (seneca-entity store option) | [Options](reference/options.md#map) |
| `sys:entity,cmd:save` | action | [Messages](reference/messages.md#save) |
| `sys:entity,cmd:load` | action | [Messages](reference/messages.md#load) |
| `sys:entity,cmd:list` | action | [Messages](reference/messages.md#list) |
| `sys:entity,cmd:remove` | action | [Messages](reference/messages.md#remove) |
| `sys:entity,cmd:native` | action | [Messages](reference/messages.md#native) |
| `sys:entity,cmd:close` / close hook | action | [Messages](reference/messages.md#close) |
| `init:mongo-store` | action | [Messages](reference/messages.md#init) |
| `sort$`, `limit$`, `skip$`, `fields$` | query directive | [Messages](reference/messages.md#query-directives) |
| `native$` | query directive | [Messages](reference/messages.md#query-directives) |
| `all$`, `load$` | remove directive | [Messages](reference/messages.md#remove) |
| `upsert$`, `id$`, `merge$` | save directive | [Messages](reference/messages.md#save) |
| `mongo` | export | [API](reference/api.md#exports) |
| `intern` | static property | [API](reference/api.md#intern) |
| Error codes | none defined by the plugin | [Messages](reference/messages.md#errors) |
