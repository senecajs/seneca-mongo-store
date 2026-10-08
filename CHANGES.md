# 5.1.0 - 2026-10-08

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

# 1.1.0 - 27.08.2016

* Added Seneca 3 and Node 6 support
* Dropped Node 0.10, 0.12, 5 support
* Updated dependencies

# 1.0.0 - 08.08.2016

* Updated mongodb to 2.2.5
* Updated dependencies
* Options 2.0 style, connect URI support
* Ehanced error reporting
* Ehanced tests
