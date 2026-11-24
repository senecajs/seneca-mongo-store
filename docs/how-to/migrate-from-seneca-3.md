# Migrate from Seneca 3

Goal: run an application that uses this store on Seneca 4.

1. Upgrade `seneca` to 4, replace `seneca-entity` with `@seneca/entity` 29,
   and replace `seneca-mongo-store` with `@seneca/mongo-store` 6:

   ```sh
   npm install seneca@^4 @seneca/entity @seneca/mongo-store
   ```

   Load both by full name, the entity plugin first:
   `seneca.use('@seneca/entity').use('@seneca/mongo-store', options)`.
   Version 6 of the store needs Seneca 4; Seneca 3 users stay on
   `seneca-mongo-store@5`.
2. Pass store options through `use()` (or `options.plugin['mongo-store']`).
   Seneca 4 no longer reads a top level `options['mongo-store']` block.
3. Remove `legacy` sub options that Seneca 4 rejects (for example
   `legacy: { transport: ... }`); only `error`, `meta` and `builtin_actions`
   remain.
4. Error handling: Seneca 4 replies with the original driver error (for
   example a driver `MongoError` with `code: 11000`). Code that read
   `err.orig` should read `err` itself.
5. Use Node.js 24 or later.

Nothing in the store options or query syntax changes.
