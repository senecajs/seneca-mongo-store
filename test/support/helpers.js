exports.fetchProp = function (o, prop) {
  if (!(prop in o)) {
    throw new Error(`Missing property: ${prop}`)
  }

  return o[prop]
}
