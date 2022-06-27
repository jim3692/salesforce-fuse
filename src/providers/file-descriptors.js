const fs = require('fs')
const { join } = require('path')

const { projectRoot } = require('../config')

const TEMP_DIR = join(projectRoot, '.tmp', 'temp')

if (fs.existsSync(TEMP_DIR)) {
  fs.rmSync(TEMP_DIR, { recursive: true })
}

fs.mkdirSync(TEMP_DIR, { recursive: true })

let fdCounter = 1

const fdsMap = new Map()

function getNextFd () {
  return fdCounter++
}

function getFileReadStream ({ path, fd, start }) {
  return fs.createReadStream(path || fdsMap.get(fd).path, { encoding: 'binary', start })
}

function getFileWriteStream ({ path, fd, start }) {
  return fs.createWriteStream(path || fdsMap.get(fd).path, { encoding: 'binary', start })
}

function newTempFile (targetPath) {
  const file = {
    fd: getNextFd(),
    path: targetPath
  }

  file.tempPath = join(TEMP_DIR, `${file.fd}_${Buffer.from(targetPath).toString('base64')}`)
  file.writeStream = getFileWriteStream({ path: file.tempPath })
  file.writeStream.on('close', () => {
    file.writeStream.destroy()
    delete file.writeStream
  })

  file.getFileReadStream = async () => {
    if (file.writeStream) {
      await new Promise((resolve) => {
        file.writeStream.on('close', resolve)
        file.writeStream.close()
      })
    }

    return getFileReadStream({ path: file.tempPath })
  }

  fdsMap.set(file.fd, file)

  return new Promise((resolve, reject) => {
    file.writeStream.on('ready', () => resolve(file))
    file.writeStream.on('error', (err) => reject(err))
  })
}

function getFile (fd) {
  return fdsMap.has(fd) && fdsMap.get(fd)
}

async function releaseFd (fd) {
  if (!fdsMap.has(fd)) { return }

  const file = fdsMap.get(fd)

  if (file.readStream) {
    file.readStream.close()
  }

  if (file.writeStream) {
    file.writeStream.close()
  }

  fdsMap.delete(fd)
}

module.exports = {
  newTempFile,
  getFile,
  releaseFd
}
