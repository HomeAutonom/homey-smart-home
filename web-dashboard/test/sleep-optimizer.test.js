'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const SleepOptimizer = require('../sleep-optimizer');

describe('SleepOptimizer', () => {
  let mod;
  const mockApp = {};

  beforeEach(() => {
    mod = new SleepOptimizer(mockApp);
  });

  afterEach(() => {
    mod.destroy();
  });

  describe('constructor', () => {
    it('initializes _intervals as empty array', () => {
      assert.ok(Array.isArray(mod._intervals));
      assert.strictEqual(mod._intervals.length, 0);
    });

    it('initializes _timeouts as empty array', () => {
      assert.ok(Array.isArray(mod._timeouts));
      assert.strictEqual(mod._timeouts.length, 0);
    });

    it('initializes empty profiles map', () => {
      assert.ok(mod.profiles instanceof Map);
      assert.strictEqual(mod.profiles.size, 0);
    });

    it('initializes empty sleepSessions array', () => {
      assert.ok(Array.isArray(mod.sleepSessions));
      assert.strictEqual(mod.sleepSessions.length, 0);
    });

    it('initializes currentSession as null', () => {
      assert.strictEqual(mod.currentSession, null);
    });

    it('initializes wakeupRoutines map', () => {
      assert.ok(mod.wakeupRoutines instanceof Map);
    });
  });

  describe('initialize', () => {
    it('loads 3 user profiles', async () => {
      await mod.initialize();
      assert.strictEqual(mod.profiles.size, 3);
    });

    it('loads Magnus profile with correct settings', async () => {
      await mod.initialize();
      const magnus = mod.profiles.get('user_1');
      assert.ok(magnus);
      assert.strictEqual(magnus.userName, 'Magnus');
      assert.strictEqual(magnus.preferences.bedtime, '22:30');
      assert.strictEqual(magnus.preferences.wakeTime, '06:30');
      assert.strictEqual(magnus.preferences.temperature.initial, 19);
    });

    it('loads Anna profile', async () => {
      await mod.initialize();
      const anna = mod.profiles.get('user_2');
      assert.ok(anna);
      assert.strictEqual(anna.userName, 'Anna');
      assert.strictEqual(anna.preferences.bedtime, '23:00');
      assert.strictEqual(anna.preferences.wakeTime, '07:00');
      assert.strictEqual(anna.preferences.temperature.initial, 18);
    });

    it('loads Emma child profile', async () => {
      await mod.initialize();
      const emma = mod.profiles.get('user_3');
      assert.ok(emma);
      assert.strictEqual(emma.userName, 'Emma');
      assert.strictEqual(emma.preferences.bedtime, '21:00');
      assert.strictEqual(emma.preferences.wakeTime, '07:00');
      assert.strictEqual(emma.preferences.sleepDuration, 10);
    });

    it('loads wakeup routines', async () => {
      await mod.initialize();
      assert.ok(mod.wakeupRoutines.size >= 2);
    });

    it('loads gentle wakeup routine', async () => {
      await mod.initialize();
      const gentle = mod.wakeupRoutines.get('gentle');
      assert.ok(gentle);
      assert.strictEqual(gentle.name, 'Mjuk väckning');
      assert.strictEqual(gentle.duration, 30);
    });

    it('loads quick wakeup routine', async () => {
      await mod.initialize();
      const quick = mod.wakeupRoutines.get('quick');
      assert.ok(quick);
      assert.strictEqual(quick.name, 'Snabb väckning');
      assert.strictEqual(quick.duration, 10);
    });

    it('initializes profile stats', async () => {
      await mod.initialize();
      const magnus = mod.profiles.get('user_1');
      assert.strictEqual(magnus.sleepDebt, 0);
      assert.strictEqual(magnus.averageSleepQuality, 0);
      assert.strictEqual(magnus.totalNights, 0);
    });

    it('starts intervals', async () => {
      await mod.initialize();
      assert.ok(mod._intervals.length > 0);
    });
  });

  describe('getAllProfiles', () => {
    it('returns 3 profiles', async () => {
      await mod.initialize();
      const profiles = mod.getAllProfiles();
      assert.ok(Array.isArray(profiles));
      assert.strictEqual(profiles.length, 3);
    });
  });

  describe('getSleepSummary', () => {
    it('returns error when no sleep data', async () => {
      await mod.initialize();
      const summary = mod.getSleepSummary('user_1');
      assert.ok(summary);
      assert.strictEqual(summary.error, 'No sleep data available');
    });

    it('accepts days parameter', async () => {
      await mod.initialize();
      const summary = mod.getSleepSummary('user_1', 14);
      assert.ok(summary);
    });
  });

  describe('getLastNight', () => {
    it('returns error when no recent data', async () => {
      await mod.initialize();
      const result = mod.getLastNight('user_1');
      assert.ok(result);
      assert.strictEqual(result.error, 'No recent sleep data');
    });
  });

  describe('getSleepTrends', () => {
    it('returns trends object', async () => {
      await mod.initialize();
      const trends = mod.getSleepTrends('user_1');
      assert.ok(trends);
    });
  });

  describe('getSleepTips', () => {
    it('returns tips object', async () => {
      await mod.initialize();
      const tips = mod.getSleepTips();
      assert.ok(tips);
    });

    it('has 4 categories', async () => {
      await mod.initialize();
      const tips = mod.getSleepTips();
      const categories = Array.isArray(tips) 
        ? [...new Set(tips.map(t => t.category))]
        : Object.keys(tips);
      assert.strictEqual(categories.length, 4);
    });

    it('includes Miljö category', async () => {
      await mod.initialize();
      const tips = mod.getSleepTips();
      if (Array.isArray(tips)) {
        assert.ok(tips.some(t => t.category === 'Miljö'));
      } else {
        assert.ok('Miljö' in tips || 'miljo' in tips);
      }
    });
  });

  describe('destroy', () => {
    it('clears all intervals', async () => {
      await mod.initialize();
      assert.ok(mod._intervals.length > 0);
      mod.destroy();
      assert.strictEqual(mod._intervals.length, 0);
    });

    it('clears all timeouts', async () => {
      await mod.initialize();
      mod.destroy();
      assert.strictEqual(mod._timeouts.length, 0);
    });
  });
});
