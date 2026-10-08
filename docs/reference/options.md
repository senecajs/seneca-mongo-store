# Options

The plugin has no `defaults` block: every option is optional and read
directly from the options object given to `use()`. Values below are the
behaviour when an option is absent. Source: `mongo-store.js` and
`lib/intern.js`.

| Option | Type | Default | Effect |
| ------ | ---- | ------- | ------ |
| `uri` | string | built from `host`/`port` | MongoDB connection string for `MongoClient.connect`. |
| `host`, `server` | string | none | Host used to build the URI when `uri` is absent. |
| `port` | number | `27017` | Port used to build the URI. |
| `username`, `password` | string | none | Credentials inserted into the built URI. |
| `db`, `name` | string | database in the URI | Database selected with `client.db()`. `db` wins. |
| `connect` | boolean | `true` | `false` skips connecting. |
| `merge` | boolean | `true` | `false` replaces whole documents on update. |
| `generate_id` | function | none | `generate_id(ent)` returns the id for new entities. |
| `mongo_operator_shortcut` | boolean | `true` | `false` drops top level `$` keys from queries. |
| `map` | object | `{ '-/-/-': '*' }` | seneca-entity store option: which canons this store serves. |

## uri

Passed unchanged to the driver, with `{ useUnifiedTopology: true }`. Use it
for credentials, replica sets and driver options as query parameters.

## host, server

When `uri` is absent the URI is `mongodb://` + credentials + `host` (or
`server`) + `:` + `port`.

## port

Defaults to `27017` when building the URI. Ignored when `uri` is set.

## username, password

Inserted as `username` + `:` + `password` + `@`. Values are not URL
encoded, and the `@` is only added when `password` is set, so a
`username` without a `password` produces an invalid host. Prefer a `uri`.

## db, name

The database name. When both are absent the driver uses the database in the
URI path, or `test`. The resolved value is written back to `options.db`.

## connect

`false` skips the connection. Entity operations then fail because there is
no database handle.

## merge

On update of an existing entity (`id` set), the default uses
`findOneAndUpdate` with `$set`, keeping fields not present in the entity.
`merge: false` uses `findOneAndReplace`. An entity can override it per call
with `merge$: false`. Both upsert with `upsert: true`.

## generate_id

Called for new entities without `id$`. The return value becomes `_id`; a 24
character hex string is converted to an `ObjectId`. Without it, MongoDB
creates an `ObjectId`.

## mongo_operator_shortcut

With the default, a top level query key starting with `$` (such as `$or`)
is passed to MongoDB and a deprecation warning is logged. With `false` such
keys are removed from the query.

## map

Handled by seneca-entity, not by this plugin. Use it with a plugin tag to
run several stores; see
[Configure the connection](../how-to/configure-the-connection.md#use-several-stores).
