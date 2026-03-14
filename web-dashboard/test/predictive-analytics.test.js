'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const PredictiveAnalytics = require('../predictive-analytics');

describe('PredictiveAnalytics', () => {
  let mod;

  beforeEach(() => {
    mod = new PredictiveAnalytics();
  });

  describe('constructor', () => {
    it('initializes historicalData with arrays', () => {
      assert.ok(mod.historicalData);
      assert.ok(Array.isArray(mod.historicalData.energy));
      assert.ok(Array.isArray(mod.historicalData.temperature));
      assert.ok(Array.isArray(mod.historicalData.deviceUsage));
      assert.ok(Array.isArray(mod.historicalData.presence));
    });

    it('initializes forecasts as a Map', () => {
      assert.ok(mod.forecasts instanceof Map);
    });

    it('initializes empty anomalies array', () => {
      assert.ok(Array.isArray(mod.anomalies));
      assert.strictEqual(mod.anomalies.length, 0);
    });

    it('initializes empty insights array', () => {
      assert.ok(Array.isArray(mod.insights));
      assert.strictEqual(mod.insights.length, 0);
    });
  });

  describe('detectTrend', () => {
    it('returns stable direction for empty data', () => {
      const result = mod.detectTrend([]);
      assert.strictEqual(result.direction, 'stable');
      assert.strictEqual(result.change, 0);
    });

    it('detects increasing trend', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = mod.detectTrend(data);
      assert.strictEqual(result.direction, 'increasing');
      assert.ok(result.slope > 0);
    });

    it('detects decreasing trend', () => {
      const data = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
      const result = mod.detectTrend(data);
      assert.strictEqual(result.direction, 'decreasing');
      assert.ok(result.slope < 0);
    });

    it('returns stable for constant data', () => {
      const data = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
      const result = mod.detectTrend(data);
      assert.strictEqual(result.direction, 'stable');
      assert.strictEqual(result.slope, 0);
    });

    it('result has direction, change, and slope', () => {
      const result = mod.detectTrend([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      assert.strictEqual(typeof result.direction, 'string');
      assert.strictEqual(typeof result.change, 'number');
      assert.strictEqual(typeof result.slope, 'number');
    });
  });

  describe('predictNextHour', () => {
    it('returns prediction object with energy data', () => {
      const energyData = Array.from({ length: 48 }, (_, i) => 100 + Math.sin(i) * 20);
      const result = mod.predictNextHour(energyData);
      assert.strictEqual(typeof result, 'object');
      assert.ok('prediction' in result);
      assert.ok('confidence' in result);
    });
  });

  describe('predictToday', () => {
    it('returns prediction object with energy data', () => {
      const energyData = Array.from({ length: 48 }, (_, i) => 100 + Math.sin(i) * 20);
      const result = mod.predictToday(energyData);
      assert.strictEqual(typeof result, 'object');
      assert.ok('prediction' in result);
      assert.ok('consumedSoFar' in result);
    });
  });

  describe('identifyPeakHours', () => {
    it('returns an array with energy data', () => {
      const energyData = Array.from({ length: 240 }, (_, i) => {
        const hour = i % 24;
        return hour >= 17 && hour <= 21 ? 500 : 100;
      });
      const result = mod.identifyPeakHours(energyData);
      assert.ok(Array.isArray(result));
    });

    it('each peak has hour and consumption', () => {
      const energyData = Array.from({ length: 240 }, (_, i) => {
        const hour = i % 24;
        return hour >= 17 && hour <= 21 ? 500 : 100;
      });
      const result = mod.identifyPeakHours(energyData);
      for (const peak of result) {
        assert.strictEqual(typeof peak.hour, 'number');
        assert.ok(peak.hour >= 0 && peak.hour <= 23);
        assert.strictEqual(typeof peak.consumption, 'number');
      }
    });
  });

  describe('identifySavingOpportunities', () => {
    it('returns an array with empty data', () => {
      const result = mod.identifySavingOpportunities({});
      assert.ok(Array.isArray(result));
    });

    it('returns an array with devices data', () => {
      const data = {
        devices: {
          light1: {
            name: 'Test Light',
            id: 'light1',
            class: 'light',
            capabilitiesObj: {
              onoff: { value: true },
              measure_power: { value: 60 }
            }
          }
        },
        presence: false
      };
      const result = mod.identifySavingOpportunities(data);
      assert.ok(Array.isArray(result));
      assert.ok(result.length > 0);
    });
  });

  describe('calculateCurrentConsumption', () => {
    it('returns consumption object with empty devices', () => {
      const result = mod.calculateCurrentConsumption({ devices: {} });
      assert.strictEqual(typeof result, 'object');
      assert.strictEqual(typeof result.watts, 'number');
      assert.strictEqual(typeof result.kilowatts, 'number');
    });

    it('sums device power correctly', () => {
      const data = {
        devices: {
          d1: { capabilitiesObj: { measure_power: { value: 100 } } },
          d2: { capabilitiesObj: { measure_power: { value: 200 } } }
        }
      };
      const result = mod.calculateCurrentConsumption(data);
      assert.strictEqual(result.watts, 300);
    });
  });
});
