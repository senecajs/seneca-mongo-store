# Patches

Changes to `.github/workflows/` cannot be pushed from the session that
prepared this branch, so they are delivered here as patches.

Apply them on top of the branch with:

```sh
git am .patches/*.patch
```

* `0001-ci-node24-mongo9.patch`: replaces `.github/workflows/build.yml`.
  The job tests Node 24.x and 22.x on `ubuntu-latest` against a `mongo:9.0`
  service container mapped to host port 27117 (the same port as
  `docker-compose.yml`). The container health check runs
  `mongosh ... db.adminCommand('ping')`, so the job waits until MongoDB
  accepts connections. `SENECA_TEST_MONGO_HOST` and `SENECA_TEST_MONGO_PORT`
  are set to match.
