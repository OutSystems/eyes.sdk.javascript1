// re: Trello 222 -- https://trello.com/c/27KnVbXN
const assert = require('assert')
const chromedriver = require('chromedriver')
const {remote} = require('webdriverio')
const {Target} = require('../..')

describe('CheckSettings', () => {
  let driver

  before(async () => {
    await chromedriver.start([], true)
  })
  after(async () => {
    chromedriver.stop()
  })
  beforeEach(async () => {
    driver = await remote({
      capabilities: {
        browserName: 'chrome',
        'goog:chromeOptions': {
          args: ['disable-infobars', 'headless'],
        },
      },
      logLevel: 'error',
      port: 9515,
      path: '/',
    })
  })

  afterEach(async () => {
    await driver.deleteSession()
  })
  it.skip('specify region by wdio locator', () => {
    assert.ok(Target.window().ignore(driver.$('//XPATHmobileLocator')))
  })
})
