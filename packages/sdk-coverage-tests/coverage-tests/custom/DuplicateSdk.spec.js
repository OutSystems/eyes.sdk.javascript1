'use strict'
const cwd = process.cwd()
const path = require('path')
const {getEyes, Browsers} = require('../util/TestSetup')
const spec = require(path.resolve(cwd, 'src/SpecWrappedDriver'))
const fs = require('fs')
const {promisify} = require('util')
const ncp = require('ncp')
const pncp = promisify(ncp)

describe('Coverage tests', () => {
  let driver, eyes

  afterEach(async () => {
    await spec.cleanup(driver)
  })

  beforeEach(async () => {
    driver = await spec.build({capabilities: Browsers.chrome()})
    eyes = await getEyes({isCssStitching: true})
  })

  it('resilient to duplicate copies of the SDK', async () => {
    const {sdkPath, cleanup} = await createCopyOfSdk(cwd)

    await spec.visit(driver, 'https://applitools.github.io/demo/TestPages/FramesTestPage/')

    module.constructor._pathCache = {}

    try {
      const sdk = require(sdkPath)

      await eyes.open(driver, 'Eyes JS SDK', 'duplicate copies of SDK', {width: 700, height: 460})
      await eyes.check(sdk.Target.region('#overflowing-div').fully())
      await eyes.close()
    } finally {
      cleanup()
    }
  })
})

async function createCopyOfSdk(pathToExistingSdk) {
  const targetCorePath = path.resolve(pathToExistingSdk, 'eyes-sdk-core')
  fs.rmdirSync(targetCorePath, {recursive: true})
  // copy core into here
  await pncp(path.resolve(pathToExistingSdk, '../eyes-sdk-core'), targetCorePath)

  // create copy of src folder
  const targetSrcPath = path.resolve(pathToExistingSdk, 'src2')
  fs.rmdirSync(targetSrcPath, {recursive: true})
  await pncp(path.resolve(pathToExistingSdk, 'src'), targetSrcPath)

  // fix references in src folder
  const filesInSrc = fs.readdirSync(path.resolve(pathToExistingSdk, 'src2'))
  for (const file of filesInSrc) {
    const filepath = path.resolve(pathToExistingSdk, 'src2', file)
    const content = fs.readFileSync(filepath).toString()
    const newContent = content.replace('@applitools/eyes-sdk-core', `../eyes-sdk-core`)
    fs.writeFileSync(filepath, newContent)
  }

  // create copy of index file
  const targetIndexPath = path.resolve(pathToExistingSdk, 'index2.js')
  fs.copyFileSync(path.resolve(pathToExistingSdk, 'index.js'), targetIndexPath)

  // fix references in index file
  const content = fs.readFileSync(targetIndexPath).toString()
  const newContent = content
    .replace('@applitools/eyes-sdk-core', `./eyes-sdk-core`)
    .replace('./src/', './src2/')
  fs.writeFileSync(targetIndexPath, newContent)

  return {sdkPath: targetIndexPath, cleanup}

  function cleanup() {
    fs.rmdirSync(targetSrcPath, {recursive: true})
    fs.rmdirSync(targetCorePath, {recursive: true})
    fs.unlinkSync(targetIndexPath)
  }
}
