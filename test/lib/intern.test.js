const Seneca = require('seneca')

const Lab = require('@hapi/lab')
const Code = require('@hapi/code')
const expect = Code.expect

const lab = (exports.lab = Lab.script())
const { describe, before, beforeEach, after, afterEach } = lab

const { make_it } = require('../support/helpers')
const it = make_it(lab)

const MongoStore = require('../../')

const {
  fixquery, metaquery, makeid, makeent, idstr, should_strip_mongo_qualifiers,
  attempt_upsert
} = MongoStore.intern


describe('fixquery', () => {
  const si = makeSenecaForTest()

  it('handles the native$-qualifier', (done) => {
    const q = {
      native$: {
        $or: [{ name: 'cherry' }, { price: 200 }]
      }
    }

    const result = fixquery(q, si, {})

    expect(result).to.equal({
      '$or': [{ name: 'cherry' }, { price: 200 }]
    })

    return done()
  })

  it('handles ids', (done) => {
    const result = fixquery('myPreciousId', si, {})

    expect(result).to.equal({ _id: 'myPreciousId' })

    return done()
  })

  it('handles multiple ids', (done) => {
    const result = fixquery(['id0', 'id1', 'id2'], si, {})

    expect(result).to.equal({
      _id: { '$in': ['id0', 'id1', 'id2'] }
    })

    return done()
  })

  it('handles ids inside a query', (done) => {
    const q = { id: 'myPreciousId' }
    const result = fixquery(q, si, {})

    expect(result).to.equal({ _id: 'myPreciousId' })

    return done()
  })

  // NOTE: This has been the default behavior in seneca-mongo-store@4.0.0.
  //
  it('discards other fields when handling ids', (done) => {
    const q = { id: 'myPreciousId', foo: 37 }
    const result = fixquery(q, si, {})

    expect(result).to.equal({ _id: 'myPreciousId' })

    return done()
  })

  it('handles multiple ids inside a query', (done) => {
    const q = { id: ['id0', 'id1', 'id2'] }
    const result = fixquery(q, si, {})

    expect(result).to.equal({
      _id: { $in: ['id0', 'id1', 'id2'] }
    })

    return done()
  })

  it('handles both array- and non-array- fields', done => {
    const q = { score: 123, fruits: ['blackberry', 'oranges'] }
    const result = fixquery(q, si, {})

    expect(result).to.equal({
      score: 123,
      fruits: { $in: ['blackberry', 'oranges'] }
    })

    return done()
  })

  it('filters out seneca-qualifiers', done => {
    const q = { foo$: 'foo', bar: 37 }
    const result = fixquery(q, si, {})

    expect(result).to.equal({ bar: 37 })

    return done()
  })

  it('retains mongo-qualifiers', done => {
    try {
      suppressSenecaLogsOnStdout()

      const q = {
        foo: 'abc',
        $or: [{ name: 'cherry' }, { price: 200 }]
      }

      const result = fixquery(q, si, {})

      expect(result).to.equal({
        foo: 'abc',
        $or: [{ name: 'cherry' }, { price: 200 }]
      })
    } finally {
      restoreStdout()
    }

    return done()
  })

  it('filters out mongo-qualif. when mongo_operator_shortcut:false', done => {
    const q = {
      foo: 'abc',
      $or: [{ name: 'cherry' }, { price: 200 }]
    }

    const result = fixquery(q, si, { mongo_operator_shortcut: false })

    expect(result).to.equal({
      foo: 'abc'
    })

    return done()
  })

  it('warns about mongo-qualif., mongo_operator_shortcut:true', done => {
    const all_logs = []

    try {
      bufferSenecaLogsOnStdout(all_logs)

      const q = {
        foo: 'abc',
        $or: [{ name: 'cherry' }, { price: 200 }]
      }

      void fixquery(q, si, { mongo_operator_shortcut: true })
    } finally {
      restoreStdout()
    }


    const warn_logs = all_logs.filter(
      (log) => 'warn' === log.level_name
    )

    const deprecation_warning = warn_logs.find(log => {
      if (!Array.isArray(log.data)) {
        return false
      }

      const log_msg = log.data[0]

      if ('string' !== typeof log_msg) {
        return false
      }

      return log_msg.includes('Passing MongoDB operators directly')
    })

    expect(deprecation_warning).to.exist()


    return done()
  })
  function makeSenecaForTest() {
    return Seneca({ log: 'test' })
  }
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

describe('should_strip_mongo_qualifiers', () => {
  it('should strip mongo, when false is explicitly passed', (done) => {
    const plugin_opts = { mongo_operator_shortcut: false }
    const result = should_strip_mongo_qualifiers(plugin_opts)

    expect(result).to.equal(true)

    return done()
  })

  it('should keep mongo, when true is explicitly passed', (done) => {
    const plugin_opts = { mongo_operator_shortcut: true }
    const result = should_strip_mongo_qualifiers(plugin_opts)

    expect(result).to.equal(false)

    return done()
  })

  it('should keep mongo, when the option is not passed at all', (done) => {
    const plugin_opts = { some_other_option: false }
    const result = should_strip_mongo_qualifiers(plugin_opts)

    expect(result).to.equal(false)

    return done()
  })
})

describe('attempt_upsert', () => {
  const filter_by = { email: 'jimi.hendrix@example.com' }
  const replacement = { email: 'jimi.hendrix@experience.com' }
  const fake_update = { fake$: 'update' }

  const fake_duplicate_error = new Error()
  fake_duplicate_error.code = 11000
  fake_duplicate_error.codeName = 'DuplicateKey'

  it('returns the result when the first attempt is successful', (done) => {
    let num_calls = 0
    
    const fake_coll = {
      findOneAndUpdate(filter_by_arg, replacement_arg, opts_arg, cb) {
        expect(filter_by_arg).to.equal(filter_by)
        expect(replacement_arg).to.equal(replacement)
        expect(opts_arg).to.equal({ upsert: true, returnOriginal: false })

        num_calls++

        return cb(null, fake_update)
      }
    }

    attempt_upsert(fake_coll, filter_by, replacement, (err, update) => {
      if (err) {
        return done(err)
      }

      expect(num_calls).to.equal(1)
      expect(update).to.equal(fake_update)

      return done()
    })
  })

  it('tries again on MongoDB duplicate errors', (done) => {
    let num_calls = 0
    
    const fake_coll = {
      findOneAndUpdate(filter_by_arg, replacement_arg, opts_arg, cb) {
        num_calls++

        if (1 === num_calls) {
          return cb(fake_duplicate_error)
        }

        expect(filter_by_arg).to.equal(filter_by)
        expect(replacement_arg).to.equal(replacement)
        expect(opts_arg).to.equal({ upsert: true, returnOriginal: false })

        return cb(null, fake_update)
      }
    }

    attempt_upsert(fake_coll, filter_by, replacement, (err, update) => {
      if (err) {
        return done(err)
      }

      expect(num_calls).to.equal(2)
      expect(update).to.equal(fake_update)

      return done()
    })
  })

  it('tries again no more than 3 times', (done) => {
    let num_calls = 0
    
    const fake_coll = {
      findOneAndUpdate(filter_by_arg, replacement_arg, opts_arg, cb) {
        expect(filter_by_arg).to.equal(filter_by)
        expect(replacement_arg).to.equal(replacement)
        expect(opts_arg).to.equal({ upsert: true, returnOriginal: false })

        num_calls++

        return cb(fake_duplicate_error)
      }
    }

    attempt_upsert(fake_coll, filter_by, replacement, (err, update) => {
      expect(err).to.equal(fake_duplicate_error)
      expect(num_calls).to.equal(3)

      return done()
    })
  })

  it('does not try again on other errors', (done) => {
    let num_calls = 0

    const fake_error = new Error('some kind of error')
    
    const fake_coll = {
      findOneAndUpdate(filter_by_arg, replacement_arg, opts_arg, cb) {
        expect(filter_by_arg).to.equal(filter_by)
        expect(replacement_arg).to.equal(replacement)
        expect(opts_arg).to.equal({ upsert: true, returnOriginal: false })

        num_calls++

        return cb(fake_error)
      }
    }

    attempt_upsert(fake_coll, filter_by, replacement, (err, update) => {
      expect(err).to.equal(fake_error)
      expect(num_calls).to.equal(1)

      return done()
    })
  })
})

const writeToStdout = process.stdout.write

function bufferSenecaLogsOnStdout(out_logs) {
  process.stdout.write = (out) => {
    const log = (() => {
      try {
        return JSON.parse(out)
      } catch (_err) {
        return null
      }
    })()

    const is_log = null != log && 'level_name' in log

    if (is_log) {
      out_logs.push(log)
      return
    }

    return writeToStdout.call(process.stdout, out)
  }
}

function restoreStdout() {
  process.stdout.write = writeToStdout
}

function suppressSenecaLogsOnStdout() {
  return bufferSenecaLogsOnStdout([])
}

