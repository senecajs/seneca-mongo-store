# Messages

The store implements the seneca-entity store commands. Each is registered
for every canon in `map` (by default all), as `sys:entity,cmd:<cmd>`
(Seneca 3 also accepts `role:entity,cmd:<cmd>`). Applications normally use
the entity methods (`save$`, `load$`, `list$`, `remove$`, `native$`).

Entities of canon `zone/base/name` are stored in the collection
`base_name`, or `name` when there is no base. The zone is ignored.

## save

Pattern `sys:entity,cmd:save`. Parameters: `ent`, and `q` with directives.

* `ent.id` set: update by `_id` (see [merge](options.md#merge)), upserting.
* `ent.id` not set, `q.upsert$` is an array of field names all present in
  the entity: `findOneAndUpdate` on those fields with `$set`, `upsert: true`;
  retried up to 3 times on a duplicate key error.
* Otherwise: `insertOne`. `ent.id$` (or `generate_id`) sets `_id`.

Reply: the saved entity with `id` as a string.

## load

Pattern `sys:entity,cmd:load`. `q` is an id string, or a query object
(see [Query directives](#query-directives)). Uses `findOne`.
Reply: the entity, or `null` when nothing matches.

## list

Pattern `sys:entity,cmd:list`. `q` is a query object, an array of ids, or an
id. Reply: an array of entities.

## remove

Pattern `sys:entity,cmd:remove`.

* `all$: true`: removes every matching document. Reply: `null`.
* Otherwise removes the first match. With `load$: true` the reply is the
  removed document as stored (with `_id`, not an entity); otherwise `null`.

## native

Pattern `sys:entity,cmd:native`. Reply: the driver `Db` object.

## close

seneca-entity registers the store close on `sys:seneca,cmd:close`. It
closes the MongoDB client once; `seneca.close()` triggers it.

## init

Pattern `init:mongo-store` (with the plugin tag). Run by Seneca when the
plugin loads; it connects to MongoDB. Not called by applications.

## Query directives

| Key | Effect |
| --- | ------ |
| `id` | Match `_id`; an array becomes `$in`. Other fields are then ignored. |
| field with array value | Becomes `{ $in: [...] }`. |
| `sort$` | `{ field: 1 \| -1 }`, first field only. |
| `limit$`, `skip$` | Non negative numbers; negative values become `0`. |
| `fields$` | Passed to the driver as the `fields` option (projection). |
| `native$` | Object: the filter. Array: `[filter, options]`. Other directives are ignored. |
| other keys ending in `$` | Ignored. |

## Errors

The plugin defines no error codes. Driver errors are replied as they are
(for example a duplicate key error with `code: 11000`), after being logged
with `seneca.log.error`. A failed connection in the init action calls
`seneca.die('connect', ...)`, which is fatal.
