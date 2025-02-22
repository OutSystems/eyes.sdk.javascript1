'use strict';
const {describe, it} = require('mocha');
const {expect} = require('chai');
const makeConfig = require('../../../src/plugin/config');

describe('config', () => {
  it('should create eyes config', () => {
    const {eyesConfig} = makeConfig();
    expect(eyesConfig).to.deep.equal({
      eyesIsDisabled: false,
      eyesBrowser: undefined,
      eyesLayoutBreakpoints: undefined,
      eyesFailCypressOnDiff: true,
      eyesLegacyHooks: true,
      eyesDisableBrowserFetching: false,
      eyesTestConcurrency: 5,
    });
  });

  it('should work with env variables', () => {
    process.env.APPLITOOLS_IS_DISABLED = true;
    const {config, eyesConfig} = makeConfig();
    expect(config.isDisabled).to.be.true;
    expect(eyesConfig).to.deep.equal({
      eyesIsDisabled: true,
      eyesBrowser: undefined,
      eyesLayoutBreakpoints: undefined,
      eyesFailCypressOnDiff: true,
      eyesLegacyHooks: true,
      eyesDisableBrowserFetching: false,
      eyesTestConcurrency: 5,
    });
  });
});
