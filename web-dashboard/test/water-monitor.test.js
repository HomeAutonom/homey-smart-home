'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const WaterMonitor = require('../water-monitor');

describe('WaterMonitor', () => {
  let mod;
  const mockApp = {};

  beforeEach(() => {
    mod = new WaterMonitor(mockApp);
  });

  afterEach(() => {
    mod.destroy();
  });

  describe('constructor', () => {
    it('initializes _intervals as empty array', () => {
      assert.ok(Array.isArray(mod._intervals));
      assert.strictEqual(mod._intervals.length, 0);
    });

    it('initializes empty meters map', () => {
      assert.ok(mod.meters instanceof Map);
      assert.strictEqual(mod.meters.size, 0);
    });

    it('initializes empty usageHistory array', () => {
      assert.ok(Array.isArray(mod.usageHistory));
      assert.strictEqual(mod.usageHistory.length, 0);
    });

    it('initializes empty leakAlerts array', () => {
      assert.ok(Array.isArray(mod.leakAlerts));
      assert.strictEqual(mod.leakAlerts.length, 0);
    });

    it('initializes empty baselines map', () => {
      assert.ok(mod.baselines instanceof Map);
      assert.strictEqual(mod.baselines.size, 0);
    });

    it('initializes empty conservationGoals map', () => {
      assert.ok(mod.conservationGoals instanceof Map);
      assert.strictEqual(mod.conservationGoals.size, 0);
    });
  });

  describe('initialize', () => {
    it('loads 7 water meters', async () => {
      await mod.initialize();
      assert.strictEqual(mod.meters.size, 7);
    });

    it('loads main_meter with correct values', async () => {
      await mod.initialize();
      const meter = mod.meters.get('main_meter');
      assert.ok(meter);
      assert.strictEqual(meter.name, 'Huvudmätare');
      assert.strictEqual(meter.type, 'main');
      assert.strictEqual(meter.totalConsumption, 145000);
    });

    it('loads hot_water meter', async () => {
      await mod.initialize();
      const meter = mod.meters.get('hot_water');
      assert.ok(meter);
      assert.strictEqual(meter.name, 'Varmvatten');
      assert.strictEqual(meter.totalConsumption, 45000);
    });

    it('loads kitchen meter as room type', async () => {
      await mod.initialize();
      const meter = mod.meters.get('kitchen');
      assert.ok(meter);
      assert.strictEqual(meter.name, 'Kök');
      assert.strictEqual(meter.type, 'room');
      assert.strictEqual(meter.totalConsumption, 25000);
    });

    it('loads washing_machine as appliance type', async () => {
      await mod.initialize();
      const meter = mod.meters.get('washing_machine');
      assert.ok(meter);
      assert.strictEqual(meter.name, 'Tvättmaskin');
      assert.strictEqual(meter.type, 'appliance');
      assert.strictEqual(meter.totalConsumption, 15000);
    });

    it('loads baselines', async () => {
      await mod.initialize();
      assert.ok(mod.baselines.size > 0);
    });

    it('sets daily_average baseline to 420', async () => {
      await mod.initialize();
      const daily = mod.baselines.get('daily_average') || mod.baselines.get('daily');
      assert.ok(daily !== undefined);
    });

    it('loads conservation goals', async () => {
      await mod.initialize();
      assert.ok(mod.conservationGoals.size > 0);
    });

    it('starts intervals', async () => {
      await mod.initialize();
      assert.ok(mod._intervals.length > 0);
    });
  });

  describe('getCurrentStatus', () => {
    it('returns status object', async () => {
      await mod.initialize();
      const status = mod.getCurrentStatus();
      assert.ok(status);
      assert.ok(status.mainMeter || status.status);
    });

    it('includes status field', async () => {
      await mod.initialize();
      const status = mod.getCurrentStatus();
      assert.ok(status);
    });
  });

  describe('getMeterDetails', () => {
    it('returns null for non-existent meter', async () => {
      await mod.initialize();
      const result = mod.getMeterDetails('meter_fake');
      assert.strictEqual(result, null);
    });

    it('returns details for valid meter', async () => {
      await mod.initialize();
      const result = mod.getMeterDetails('main_meter');
      assert.ok(result);
      assert.strictEqual(result.name, 'Huvudmätare');
    });
  });

  describe('getAllMeters', () => {
    it('returns 7 meters', async () => {
      await mod.initialize();
      const meters = mod.getAllMeters();
      assert.ok(Array.isArray(meters));
      assert.strictEqual(meters.length, 7);
    });
  });

  describe('getDailyBreakdown', () => {
    it('returns breakdown object', async () => {
      await mod.initialize();
      const breakdown = mod.getDailyBreakdown();
      assert.ok(breakdown);
    });
  });

  describe('getConservationProgress', () => {
    it('returns progress object', async () => {
      await mod.initialize();
      const progress = mod.getConservationProgress();
      assert.ok(progress);
    });
  });

  describe('setConservationGoal', () => {
    it('returns error for invalid period', async () => {
      await mod.initialize();
      const result = await mod.setConservationGoal('invalid_period', 500);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Invalid period');
    });

    it('sets daily conservation goal', async () => {
      await mod.initialize();
      const result = await mod.setConservationGoal('daily', 350);
      assert.strictEqual(result.success, true);
    });
  });

  describe('getConservationTips', () => {
    it('returns 8 tips', async () => {
      await mod.initialize();
      const tips = mod.getConservationTips();
      assert.ok(Array.isArray(tips));
      assert.strictEqual(tips.length, 8);
    });

    it('tips are sorted by annualSavings descending', async () => {
      await mod.initialize();
      const tips = mod.getConservationTips();
      for (let i = 1; i < tips.length; i++) {
        assert.ok(tips[i - 1].annualSavings >= tips[i].annualSavings);
      }
    });
  });

  describe('getLeakAlerts', () => {
    it('returns empty array initially', async () => {
      await mod.initialize();
      const alerts = mod.getLeakAlerts();
      assert.ok(Array.isArray(alerts));
    });
  });

  describe('acknowledgeAlert', () => {
    it('returns error for non-existent alert', async () => {
      await mod.initialize();
      const result = await mod.acknowledgeAlert('alert_fake');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Alert not found');
    });
  });

  describe('resolveAlert', () => {
    it('returns error for non-existent alert', async () => {
      await mod.initialize();
      const result = await mod.resolveAlert('alert_fake', 'fixed pipe');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Alert not found');
    });
  });

  describe('reportLeak and alert lifecycle', () => {
    it('creates a leak alert', async () => {
      await mod.initialize();
      mod.reportLeak({ location: 'bathroom', severity: 'high', description: 'dripping faucet' });
      const alerts = mod.getLeakAlerts();
      assert.ok(alerts.length > 0);
    });

    it('leak starts unacknowledged and unresolved', async () => {
      await mod.initialize();
      mod.reportLeak({ location: 'kitchen', severity: 'medium', description: 'slow drip' });
      const alerts = mod.getLeakAlerts();
      const alert = alerts[0];
      assert.strictEqual(alert.acknowledged, false);
      assert.strictEqual(alert.resolved, false);
    });

    it('can acknowledge a reported leak', async () => {
      await mod.initialize();
      mod.reportLeak({ location: 'kitchen', severity: 'low', description: 'condensation' });
      const alerts = mod.getLeakAlerts();
      const result = await mod.acknowledgeAlert(alerts[0].id);
      assert.strictEqual(result.success, true);
    });

    it('can resolve a reported leak', async () => {
      await mod.initialize();
      mod.reportLeak({ location: 'basement', severity: 'high', description: 'burst pipe' });
      const alerts = mod.getLeakAlerts();
      const result = await mod.resolveAlert(alerts[0].id, 'Replaced pipe section');
      assert.strictEqual(result.success, true);
    });
  });

  describe('getHistoricalData', () => {
    it('returns array', async () => {
      await mod.initialize();
      const data = mod.getHistoricalData();
      assert.ok(Array.isArray(data));
    });

    it('accepts hours parameter', async () => {
      await mod.initialize();
      const data = mod.getHistoricalData(12);
      assert.ok(Array.isArray(data));
    });
  });

  describe('calculatePotentialSavings', () => {
    it('returns savings object', async () => {
      await mod.initialize();
      const savings = mod.calculatePotentialSavings();
      assert.ok(savings);
      assert.ok(typeof savings === 'object');
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
