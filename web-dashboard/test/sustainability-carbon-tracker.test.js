'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const SustainabilityCarbonTracker = require('../sustainability-carbon-tracker');

describe('SustainabilityCarbonTracker', () => {
  let tracker;
  const mockApp = { log: () => {}, emit: () => {} };

  beforeEach(async () => {
    tracker = new SustainabilityCarbonTracker(mockApp);
    await tracker.initialize();
  });

  afterEach(() => {
    if (tracker && tracker.destroy) tracker.destroy();
  });

  describe('initialization', () => {
    it('sets up goals', () => {
      assert.ok(tracker.goals instanceof Map);
      assert.ok(tracker.goals.size >= 5);
    });

    it('loads historical energy data', () => {
      assert.ok(Array.isArray(tracker.energyData));
      assert.ok(tracker.energyData.length > 0);
    });

    it('initializes data arrays', () => {
      assert.ok(Array.isArray(tracker.waterData));
      assert.ok(Array.isArray(tracker.wasteData));
      assert.ok(Array.isArray(tracker.transportData));
    });

    it('initializes achievements array', () => {
      assert.ok(Array.isArray(tracker.achievements));
    });
  });

  describe('carbon calculators (sync)', () => {
    it('calculateElectricityCarbon for grid', () => {
      const result = tracker.calculateElectricityCarbon(100, 'grid');
      assert.strictEqual(typeof result, 'number');
      assert.ok(result > 0);
      // grid intensity is 0.041
      assert.ok(Math.abs(result - 100 * 0.041) < 0.01);
    });

    it('calculateElectricityCarbon for solar', () => {
      const result = tracker.calculateElectricityCarbon(100, 'solar');
      // solar intensity is 0.005
      assert.ok(Math.abs(result - 100 * 0.005) < 0.01);
    });

    it('calculateHeatingCarbon for district heating', () => {
      const result = tracker.calculateHeatingCarbon(100, 'district');
      assert.strictEqual(typeof result, 'number');
      // district intensity is 0.050
      assert.ok(Math.abs(result - 100 * 0.050) < 0.01);
    });

    it('calculateHeatingCarbon for heat pump', () => {
      const result = tracker.calculateHeatingCarbon(100, 'heatpump');
      // heatpump intensity is 0.015
      assert.ok(Math.abs(result - 100 * 0.015) < 0.01);
    });

    it('calculateWaterCarbon', () => {
      const result = tracker.calculateWaterCarbon(1000);
      assert.strictEqual(typeof result, 'number');
      // 0.3 per m³ = 0.0003 per liter, 1000L = 0.3
      assert.ok(result > 0);
    });

    it('calculateTransportCarbon for EV', () => {
      const result = tracker.calculateTransportCarbon(100, 'ev');
      assert.strictEqual(typeof result, 'number');
      // ev intensity is 0.005
      assert.ok(Math.abs(result - 100 * 0.005) < 0.01);
    });

    it('calculateFoodCarbon for beef', () => {
      const result = tracker.calculateFoodCarbon('beef', 1);
      assert.strictEqual(typeof result, 'number');
      // beef intensity is 27.0
      assert.ok(Math.abs(result - 27.0) < 0.1);
    });

    it('calculateWasteCarbon', () => {
      const result = tracker.calculateWasteCarbon(10, 'mixed');
      assert.strictEqual(typeof result, 'number');
      assert.ok(result > 0);
    });
  });

  describe('addEnergyData', () => {
    it('adds data and returns carbon calculation', async () => {
      const result = await tracker.addEnergyData({ electricity: 10, heating: 5 });
      assert.ok(result);
      assert.ok('timestamp' in result);
      assert.ok('carbon' in result);
      assert.strictEqual(typeof result.carbon, 'number');
    });
  });

  describe('addTransportTrip', () => {
    it('records a transport trip', async () => {
      await tracker.addTransportTrip(50, 'ev');
      // Method is void; verify side-effect on transportData
      assert.ok(tracker.transportData.length > 0);
    });
  });

  describe('calculateFootprint', () => {
    it('calculates daily footprint', async () => {
      const result = await tracker.calculateFootprint('daily');
      assert.ok(result);
      assert.strictEqual(result.period, 'daily');
      assert.ok('total' in result);
      assert.ok('breakdown' in result);
    });

    it('calculates weekly footprint', async () => {
      const result = await tracker.calculateFootprint('weekly');
      assert.ok(result);
      assert.strictEqual(result.period, 'weekly');
    });
  });

  describe('calculateDailyAverage', () => {
    it('returns a number', async () => {
      const avg = await tracker.calculateDailyAverage();
      assert.strictEqual(typeof avg, 'number');
    });
  });

  describe('getYearlyProjection', () => {
    it('returns projection with Swedish average', async () => {
      const result = await tracker.getYearlyProjection();
      assert.ok(result);
      assert.ok('projection' in result);
      assert.ok('dailyAverage' in result);
      assert.strictEqual(result.swedishAverage, 6000);
      assert.ok(['excellent', 'good', 'average', 'above average'].includes(result.status));
    });
  });

  describe('goal management', () => {
    it('updateGoalProgress succeeds for valid goal', async () => {
      const result = await tracker.updateGoalProgress('carbon_reduction', 50);
      assert.strictEqual(result.success, true);
      assert.ok(result.goal);
    });

    it('updateGoalProgress fails for invalid goal', async () => {
      const result = await tracker.updateGoalProgress('nonexistent', 50);
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    it('getGoalsReport returns 5 goals', () => {
      const report = tracker.getGoalsReport();
      assert.ok(Array.isArray(report));
      assert.strictEqual(report.length, 5);
      assert.ok('name' in report[0]);
      assert.ok('current' in report[0]);
      assert.ok('target' in report[0]);
      assert.ok('progress' in report[0]);
    });
  });

  describe('getSustainabilityScore', () => {
    it('returns score between 0 and 100', () => {
      const result = tracker.getSustainabilityScore();
      assert.ok(result);
      assert.strictEqual(typeof result.score, 'number');
      assert.ok(result.score >= 0 && result.score <= 100);
      assert.ok(result.rating);
      assert.ok(result.factors);
    });
  });

  describe('getRenewableEnergyStats', () => {
    it('returns renewable stats', async () => {
      const result = await tracker.getRenewableEnergyStats(7);
      assert.ok(result);
      assert.strictEqual(typeof result, 'object');
    });
  });

  describe('generateRecommendations', () => {
    it('returns recommendations array', async () => {
      const result = await tracker.generateRecommendations();
      assert.ok(Array.isArray(result));
    });
  });

  describe('generateWeeklyReport', () => {
    it('returns report with footprint and recommendations', async () => {
      const report = await tracker.generateWeeklyReport();
      assert.ok(report);
      assert.ok('footprint' in report);
      assert.ok('recommendations' in report);
    });
  });

  describe('getAchievements', () => {
    it('returns array', () => {
      const achievements = tracker.getAchievements();
      assert.ok(Array.isArray(achievements));
    });
  });

  describe('destroy', () => {
    it('clears intervals', () => {
      tracker.destroy();
      assert.deepStrictEqual(tracker._intervals, []);
    });
  });
});
