const fs = require('fs')
const sfdx = require('sfdx-node')

module.exports.loadApexClasses = async function loadApexClasses () {
  const data = await sfdx.force.mdapi.listmetadata({ json: true, metadatatype: 'ApexClass', _rejectOnError: true })
    .catch(err => console.error(err))

  if (Array.isArray(data)) {
    return data
  }

  console.log(data)
  return []
}

module.exports.loadApexClass = async function loadApexClass (className) {
  const filePath = await sfdx.force.source.retrieve({ json: true, metadata: 'ApexClass:' + className, _rejectOnError: true })
    .then(data => data?.inboundFiles?.find(file => /\.cls$/.test(file.filePath))?.filePath)
    .catch(err => console.error(err))

  if (filePath) {
    return fs.readFileSync(filePath, 'utf8')
  }

  return null
}
