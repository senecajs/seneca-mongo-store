# API

## Exports

| Export | Returns |
| ------ | ------- |
| `seneca.export('mongo-store').mongo()` | The driver `Db` object, or `null` before connecting. |

The plugin returns `{ name, tag, export: { mongo } }` from its definition,
so the export is the whole object under the plugin name. With a tag use the
tagged name, for example `seneca.export('mongo-store$main')`.

## intern

`require('@seneca/mongo-store').intern` holds the internal helpers used by
the store and its unit tests: `ensure_id`, `makeid`, `idstr`, `fixquery`,
`metaquery`, `makeent`, `should_merge`, `is_seneca_directive`,
`is_mongo_operator`, `should_strip_mongo_qualifiers`,
`is_mongo_duplicate_key_error`, `attempt_upsert`. They are not a stable API.
