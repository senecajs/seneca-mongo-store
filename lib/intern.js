const Mongo = require('mongodb')
const ObjectID = Mongo.ObjectID


function ensure_id(ent, options) {
  let id = undefined

  if (undefined !== ent.id$) {
    id = ent.id$
  } else if (options.generate_id) {
    id = options.generate_id(ent)
  }

  return makeid(id)
}


function makeid(hexstr) {
  if ('string' === typeof hexstr && 24 === hexstr.length) {
    try {
      return ObjectID.createFromHexString(hexstr)
    } catch (e) {
      return hexstr
    }
  }

  return hexstr
}


function idstr(obj) {
  return obj && obj.toHexString ? obj.toHexString() : '' + obj
}


function fixquery(q, seneca, options) {
  if (q.native$) {
    return  Array.isArray(q.native$) ? q.native$[0] : q.native$
  }

  if ('string' === typeof q) {
    return { _id: makeid(q) }
  }
  
  if (Array.isArray(q)) {
    return {
      _id: { $in: q.map((id) => makeid(id)) }
    }
  }

  if (q.id) {
    if (Array.isArray(q.id)) {
      return {
        _id: { $in: q.id.map((id) => makeid(id)) }
      }
    }

    return { _id: makeid(q.id) }
  }


  const qq = {}

  for (const qp in q) {
    if (is_seneca_directive(qp)) {
      continue
    }


    if (is_mongo_operator(qp)) {
      if (should_strip_mongo_qualifiers(options)) {
        continue
      }

      seneca.log.warn('Passing MongoDB operators directly via the query'  +
        ' may be unsafe and is being deprecated. In the future releases,' +
        ' support for this may be removed.')
    }


    if (Array.isArray(q[qp]) && !is_mongo_operator(qp)) {
      qq[qp] = { $in: q[qp] }
    } else {
      qq[qp] = q[qp]
    }
  }

  return qq
}


function is_seneca_directive(p) {
  return p.match(/\$$/)
}


function is_mongo_operator(p) {
  return p.startsWith('$')
}


function should_strip_mongo_qualifiers(options) {
  return false == options.mongo_operator_shortcut
}


function metaquery(q) {
  let mq = {}

  if (!q.native$) {
    if (q.sort$) {
      let sf
      for (sf in q.sort$) break
      const sd = q.sort$[sf] < 0 ? 'descending' : 'ascending'
      mq.sort = [[sf, sd]]
    }

    if (q.limit$) {
      mq.limit = q.limit$ >= 0 ? q.limit$ : 0
    }

    if (q.skip$) {
      mq.skip = q.skip$ >= 0 ? q.skip$ : 0
    }

    if (q.fields$) {
      mq.fields = q.fields$
    }
  } else {
    mq = Array.isArray(q.native$) ? q.native$[1] : mq
  }

  return mq
}


function makeent(base_doc, ent, seneca) {
  if (null == base_doc) {
    return null
  }

  const doc = seneca.util.deep(base_doc)

  doc.id = idstr(doc._id)
  delete doc._id

  return ent.make$(doc)
}


function should_merge(ent, options) {
  return !(false === options.merge || false === ent.merge$)
}


function is_mongo_duplicate_key_error(err) {
  return err &&
    11000 === err.code &&
    'DuplicateKey' === err.codeName
}


function attempt_upsert(coll, filter_by, replacement, done) {
  function attempt(attempt_no) {
    // NOTE:
    // Sources:
    // - https://stackoverflow.com/questions/29305405/mongodb-impossible-e11000-duplicate-key-error-dup-key-when-upserting
    // - https://jira.mongodb.org/browse/SERVER-14322
    //
    // > > It is possible that two updates come in with upsert:true,
    // > > resulting in neither finding a document and both inserting
    // > > new documents which conflict on unique index violations of
    // > > the query predicate.
    // >
    // > The "solution" here is to add a retry code into the client.
    //
    return coll.findOneAndUpdate(
      filter_by,
      replacement,
      { upsert: true, returnOriginal: false },

      function (err, update) {
        if (err) {
          if (is_mongo_duplicate_key_error(err) && attempt_no < 3) {
            return attempt(attempt_no + 1)
          }

          return done(err)
        }

        return done(null, update)
      }
    )
  }

  return attempt(1)
}


module.exports = {
  intern: {
    ensure_id, makeid, idstr, fixquery, metaquery, makeent,
    should_merge, is_seneca_directive, is_mongo_operator,
    should_strip_mongo_qualifiers, is_mongo_duplicate_key_error,
    attempt_upsert
  }
}
