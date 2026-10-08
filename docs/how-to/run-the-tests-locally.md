# Run the tests locally

Goal: run the plugin test suite against a real MongoDB.

1. Use Node 24 or 22 and install the dependencies:

   ```sh
   npm install
   ```

2. Start MongoDB 9.0 (container `seneca-mongo-store-mongo`, host port 27117):

   ```sh
   npm run services:up
   ```

   This runs `docker compose up -d --wait` and returns when the health check
   (`mongosh ... ping`) passes.

3. Run the tests:

   ```sh
   npm test
   ```

   `npm test` does not start Docker. It connects to the server given by:

   | Variable | Default |
   | -------- | ------- |
   | `SENECA_TEST_MONGO_HOST` | `127.0.0.1` |
   | `SENECA_TEST_MONGO_PORT` | `27117` |

   Example with another server: `SENECA_TEST_MONGO_PORT=27017 npm test`.

4. Optionally test with the unreleased Seneca 4.0.0 build:

   ```sh
   npm install --no-save /path/to/seneca-4.0.0.tgz
   npm test
   npm install   # back to the seneca devDependency
   ```

5. Stop and remove the container and its volume:

   ```sh
   npm run services:down
   ```

The GitHub workflow runs the same image as a service container on the same
port; it is kept in [.patches](../../.patches/README.md).
