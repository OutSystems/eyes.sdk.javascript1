const {describe, it, before, after} = require('mocha');
const testStorybook = require('../util/testStorybook');
const path = require('path');
const {delay: _psetTimeout, presult} = require('@applitools/functional-commons');
const {sh} = require('@applitools/sdk-shared/src/process-commons');
const snap = require('@applitools/snaptdout');
const {version} = require('../../package.json');

describe('eyes-storybook', () => {
  let closeStorybook;
  before(async () => {
    closeStorybook = await testStorybook({
      port: 9001,
      storybookConfigDir: path.resolve(__dirname, '../fixtures/jsLayoutStorybook'),
    });
  });

  after(async () => await closeStorybook());

  it('renders with layout breakpoints in config', async () => {
    const [err, result] = await presult(
      sh(
        `node ${path.resolve(__dirname, '../../bin/eyes-storybook')} -f ${path.resolve(
          __dirname,
          'happy-config/layout-breakpoints-global.config.js',
        )}`,
        {
          spawnOptions: {stdio: 'pipe'},
        },
      ),
    );
    const stdout = err ? err.stdout : result.stdout;
    //const stderr = err ? err.stderr : result.stderr;
    const output = stdout
      .replace(/\/.*.bin\/start-storybook/, '<story-book path>')
      .replace(/Total time\: \d+ seconds/, 'Total time: <some_time> seconds')
      .replace(
        /See details at https\:\/\/.+.applitools.com\/app\/test-results\/.+/g,
        'See details at <some_url>',
      )
      .replace(version, '<version>');
    await snap(output, 'layout breakpoints config');
  });

  it('renders with layout breakpoints in story parameters', async () => {
    const [err, result] = await presult(
      sh(
        `node ${path.resolve(__dirname, '../../bin/eyes-storybook')} -f ${path.resolve(
          __dirname,
          'happy-config/layout-breakpoints-local.config.js',
        )}`,
        {
          spawnOptions: {stdio: 'pipe'},
        },
      ),
    );
    const stdout = err ? err.stdout : result.stdout;
    const output = stdout
      .replace(/\/.*.bin\/start-storybook/, '<story-book path>')
      .replace(/Total time\: \d+ seconds/, 'Total time: <some_time> seconds')
      .replace(
        /See details at https\:\/\/.+.applitools.com\/app\/test-results\/.+/g,
        'See details at <some_url>',
      )
      .replace(version, '<version>');
    //const stderr = err ? err.stderr : result.stderr;

    await snap(output, 'layoutBreakpoints in story params');
  });
});
