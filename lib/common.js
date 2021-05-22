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


function fixquery(qent, q) {
  var qq = {}

  if (!q.native$) {
    if ('string' === typeof q) {
      qq = {
        _id: makeid(q),
      }
    } else if (Array.isArray(q)) {
      qq = {
        _id: {
          $in: q.map((id) => {
            return makeid(id)
          }),
        },
      }
    } else {
      if (q.id) {
        if (Array.isArray(q.id)) {
          qq._id = {
            $in: q.id.map((id) => {
              return makeid(id)
            }),
          }
        } else {
          qq._id = makeid(q.id)
        }

        //delete q.id
      } else {
        for (var qp in q) {
          if ('id' !== qp && !qp.match(/\$$/)) {
            if (Array.isArray(q[qp])) {
              qq[qp] = { $in: q[qp] }
            } else {
              qq[qp] = q[qp]
            }
          }
        }
      }
    }
  } else {
    qq = Array.isArray(q.native$) ? q.native$[0] : q.native$
  }

  return qq
}


function metaquery(qent, q) {
  var mq = {}

  if (!q.native$) {
    if (q.sort$) {
      for (var sf in q.sort$) break
      var sd = q.sort$[sf] < 0 ? 'descending' : 'ascending'
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


function clean_array(ary) {
  const is_public_prop = p => !p.includes('$')
  return ary.filter(is_public_prop)
}


module.exports = { ensure_id, makeid, idstr, fixquery, metaquery, clean_array }
