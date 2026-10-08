# Migrate from Seneca 3

Goal: run an application that uses this store on Seneca 4.

1. Upgrade `seneca` to 4 and `seneca-entity` to 28 or later. The store
   works with both Seneca 3 and Seneca 4.
2. Pass store options through `use()` (or `options.plugin['mongo-store']`).
   Seneca 4 no longer reads a top level `options['mongo-store']` block.
3. Remove `legacy` sub options that Seneca 4 rejects (for example
   `legacy: { transport: ... }`); only `error`, `meta` and `builtin_actions`
   remain.
4. Error handling: Seneca 4 replies with the original driver error (for
   example a driver `MongoError` with `code: 11000`). Code that read
   `err.orig` should read `err` itself.
5. Use Node 22 or later, as required by Seneca 4.

Nothing in the store options or query syntax changes.
