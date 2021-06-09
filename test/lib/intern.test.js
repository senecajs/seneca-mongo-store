const Seneca = require('seneca')

const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const expect = Code.expect

const lab = (exports.lab = Lab.script())
const { describe, before, beforeEach, after, afterEach } = lab
const it = make_it(lab)


const Util = require('util')

const { intern } = require('../../lib/intern')
const { fixquery, metaquery, makeid, makeent, idstr } = intern


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

describe('metaquery', () => {
  it('handles the native$-qualifier of object type', (done) => {
    const q = {
      native$: {
        $or: [{ name: 'cherry' }, { price: 200 }]
      }
    }

    const result = metaquery(q)

    expect(result).to.equal({})

    return done()
  })

  it('handles the native$-qualifier of array type', (done) => {
    const q = {
      native$: [{}, 'foobarbaz']
    }

    const result = metaquery(q)

    expect(result).to.equal('foobarbaz')

    return done()
  })

  it('handles the sort$-qualifier', (done) => {
    const q = {
      sort$: { email: 1 }
    }

    const result = metaquery(q)

    expect(result).to.equal({ sort: [['email', 'ascending']] })

    return done()
  })

  it('handles the sort$-qualifier', (done) => {
    const q = {
      sort$: { email: -1 }
    }

    const result = metaquery(q)

    expect(result).to.equal({ sort: [['email', 'descending']] })

    return done()
  })

  // NOTE: This has been the default behavior in seneca-mongo-store@4.0.0.
  //
  it('given the sort$-qualifier, only sorts by one field', (done) => {
    const q = {
      sort$: { email: 1, age: 1 }
    }

    const result = metaquery(q)

    expect(result).to.equal({ sort: [['email', 'ascending']] })

    return done()
  })

  it('handles the limit$-qualifier', (done) => {
    const q = { limit$: 5 } 
    const result = metaquery(q)

    expect(result).to.equal({ limit: 5 })

    return done()
  })

  it('handles a negative limit$', (done) => {
    const q = { limit$: -5 }

    const result = metaquery(q)

    expect(result).to.equal({ limit: 0 })

    return done()
  })

  it('handles the skip$-qualifier', (done) => {
    const q = { skip$: 5 } 
    const result = metaquery(q)

    expect(result).to.equal({ skip: 5 })

    return done()
  })

  it('handles a negative skip$', (done) => {
    const q = { skip$: -5 }
    const result = metaquery(q)

    expect(result).to.equal({ skip: 0 })

    return done()
  })

  it('handles the field$-qualifier', (done) => {
    const q = { fields$: ['email', 'score'] }
    const result = metaquery(q)

    expect(result).to.equal({ fields: ['email', 'score'] })

    return done()
  })

  it('handles multiple supported qualifiers', (done) => {
    const q = {
      sort$: { email: 1 },
      limit$: 10,
      skip$: 1,
      fields$: ['email']
    }

    const result = metaquery(q)

    expect(result).to.equal({
      sort: [['email', 'ascending']],
      limit: 10,
      skip: 1,
      fields: ['email']
    })

    return done()
  })
})

describe('makeid', () => {
  it('returns non-hex-strings as is', (done) => {
    const fake_id = '_'.repeat(24)
    const result = makeid(fake_id)

    expect(result).to.equal(fake_id)

    return done()
  })
})

describe('makeent', () => {
  const si = makeSenecaForTest()

  it('returns null when the doc is null', (done) => {
    const ent = si.make('products')
    const result = makeent(null, ent, si)

    expect(result).to.equal(null)

    return done()
  })

  it('constructs a new entity', (done) => {
    const ent = si.make('products')
    const result = makeent({ _id: 'myPreciousId' }, ent, si)

    const expected_result = ent.make$({ id: 'myPreciousId' })
    expect(result).to.equal(expected_result)

    return done()
  })

  function makeSenecaForTest() {
    return Seneca({ log: 'test' })
      .use('entity')
  }
})

describe('idstr', () => {
  it('converts the arg to string', (done) => {
    const result = idstr(123)

    expect(result).to.equal('123')

    return done()
  })

  it('converts the arg to hex-string, when the arg supports it', (done) => {
    const hexable = {
      toHexString() {
        return 'lolwat'
      }
    }

    const result = idstr(hexable)

    expect(result).to.equal('lolwat')

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
