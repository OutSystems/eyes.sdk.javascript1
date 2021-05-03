'use strict';
const {describe, it} = require('mocha');
const {expect} = require('chai');
const shouldSetGlobalHooks = require('../../../src/plugin/shouldSetGlobalHooks');

describe('shouldSetGlobalHooks', () => {
  it('should return false if eyesLegacyHooks flag is set', () => {
    expect(shouldSetGlobalHooks({eyesLegacyHooks: true})).to.be.false;
  });

  it('should return true if version > 6.2.0 and experimentalRunEvents flag is set', () => {
    expect(shouldSetGlobalHooks({version: '6.2.0', experimentalRunEvents: true})).to.be.true;
  });

  it('should return true if version > 6.7.0', () => {
    expect(shouldSetGlobalHooks({version: '6.7.0'})).to.be.true;
  });

  it('should return false even if version > 6.7.0 but using eyesLegacyHooks', () => {
    expect(shouldSetGlobalHooks({version: '6.7.0', eyesLegacyHooks: true})).to.be.false;
  });
});
