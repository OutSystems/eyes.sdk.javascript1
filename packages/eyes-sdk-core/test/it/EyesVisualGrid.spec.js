const {expect} = require('chai')
const {startFakeEyesServer, getSession} = require('@applitools/sdk-fake-eyes-server')
const MockDriver = require('../utils/MockDriver')
const {EyesVisualGrid} = require('../utils/FakeSDK')
const {MatchLevel, ConsoleLogHandler, Logger, ServerConnector} = require('../../index')

describe('EyesVisualGrid', async () => {
  let server, serverUrl, driver, eyes

  before(async () => {
    server = await startFakeEyesServer({
      logger: new Logger(process.env.APPLITOOLS_SHOW_LOGS),
      matchMode: 'always',
    })
    serverUrl = `http://localhost:${server.port}`
  })

  beforeEach(async () => {
    driver = new MockDriver()
    eyes = new EyesVisualGrid()
    if (process.env.APPLITOOLS_SHOW_LOGS) {
      eyes.setLogHandler(new ConsoleLogHandler(true))
    }
    eyes.setServerUrl(serverUrl)
  })

  after(async () => {
    await server.close()
  })

  it('should use default match level', async () => {
    await eyes.open(driver, 'FakeApp', 'FakeTest')
    await eyes.check()
    const results = await eyes.close()
    const {matchLevel} = await extractMatchSettings(results)
    expect(matchLevel).to.be.eql('Strict')
  })

  it('should use specified match level', async () => {
    await eyes.open(driver, 'FakeApp', 'FakeTest')
    await eyes.check({matchLevel: MatchLevel.Layout})
    const results = await eyes.close()
    const {matchLevel} = await extractMatchSettings(results)
    expect(matchLevel).to.be.eql('Layout')
  })

  it('should return original render request', async () => {
    const config = eyes.getConfiguration()
    config.addBrowser({width: 888, height: 777, name: 'firefox'})
    eyes.setConfiguration(config)
    await eyes.open(driver, 'FakeApp', 'FakeTest')
    await eyes.check({matchLevel: MatchLevel.Layout})
    const results = await eyes.close()
    const {startInfo} = await getSession(results, serverUrl)
    const {
      environment: {originalRenderRequest},
    } = startInfo
    const {browser, renderInfo} = JSON.parse(originalRenderRequest)
    expect(browser).to.deep.equal({name: 'firefox'})
    expect(renderInfo).to.deep.equal({width: 888, height: 777, sizeMode: 'viewport'})
  })

  it('should not create session with missing device size', async () => {
    const origStartSession = ServerConnector.prototype.startSession
    let startSessionCalled
    ServerConnector.prototype.startSession = async () => {
      startSessionCalled = true
    }
    const conf = eyes.getConfiguration()
    conf.addBrowser({deviceName: 'non-existent'})
    eyes.setConfiguration(conf)
    await eyes.open(driver, 'FakeApp', 'FakeTest')
    await eyes.check({matchLevel: MatchLevel.Layout})
    const err = await eyes.close().catch(err => err)
    ServerConnector.prototype.startSession = origStartSession
    expect(startSessionCalled).to.be.undefined
    expect(err.message).to.contain('failed to render screenshot')
  })

  it('should throw an error when dom snapshot returns an error', async () => {
    driver.mockScript('dom-snapshot', () => JSON.stringify({status: 'ERROR', error: 'bla'}))
    await eyes.open(driver, 'FakeApp', 'FakeTest')
    const err = await eyes.check().catch(err => err)
    expect(err.message).to.equal("Error during execute poll script: 'bla'")
  })

  it('should throw an error on invalid dom snapshot JSON', async () => {
    const response = Array.from({length: 200}, (_x, i) => i).join('')
    driver.mockScript('dom-snapshot', () => response)
    await eyes.open(driver, 'FakeApp', 'FakeTest')
    const err = await eyes.check().catch(err => err)
    expect(err.message).to.contain(
      `Response is not a valid JSON string. length: ${
        response.length
      }, first 100 chars: "${response.substr(0, 100)}", last 100 chars: "${response.substr(
        -100,
      )}". error: SyntaxError: Unexpected number in JSON at position 1`,
    )
  })

  it('should populate agentRunId', async () => {
    await eyes.open(driver, 'FakeApp', 'FakeTest')
    await eyes.check()
    const results = await eyes.close()
    const session = await getSession(results, serverUrl)
    const agentRunId = session.startInfo.agentRunId
    const [testName, random] = agentRunId.split('--')
    expect(testName).to.equal('FakeTest')
    expect(random).to.have.length(10)
  })

  async function extractMatchSettings(results) {
    const session = await getSession(results, serverUrl)
    const imageMatchSettings = session.steps[0].matchWindowData.options.imageMatchSettings
    return imageMatchSettings
  }
})
