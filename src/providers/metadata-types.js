const sfdx = require('sfdx-node')

let _cache = []

module.exports.getSfdxMetadataTypes = function getCachedSfdxMetadataTypes () {
  return _cache
}

module.exports.loadSfdxMetadataTypes = async function loadSfdxMetadataTypes () {
  const data = await sfdx.force.mdapi.describemetadata({ json: true, _rejectOnError: true })
    .then(data => data?.metadataObjects)
    .catch(err => console.error(err))

  if (Array.isArray(data)) {
    _cache = data
    return _cache
  }

  console.log(data)
  return []
}
