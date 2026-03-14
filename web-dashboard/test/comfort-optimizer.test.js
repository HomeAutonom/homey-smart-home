'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const ComfortOptimizer = require('../comfort-optimizer');

describe('ComfortOptimizer', () => {
  let mod;
  const mockApp = { emit: () => {} };

  beforeEach(() => {
    mod = new ComfortOptimizer(mockApp);
  });

  afterEach(() => {
    mod.destroy();
  });

  describe('constructor', () => {
    it('initializes with empty zone map', () => {
      assert.ok(mod.zones instanceof Map);
      assert.strictEqual(mod.zones.size, 0);
    });

    it('initializes with empty comfort profiles map', () => {
      assert.ok(mod.comfortProfiles instanceof Map);
      assert.strictEqual(mod.comfortProfiles.size, 0);
    });

    it('has default preferences with temperature range', () => {
      assert.ok(mod.preferences);
      assert.ok(mod.preferences.temperature);
      assert.ok(typeof mod.preferences.temperature.min === 'number');
      assert.ok(typeof mod.preferences.temperature.max === 'number');
      assert.ok(typeof mod.preferences.temperature.ideal === 'number');
    });

    it('has humidity range preferences', () => {
      assert.ok(mod.preferences.humidity);
      assert.ok(typeof mod.preferences.humidity.min === 'number');
      assert.ok(typeof mod.preferences.humidity.max === 'number');
    });

    it('has an empty _intervals array', () => {
      assert.ok(Array.isArray(mod._intervals));
      assert.strictEqual(mod._intervals.length, 0);
    });
  });

  describe('initialize', () => {
    it('starts intervals', async () => {
      await mod.initialize();
      assert.ok(mod._intervals.length > 0);
    });

    it('loads comfort profiles', async () => {
      await mod.initialize();
      assert.ok(mod.comfortProfiles.size > 0);
    });
  });

  describe('scoreParameter', () => {
    it('returns 100 for value at ideal', () => {
      const score = mod.scoreParameter(22, 18, 26, 22);
      assert.strictEqual(score, 100);
    });

    it('returns high score for value within range', () => {
      const score = mod.scoreParameter(20, 18, 26, 22);
      assert.ok(score >= 80);
      assert.ok(score <= 100);
    });

    it('returns lower score for value below min', () => {
      const score = mod.scoreParameter(10, 18, 26, 22);
      assert.ok(score < 80);
    });

    it('returns lower score for value above max', () => {
      const score = mod.scoreParameter(35, 18, 26, 22);
      assert.ok(score < 80);
    });

    it('never returns below 0', () => {
      const score = mod.scoreParameter(-50, 18, 26, 22);
      assert.ok(score >= 0);
    });
  });

  describe('getActiveProfile', () => {
    it('returns undefined when profiles not loaded', () => {
      const profile = mod.getActiveProfile();
      assert.strictEqual(profile, undefined);
    });

    it('returns a profile object after initialize', async () => {
      await mod.initialize();
      const profile = mod.getActiveProfile();
      assert.ok(profile);
      assert.ok(typeof profile === 'object');
      assert.ok(profile.name);
    });
  });

  describe('setActiveProfile', () => {
    it('sets a known profile after initialize', async () => {
      await mod.initialize();
      const result = await mod.setActiveProfile('sleep');
      assert.strictEqual(result.success, true);
      assert.ok(result.profile);
    });

    it('fails for unknown profile', async () => {
      await mod.initialize();
      const result = await mod.setActiveProfile('nonexistent');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Profile not found');
    });
  });

  describe('getComfortReport', () => {
    it('returns report with overall section', async () => {
      await mod.initialize();
      const report = await mod.getComfortReport();
      assert.ok(report.overall);
      assert.ok('averageComfort' in report.overall);
      assert.ok('zonesOptimal' in report.overall);
      assert.ok('zonesNeedAttention' in report.overall);
      assert.ok('activeIssues' in report.overall);
    });

    it('includes active profile', async () => {
      await mod.initialize();
      const report = await mod.getComfortReport();
      assert.ok(report.activeProfile);
    });

    it('includes zones array', async () => {
      await mod.initialize();
      const report = await mod.getComfortReport();
      assert.ok(Array.isArray(report.zones));
    });
  });

  describe('getZoneDetails', () => {
    it('returns error for unknown zone', async () => {
      const result = await mod.getZoneDetails('fake-zone');
      assert.ok(result.error);
      assert.strictEqual(result.error, 'Zone not found');
    });
  });

  describe('calculateComfortScores', () => {
    it('returns undefined (void) without zones', () => {
      const result = mod.calculateComfortScores();
      assert.strictEqual(result, undefined);
    });
  });

  describe('destroy', () => {
    it('clears all intervals', async () => {
      await mod.initialize();
      assert.ok(mod._intervals.length > 0);
      mod.destroy();
      assert.strictEqual(mod._intervals.length, 0);
    });
  });
});
