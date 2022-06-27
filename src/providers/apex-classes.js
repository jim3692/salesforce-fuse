const fs = require('fs')
const { join } = require('path')

const sfdx = require('sfdx-node')

const { sfdxDefaultPath } = require('../config')

const CLASSES_PATH = join(sfdxDefaultPath, 'main/default/classes')

const CLASS_META_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>{{VERSION}}</apiVersion>
    <status>{{STATUS}}</status>
</ApexClass>`

let _cache = []

function isApexClass (pathParts) {
  return pathParts.length === 2 && pathParts[0] === 'ApexClass' && /\.cls$/.test(pathParts[1])
}

function isApexClassDir (pathParts) {
  return pathParts.length === 1 && pathParts[0] === 'ApexClass'
}

function getApexClasses () {
  return _cache
}

function existsApexClass (className) {
  return getApexClasses().find(cls => cls.fullName === className)
}

async function loadApexClasses () {
  const data = await sfdx.force.mdapi.listmetadata({ json: true, metadatatype: 'ApexClass', _rejectOnError: true })
    .catch(err => console.error(err))

  if (Array.isArray(data)) {
    _cache = data
    return _cache
  }

  console.log(data)
  return []
}

async function loadApexClass (className) {
  const filePath = await sfdx.force.source.retrieve({ json: true, metadata: 'ApexClass:' + className, _rejectOnError: true })
    .then(data => data?.inboundFiles?.find(file => /\.cls$/.test(file.filePath))?.filePath)
    .catch(err => console.error(err))

  if (filePath) {
    return fs.readFileSync(filePath, 'utf8')
  }

  return null
}

async function deployApexClass (className, stream) {
  const meta = CLASS_META_TEMPLATE
    .replace('{{VERSION}}', '54.0')
    .replace('{{STATUS}}', 'Active')

  console.log({ meta })

  fs.writeFileSync(join(CLASSES_PATH, className + '.cls-meta.xml'), meta, 'utf8')
  const writeStream = fs.createWriteStream(join(CLASSES_PATH, className + '.cls'), { encoding: 'binary' })
  stream.pipe(writeStream)

  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve)
    writeStream.on('error', reject)
  }).catch(err => console.error(err))

  console.log('saved')

  const result = await sfdx.force.source.deploy({ json: true, metadata: 'ApexClass:' + className, _rejectOnError: true })
    .catch(err => console.error(err))

  console.log({ result })

  if (result && result.success) {
    return 'SUCCESS'
  }
}

module.exports = {
  isApexClass,
  isApexClassDir,
  getApexClasses,
  existsApexClass,
  loadApexClasses,
  loadApexClass,
  deployApexClass
}
