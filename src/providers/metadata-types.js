const sfdx = require('sfdx-node')

let _cache = []

function isMetadataType (pathParts) {
  return pathParts.length === 1 && getCachedSfdxMetadataTypes().find(type => type.xmlName === pathParts[0])
}

function getCachedSfdxMetadataTypes () {
  return _cache
}

async function loadSfdxMetadataTypes () {
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

module.exports = {
  isMetadataType,
  getCachedSfdxMetadataTypes,
  loadSfdxMetadataTypes
}
