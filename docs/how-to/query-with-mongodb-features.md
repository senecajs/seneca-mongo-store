# Query with MongoDB features

Goal: use sorting, paging, projections and MongoDB operators from the
entity API.

## 1. Match fields

`list$({ p1: 'a' })` finds documents where `p1` is `'a'`. An array value
becomes `$in`: `list$({ p1: ['a', 'b'] })` finds `p1` equal to `a` or `b`.
`list$({ id: [id1, id2] })` finds by several ids.

## 2. Sort, page and project

```js
const page = await seneca.entity('fruit').list$({
  sort$: { price: -1 }, // descending; 1 is ascending; only the first field is used
  skip$: 10,
  limit$: 5,
  fields$: { name: 1 }, // passed to the driver as the fields option
})
```

## 3. Use MongoDB operators

Top level keys starting with `$` and operator values are passed through:

```js
await seneca.entity('fruit').list$({ price: { $lt: 1 } })
await seneca.entity('fruit').list$({ $or: [{ name: 'a' }, { price: 2 }] })
```

A top level operator key (such as `$or`) logs a deprecation warning. Set the
plugin option `mongo_operator_shortcut: false` to drop top level `$` keys
from queries instead.

## 4. Send a native query

`native$` replaces the whole query. An object is the MongoDB filter; an array
is `[filter, options]`, where `options` goes to `find`/`findOne` unchanged
and the `sort$`, `limit$`, `skip$` and `fields$` directives are ignored:

```js
await seneca.entity('fruit').list$({
  native$: [{ price: { $gt: 1 } }, { sort: [['price', 'descending']], limit: 3 }],
})
```

## 5. Use the driver directly

`native$` on an entity replies with the driver `Db` object:

```js
seneca.entity('fruit').native$(function (err, db) {
  db.collection('fruit').createIndex({ name: 1 }, function () {})
})
```

The same object is returned by `seneca.export('mongo-store').mongo()`.
