// Save, load, list and remove an entity in MongoDB.
// Start MongoDB first: npm run services:up (host port 27117).
const Seneca = require('seneca')

const host = process.env.SENECA_TEST_MONGO_HOST || '127.0.0.1'
const port = process.env.SENECA_TEST_MONGO_PORT || '27117'

async function main() {
  const seneca = Seneca()
    .test()
    .use('entity')
    .use(require('../..'), {
      uri: 'mongodb://' + host + ':' + port,
      db: 'getting_started',
    })

  await new Promise((resolve) => seneca.ready(resolve))

  const apple = await seneca
    .entity('fruit')
    .data$({ name: 'Pink Lady', price: 0.99 })
    .save$()
  console.log('saved', apple.id.length, apple.name, apple.price)

  const loaded = await seneca.entity('fruit').load$(apple.id)
  console.log('loaded', loaded.name)

  const cheap = await seneca.entity('fruit').list$({ price: { $lt: 1 } })
  console.log('cheap fruit', cheap.length >= 1)

  await seneca.entity('fruit').remove$({ all$: true })
  const left = await seneca.entity('fruit').list$()
  console.log('left after remove', left.length)

  await new Promise((resolve) => seneca.close(resolve))
}

main()
