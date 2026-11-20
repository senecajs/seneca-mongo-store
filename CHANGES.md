# Changes

## 6.0.0 2026-11-20

The first version published as `@seneca/mongo-store`; versions up to
5.0.1 were published as `seneca-mongo-store`. 5.1.0 was prepared but not
published; its changes are part of this version.

* Seneca 4: the peer dependency is `seneca` `^4.0.0` (was
  `>=3 || >=4.0.0-rc5`). Seneca 3 users stay on `seneca-mongo-store@5`.
* Renamed from `seneca-mongo-store` to `@seneca/mongo-store`.
* Node.js 24 or later (`engines.node` `>=24`).
* New peer dependency `@seneca/entity` `^29.0.0`, the entity plugin for
  Seneca 4. Load it before the store, by its full name. The store
  registers through its `entity/init` export; the `seneca.store.init`
  fallback for Seneca 3 is removed. Without the entity plugin the store
  now stops at load with a message that says to load `@seneca/entity`
  first, instead of `store_init is not a function`.
* Tests use `@seneca/entity` 29 and `@seneca/store-test` 7, loaded by
  full name (B14), and were run against MongoDB 7.0. Removed the
  development dependencies `seneca-entity` and `seneca-store-test`.
* README and docs: install `seneca@^4` and `@seneca/entity`, load
  plugins by full name, Node.js 24 (trap T18).
* `CHANGES.md` is listed in `files`; `publishConfig.access` is `public`.

## 5.1.0 2026-10-08 (not published)

* Seneca 4 prerelease support: the store uses the `entity/init` export of
  seneca-entity 28 when `seneca.store` is not available, and falls back to
  `seneca.store.init` for older seneca-entity versions.
* Node 24 and 22; tested against MongoDB 9.0 (`mongodb` driver 3.7 kept).
* Tests: `@hapi/lab` 26 (lint step dropped, it no longer runs under ESLint 9),
  seneca-store-test 6, every Seneca instance closed after the run, connection
  read from `SENECA_TEST_MONGO_HOST` / `SENECA_TEST_MONGO_PORT`.
* `docker-compose.yml` with `npm run services:up` / `services:down` replaces
  the Dockerfile and the `build`/`start`/`stop` scripts; Travis and coveralls
  removed; CI workflow delivered in `.patches/`.
* Documentation reorganized into `docs/` (tutorial, how-to, reference,
  explanation).

## 1.1.0 2016-08-27

* Added Seneca 3 and Node 6 support
* Dropped Node 0.10, 0.12, 5 support
* Updated dependencies

## 1.0.0 2016-08-08

* Updated mongodb to 2.2.5
* Updated dependencies
* Options 2.0 style, connect URI support
* Ehanced error reporting
* Ehanced tests
