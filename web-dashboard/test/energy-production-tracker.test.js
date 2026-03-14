'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const EnergyProductionTracker = require('../energy-production-tracker');

describe('EnergyProductionTracker', () => {
  let mod;

  beforeEach(async () => {
    mod = new EnergyProductionTracker({ emit: () => {} });
    await mod.initialize();
  });

  afterEach(() => {
    mod.destroy();
  });

  describe('initialization', () => {
    it('loads production sources', () => {
      assert.strictEqual(mod.productionSources.size, 3);
      assert.ok(mod.productionSources.has('solar'));
      assert.ok(mod.productionSources.has('battery'));
      assert.ok(mod.productionSources.has('grid'));
    });

    it('sets up solar source correctly', () => {
      const solar = mod.productionSources.get('solar');
      assert.strictEqual(solar.capacity, 8.5);
      assert.strictEqual(solar.panelCount, 20);
      assert.strictEqual(solar.efficiency, 0.85);
    });

    it('sets up battery source correctly', () => {
      const battery = mod.productionSources.get('battery');
      assert.strictEqual(battery.capacity, 13.5);
      assert.ok(battery.currentCharge >= 0);
    });

    it('sets up grid source correctly', () => {
      const grid = mod.productionSources.get('grid');
      assert.strictEqual(grid.importPrice, 1.85);
      assert.strictEqual(grid.exportPrice, 0.65);
    });
  });

  describe('calculateSolarProduction', () => {
    it('returns 0 at night', () => {
      const production = mod.calculateSolarProduction(3, 6);
      assert.strictEqual(production, 0);
    });

    it('returns 0 late at night', () => {
      const production = mod.calculateSolarProduction(22, 6);
      assert.strictEqual(production, 0);
    });

    it('produces energy during day', () => {
      const production = mod.calculateSolarProduction(12, 6);
      assert.ok(production > 0);
    });
  });

  describe('calculateBalance', () => {
    it('calculates and stores balance data', async () => {
      const initialLength = mod.balanceData.length;
      await mod.calculateBalance();
      assert.ok(mod.balanceData.length > initialLength);
    });
  });

  describe('getLatestConsumption', () => {
    it('returns 0 when no history', () => {
      mod.consumptionHistory = [];
      assert.strictEqual(mod.getLatestConsumption(), 0);
    });

    it('returns last value when history exists', () => {
      mod.consumptionHistory.push({ value: 3.5, timestamp: Date.now() });
      assert.strictEqual(mod.getLatestConsumption(), 3.5);
    });
  });

  describe('updateForecasts', () => {
    it('generates 24-hour forecasts', async () => {
      await mod.updateForecasts();
      assert.ok(mod.forecasts.length > 0);
      const f = mod.forecasts[0];
      assert.ok('production' in f);
      assert.ok('consumption' in f);
      assert.ok('balance' in f);
      assert.ok('recommendation' in f);
    });
  });

  describe('getRecommendation', () => {
    it('returns surplus recommendation for positive balance', () => {
      const rec = mod.getRecommendation(5, 12);
      assert.strictEqual(rec.type, 'surplus');
      assert.ok(rec.message);
    });

    it('returns deficit recommendation for negative balance', () => {
      const rec = mod.getRecommendation(-3, 18);
      assert.strictEqual(rec.type, 'deficit');
      assert.ok(rec.message);
    });

    it('returns balanced recommendation for zero', () => {
      const rec = mod.getRecommendation(0, 12);
      assert.strictEqual(rec.type, 'balanced');
    });
  });

  describe('optimizeUsage', () => {
    it('returns recommendations array', async () => {
      await mod.updateForecasts();
      const recs = await mod.optimizeUsage();
      assert.ok(Array.isArray(recs));
    });
  });

  describe('scheduleDeviceUsage', () => {
    it('returns recommended time', async () => {
      await mod.updateForecasts();
      const result = await mod.scheduleDeviceUsage('washer_1', 2, 1.5);
      assert.strictEqual(result.success, true);
      assert.ok(result.recommendedTime);
      assert.ok(result.reason);
    });
  });

  describe('isPeakHour', () => {
    it('detects morning peak', () => {
      assert.strictEqual(mod.isPeakHour(8), true);
    });

    it('detects evening peak', () => {
      assert.strictEqual(mod.isPeakHour(18), true);
    });

    it('detects off-peak', () => {
      assert.strictEqual(mod.isPeakHour(12), false);
    });
  });

  describe('reporting', () => {
    it('getCurrentStatus returns status object', () => {
      const status = mod.getCurrentStatus();
      assert.ok(status.production);
      assert.ok(status.consumption);
      assert.ok(status.balance);
      assert.ok(status.battery);
      assert.ok(status.grid);
    });

    it('getDailyStats returns stats', () => {
      const stats = mod.getDailyStats();
      assert.ok('production' in stats);
      assert.ok('consumption' in stats);
      assert.ok('selfSufficiency' in stats);
    });

    it('getFinancialReport returns cost data', () => {
      const report = mod.getFinancialReport();
      assert.ok(report.costs);
      assert.ok(report.savings);
      assert.ok(report.roi);
      assert.strictEqual(report.roi.installationCost, 150000);
    });

    it('getForecasts returns formatted forecasts', async () => {
      await mod.updateForecasts();
      const forecasts = mod.getForecasts(24);
      assert.ok(Array.isArray(forecasts));
      assert.ok(forecasts.length > 0);
      assert.ok(forecasts[0].time);
      assert.ok(forecasts[0].recommendation);
    });

    it('getHistoricalData returns filtered data', () => {
      const data = mod.getHistoricalData(24);
      assert.ok(Array.isArray(data));
    });
  });

  describe('logging', () => {
    it('logProduction adds and trims', () => {
      for (let i = 0; i < 300; i++) {
        mod.logProduction({ value: i, timestamp: Date.now() });
      }
      assert.ok(mod.productionHistory.length <= 288);
    });

    it('logConsumption adds and trims', () => {
      for (let i = 0; i < 300; i++) {
        mod.logConsumption({ value: i, timestamp: Date.now() });
      }
      assert.ok(mod.consumptionHistory.length <= 288);
    });
  });

  describe('destroy', () => {
    it('clears intervals', () => {
      mod.destroy();
      assert.deepStrictEqual(mod._intervals, []);
    });
  });
});
