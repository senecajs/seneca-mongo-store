const Mongo = require('mongodb')
const ObjectID = Mongo.ObjectID


exports.ensure_id = function (ent, plugin_opts) {
  let id = undefined

  if (undefined !== ent.id$) {
    id = ent.id$
  } else if (plugin_opts.generate_id) {
    id = plugin_opts.generate_id(ent)
  }

  return exports.makeid(id)
}


exports.makeid = function (hexstr) {
  if ('string' === typeof hexstr && 24 === hexstr.length) {
    try {
      return ObjectID.createFromHexString(hexstr)
    } catch (e) {
      return hexstr
    }
  }

  return hexstr
}

