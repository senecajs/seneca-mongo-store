const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const expect = Code.expect

const lab = (exports.lab = Lab.script())
const { describe, before, beforeEach, after, afterEach } = lab
const it = make_it(lab)

const Util = require('util')
const { fixquery } = require('../../lib/common')

describe('fixquery', () => {
  it('handles the native$-qualifier', (done) => {
    const q = {
      native$: {
        $or: [{ name: 'cherry' }, { price: 200 }]
      }
    }

    const result = fixquery(q)

    expect(result).to.equal({
      '$or': [{ name: 'cherry' }, { price: 200 }]
    })

    return done()
  })

  it('handles ids', (done) => {
    const result = fixquery('myPreciousId')

    expect(result).to.equal({ _id: 'myPreciousId' })

    return done()
  })

  it('handles multiple ids', (done) => {
    const result = fixquery(['id0', 'id1', 'id2'])

    expect(result).to.equal({
      _id: { '$in': ['id0', 'id1', 'id2'] }
    })

    return done()
  })

  it('handles ids inside a query', (done) => {
    const q = { id: 'myPreciousId' }
    const result = fixquery(q)

    expect(result).to.equal({ _id: 'myPreciousId' })

    return done()
  })

  // NOTE: This has been the default behavior in seneca-mongo-store@4.0.0.
  //
  it('discards other fields when handling ids', (done) => {
    const q = { id: 'myPreciousId', foo: 37 }
    const result = fixquery(q)

    expect(result).to.equal({ _id: 'myPreciousId' })

    return done()
  })

  it('handles multiple ids inside a query', (done) => {
    const q = { id: ['id0', 'id1', 'id2'] }
    const result = fixquery(q)

    expect(result).to.equal({
      _id: { $in: ['id0', 'id1', 'id2'] }
    })

    return done()
  })

  it('handles both array- and non-array- fields', done => {
    const q = { score: 123, fruits: ['blackberry', 'oranges'] }
    const result = fixquery(q)

    expect(result).to.equal({
      score: 123,
      fruits: { $in: ['blackberry', 'oranges'] }
    })

    return done()
  })

  it('filters out seneca-qualifiers', done => {
    const q = { foo$: 'foo', bar: 37 }
    const result = fixquery(q)

    expect(result).to.equal({ bar: 37 })

    return done()
  })

  it('retains mongo-qualifiers', done => {
    const q = {
      foo: 'abc',
      $or: [{ name: 'cherry' }, { price: 200 }]
    }

    const result = fixquery(q)

    expect(result).to.equal({
      foo: 'abc',
      $or: [{ name: 'cherry' }, { price: 200 }]
    })

    return done()
  })

  it('filters out mongo-qualif. when mongo_operator_shortcut:false', done => {
    const q = {
      foo: 'abc',
      $or: [{ name: 'cherry' }, { price: 200 }]
    }

    const result = fixquery(q, { mongo_operator_shortcut: false })

    expect(result).to.equal({
      foo: 'abc'
    })

    return done()
  })
})

// TODO: Move this under ./test/support/helpers.js
//
function make_it(lab) {
  return function it(name, opts, func) {
    if ('function' === typeof opts) {
      func = opts
      opts = {}
    }

    lab.it(
      name,
      opts,
      Util.promisify(function (x, fin) {
        func(fin)
      })
    )
  }
}
