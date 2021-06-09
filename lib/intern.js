const Mongo = require('mongodb')
const ObjectID = Mongo.ObjectID


function ensure_id(ent, plugin_opts) {
  let id = undefined

  if (undefined !== ent.id$) {
    id = ent.id$
  } else if (plugin_opts.generate_id) {
    id = plugin_opts.generate_id(ent)
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


function fixquery(q, plugin_opts = null) {
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


    const should_retain_mongo = null == plugin_opts || 
      plugin_opts.mongo_operator_shortcut

    if (is_mongo_qualifier(qp) && !should_retain_mongo) {
      continue
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


function makeent(doc, ent, seneca) {
  if (null == doc) {
    return null
  }

  doc.id = idstr(doc._id)
  delete doc._id

  return ent.make$(seneca.util.deep(doc))
}


function should_merge(ent, plugin_opts) {
  return !(false === plugin_opts.merge || false === ent.merge$)
}


module.exports = {
  intern: {
    ensure_id, makeid, idstr, fixquery, metaquery,
    makeent, should_merge, is_seneca_qualifier, is_mongo_qualifier
  }
}
