/* eslint-disable node/no-callback-literal */

const fs = require('fs')
const { join, sep } = require('path')

const Fuse = require('fuse-native')

const { sfdxDefaultPath } = require('./config')

const { getCachedSfdxMetadataTypes, loadSfdxMetadataTypes, isMetadataType } = require('./providers/metadata-types')
const { existsApexClass, getApexClasses, loadApexClass, loadApexClasses, isApexClass, isApexClassDir, deployApexClass } = require('./providers/apex-classes')
const { newTempFile, getFile, releaseFd } = require('./providers/file-descriptors')

if (!fs.existsSync(join(__dirname, '..', sfdxDefaultPath))) {
  fs.mkdirSync(join(__dirname, '..', sfdxDefaultPath), { recursive: true })
}

const ops = {
  async readdir (path, cb) {
    const pathParts = path.split(sep).slice(1)

    if (pathParts.length === 1 && !pathParts[0]) {
      return cb(null, getCachedSfdxMetadataTypes().map(type => type.xmlName))
    }

    if (isApexClassDir(pathParts)) {
      const classes = await loadApexClasses()
      return cb(null, classes.map(cls => cls.fullName + '.cls'))
    }

    return cb(Fuse.ENOENT)
  },
  getattr: function (path, cb) {
    // /\.git$/.test(path) || console.log('getattr', { path })

    if (path === '/') return cb(null, { mode: 16877, size: 4096 })

    const pathParts = path.split(sep).slice(1)

    if (isMetadataType(pathParts)) {
      return cb(null, { mode: 16877, size: 4096 })
    }

    if (isApexClass(pathParts)) {
      const className = pathParts[1].split(/\.cls$/)[0]
      if (existsApexClass(className)) {
        // TODO: Get actual file size
        return cb(null, { mode: 33206, size: 4 * 1024 * 1024 })
      }
    }

    return cb(Fuse.ENOENT)
  },
  open: function (path, flags, cb) {
    console.log('open', { path, flags })
    return process.nextTick(cb, 0, 42)
  },
  async release (path, fd, cb) {
    console.log('release', { path, fd })

    const file = getFile(fd)

    if (file) {
      const pathParts = file.path.split(sep).slice(1)
      const className = pathParts[1].split(/\.cls$/)[0]
      await deployApexClass(className, await file.getFileReadStream())
    }

    releaseFd(fd)
    return cb(0)
  },
  async read (path, fd, buf, len, pos, cb) {
    const pathParts = path.split(sep).slice(1)

    if (isApexClass(pathParts)) {
      const classData = await loadApexClass(pathParts[1].split(/\.cls$/)[0])

      if (!classData) return cb(0)

      buf.write(classData)
      return cb((new TextEncoder().encode(classData)).length)
    }

    return cb(0)
  },
  async write (path, fd, buffer, length, position, cb) {
    console.log('write', { path, fd, buffer: buffer.toString().substring(0, 10), length, position })

    const file = getFile(fd)
    console.log({ file: !!file })

    if (!file) { return cb(0) }

    file.writeStream.write(buffer, (err) => {
      if (!err) {
        return cb(length)
      }

      console.error(err)
      cb(0)
    })
  },
  truncate (path, size, cb) {
    console.log('truncate', { path, size })
    return cb(0)
  },
  ftruncate (path, fd, size, cb) {
    console.log('truncate', { path, fd, size })
    return cb(0)
  },
  async create (path, mode, cb) {
    console.log('create', { path, mode })

    const pathParts = path.split(sep).slice(1)

    let fd = 0

    if (isApexClass(pathParts)) {
      const className = pathParts[1].split(/\.cls$/)[0]
      if (!existsApexClass(className)) {
        getApexClasses().push({ fullName: className })
        fd = (await newTempFile(path)).fd
      }
    }

    return cb(0, fd)
  }
}

const mnt = process.env.MOUNT_POINT || join(__dirname, '..', '.mnt')

loadSfdxMetadataTypes()
  .then(() => {
    const fuse = new Fuse(mnt, ops, { debug: false })
    fuse.mount(function (err) {
      if (err) {
        console.error(err)
        process.exit(1)
      }
    })
  })
