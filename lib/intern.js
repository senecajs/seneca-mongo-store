const Mongo = require('mongodb')
const ObjectID = Mongo.ObjectID


function ensure_id(ent, opts) {
  let id = undefined

  if (undefined !== ent.id$) {
    id = ent.id$
  } else if (opts.generate_id) {
    id = opts.generate_id(ent)
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


function fixquery(q, seneca, opts) {
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
    if (is_seneca_qualifier(qp)) {
      continue
    }


    if (is_mongo_qualifier(qp)) {
      if (should_strip_mongo_qualifiers(opts)) {
        continue
      }

      seneca.log.warn('Passing MongoDB operators directly via the query'  +
        ' may be unsafe and is being deprecated. In the future releases,' +
        ' support for this may be removed.')
    }


    if (Array.isArray(q[qp]) && !is_mongo_qualifier(qp)) {
      qq[qp] = { $in: q[qp] }
    } else {
      qq[qp] = q[qp]
    }
  }

  return qq
}


function is_seneca_qualifier(p) {
  return p.match(/\$$/)
}


function is_mongo_qualifier(p) {
  return p.startsWith('$')
}


function should_strip_mongo_qualifiers(opts) {
  return false == opts.mongo_operator_shortcut
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


function should_merge(ent, opts) {
  return !(false === opts.merge || false === ent.merge$)
}


module.exports = {
  intern: {
    ensure_id, makeid, idstr, fixquery, metaquery, makeent,
    should_merge, is_seneca_qualifier, is_mongo_qualifier,
    should_strip_mongo_qualifiers
  }
}
