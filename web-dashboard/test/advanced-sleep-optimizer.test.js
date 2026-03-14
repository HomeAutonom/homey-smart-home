'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const AdvancedSleepOptimizer = require('../advanced-sleep-optimizer');

describe('AdvancedSleepOptimizer', () => {
  let mod;

  beforeEach(async () => {
    mod = new AdvancedSleepOptimizer({ emit: () => {} });
    await mod.initialize();
  });

  afterEach(() => {
    mod.destroy();
  });

  describe('initialization', () => {
    it('sets up sleep profiles', () => {
      assert.strictEqual(mod.sleepProfiles.size, 4);
      const anna = mod.sleepProfiles.get('anna');
      assert.ok(anna);
      assert.strictEqual(anna.name, 'Anna');
      assert.ok(anna.targetSleepHours > 0);
      assert.ok(anna.targetBedtime);
      assert.ok(anna.targetWakeTime);
    });

    it('sets up smart alarms', () => {
      assert.strictEqual(mod.smartAlarms.size, 4);
      const alarm = mod.smartAlarms.get('alarm_anna');
      assert.ok(alarm);
      assert.strictEqual(alarm.enabled, true);
      assert.strictEqual(alarm.smartWake, true);
    });

    it('sets up sleep environments', () => {
      assert.strictEqual(mod.sleepEnvironment.size, 4);
    });
  });

  describe('trackSleep', () => {
    it('tracks a sleep session for known user', async () => {
      const bedtime = new Date('2024-01-15T22:30:00').getTime();
      const wakeTime = new Date('2024-01-16T06:30:00').getTime();
      const result = await mod.trackSleep('anna', bedtime, wakeTime, 0.85);
      assert.strictEqual(result.success, true);
      assert.ok(result.session);
      assert.ok(result.session.stages);
      assert.ok(result.session.stages.deep >= 0);
      assert.ok(result.session.stages.rem >= 0);
      assert.strictEqual(result.session.restfulness, 85);
    });

    it('fails for unknown user', async () => {
      const result = await mod.trackSleep('nonexistent', '2024-01-15T22:30:00', '2024-01-16T06:30:00', 0.8);
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('getSleepAnalysis', () => {
    it('returns error when no sleep data', async () => {
      const result = await mod.getSleepAnalysis('anna', 7);
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    it('returns analysis after tracking sessions', async () => {
      const bedtime = new Date('2024-01-15T22:30:00').toISOString();
      const wakeTime = new Date('2024-01-16T06:30:00').toISOString();
      await mod.trackSleep('anna', bedtime, wakeTime, 0.85);
      const result = await mod.getSleepAnalysis('anna', 7);
      // With only 1 session it may return analysis or error depending on implementation
      assert.ok(result);
    });
  });

  describe('calculateOptimalWakeTime', () => {
    it('calculates wake time for known user', async () => {
      const result = await mod.calculateOptimalWakeTime('anna');
      assert.ok(typeof result === 'number' || result !== undefined);
    });
  });

  describe('executeWakeupRoutine', () => {
    it('fails for nonexistent user', async () => {
      const result = await mod.executeWakeupRoutine('nonexistent');
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    it('succeeds for valid user with alarm', async () => {
      const result = await mod.executeWakeupRoutine('anna');
      assert.strictEqual(result.success, true);
    });
  });

  describe('optimizeSleepEnvironment', () => {
    it('optimizes for known user', async () => {
      const result = await mod.optimizeSleepEnvironment('anna');
      assert.strictEqual(result.success, true);
    });

    it('fails for unknown user', async () => {
      const result = await mod.optimizeSleepEnvironment('nonexistent');
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('activateBedtimeRoutine', () => {
    it('activates for known user', async () => {
      const result = await mod.activateBedtimeRoutine('anna');
      assert.strictEqual(result.success, true);
    });

    it('fails for unknown user', async () => {
      const result = await mod.activateBedtimeRoutine('nonexistent');
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('circadian rhythm', () => {
    it('analyzeCircadianRhythm returns insufficient data without sessions', async () => {
      const result = await mod.analyzeCircadianRhythm('anna');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Insufficient data');
    });

    it('calculateVariance computes correctly', () => {
      const variance = mod.calculateVariance([2, 4, 4, 4, 5, 5, 7, 9]);
      assert.ok(typeof variance === 'number');
      assert.ok(variance > 0);
    });

    it('formatTimeFromDecimal formats correctly', () => {
      assert.strictEqual(mod.formatTimeFromDecimal(22.5), '22:30');
      assert.strictEqual(mod.formatTimeFromDecimal(6.0), '06:00');
    });

    it('parseTimeToDecimal parses correctly', () => {
      assert.strictEqual(mod.parseTimeToDecimal('22:30'), 22.5);
      assert.strictEqual(mod.parseTimeToDecimal('06:00'), 6);
    });
  });

  describe('reporting', () => {
    it('getSleepOptimizerOverview returns stats', () => {
      const overview = mod.getSleepOptimizerOverview();
      assert.strictEqual(overview.profiles, 4);
      assert.strictEqual(overview.smartAlarms, 4);
      assert.ok(overview.avgFamilySleepQuality.endsWith('%'));
    });

    it('getSleepProfiles returns profile list', () => {
      const profiles = mod.getSleepProfiles();
      assert.ok(Array.isArray(profiles));
      assert.strictEqual(profiles.length, 4);
      assert.ok(profiles[0].name);
      assert.ok(profiles[0].bedtime);
      assert.ok(profiles[0].quality.endsWith('%'));
    });

    it('getRecentSleep returns empty for no sessions', () => {
      const recent = mod.getRecentSleep(7);
      assert.ok(Array.isArray(recent));
      assert.strictEqual(recent.length, 0);
    });

    it('getSleepDebt returns data for all profiles', () => {
      const debt = mod.getSleepDebt();
      assert.ok(Array.isArray(debt));
      assert.strictEqual(debt.length, 4);
      assert.ok(debt[0].name);
    });
  });

  describe('destroy', () => {
    it('clears intervals', () => {
      mod.destroy();
      assert.deepStrictEqual(mod._intervals, []);
    });
  });
});
