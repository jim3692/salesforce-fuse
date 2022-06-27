const { join } = require('path')

const project = require('../sfdx-project.json')

const sfdxDefaultPath = project.packageDirectories?.find(dir => dir.default)?.path

if (!sfdxDefaultPath) {
  console.error('Could not find a default package directory in sfdx-project.json')
  process.exit(1)
}

module.exports = {
  projectRoot: join(__dirname, '..'),
  sfdxDefaultPath
}
