/* eslint-disable node/no-callback-literal */

const fs = require('fs')
const { join, sep } = require('path')

const Fuse = require('fuse-native')

const { sfdxDefaultPath } = require('./config')

const { getSfdxMetadataTypes, loadSfdxMetadataTypes } = require('./providers/metadata-types')
const { loadApexClass, loadApexClasses } = require('./providers/apex-classes')

const sfdxDefaultPath = project.packageDirectories?.find(dir => dir.default)?.path

if (!sfdxDefaultPath) {
  console.error('Could not find a default package directory in sfdx-project.json')
  process.exit(1)
}

if (!fs.existsSync(join(__dirname, '..', sfdxDefaultPath))) {
  fs.mkdirSync(join(__dirname, '..', sfdxDefaultPath), { recursive: true })
}

const ops = {
  async readdir (path, cb) {
    const pathParts = path.split(sep).slice(1)

    if (pathParts.length === 1 && !pathParts[0]) {
      return cb(null, getSfdxMetadataTypes().map(type => type.xmlName))
    }

    if (pathParts.length === 1 && pathParts[0] === 'ApexClass') {
      const classes = await loadApexClasses()
      return cb(null, classes.map(cls => cls.fullName + '.cls'))
    }

    return cb(Fuse.ENOENT)
  },
  getattr: function (path, cb) {
    if (path === '/') return cb(null, { mode: 16877, size: 4096 })

    const pathParts = path.split(sep).slice(1)

    if (pathParts.length === 1 && getSfdxMetadataTypes().find(type => type.xmlName === pathParts[0])) {
      return cb(null, { mode: 16877, size: 4096 })
    }

    if (pathParts.length === 2 && pathParts[0] === 'ApexClass') {
      // TODO: Get actual file size
      return cb(null, { mode: 33206, size: 4096 })
    }

    return cb(Fuse.ENOENT)
  },
  open: function (path, flags, cb) {
    return cb(0, 42)
  },
  release: function (path, fd, cb) {
    return cb(0)
  },
  async read (path, fd, buf, len, pos, cb) {
    const pathParts = path.split(sep).slice(1)

    if (pathParts.length === 2 && pathParts[0] === 'ApexClass' && /\.cls$/.test(pathParts[1])) {
      const classData = await loadApexClass(pathParts[1].split(/\.cls$/)[0])

      if (!classData) return cb(0)

      buf.write(classData)
      return cb(classData.length)
    }

    return cb(0)
  }
}

const mnt = process.env.MOUNT_POINT || join(__dirname, '..', '.mnt')

loadSfdxMetadataTypes()
  .then(() => {
    const fuse = new Fuse(mnt, ops, { debug: !!process.env.NODE_ENV })
    fuse.mount(function (err) {
      if (err) {
        console.error(err)
        process.exit(1)
      }
    })
  })
