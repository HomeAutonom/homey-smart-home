'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const AnomalyDetectionAI = require('../anomaly-detection');

describe('AnomalyDetectionAI', () => {
  let mod;
  let mockApp;

  beforeEach(() => {
    mockApp = { homeyClient: null };
    mod = new AnomalyDetectionAI(mockApp);
  });

  afterEach(() => {
    for (const id of mod._intervals) clearInterval(id);
    mod._intervals = [];
  });

  describe('constructor', () => {
    it('stores the app reference', () => {
      assert.strictEqual(mod.app, mockApp);
    });

    it('initializes empty intervals array', () => {
      assert.ok(Array.isArray(mod._intervals));
      assert.strictEqual(mod._intervals.length, 0);
    });

    it('initializes baselines as a Map', () => {
      assert.ok(mod.baselines instanceof Map);
    });

    it('initializes empty anomalies array', () => {
      assert.ok(Array.isArray(mod.anomalies));
      assert.strictEqual(mod.anomalies.length, 0);
    });

    it('initializes patterns as a Map', () => {
      assert.ok(mod.patterns instanceof Map);
    });

    it('sets alertThresholds with 4 levels', () => {
      assert.strictEqual(mod.alertThresholds.low, 0.3);
      assert.strictEqual(mod.alertThresholds.medium, 0.5);
      assert.strictEqual(mod.alertThresholds.high, 0.7);
      assert.strictEqual(mod.alertThresholds.critical, 0.9);
    });
  });

  describe('loadBaselines', () => {
    it('populates baselines map', () => {
      mod.loadBaselines();
      assert.ok(mod.baselines.size > 0);
    });

    it('includes energy baseline', () => {
      mod.loadBaselines();
      assert.ok(mod.baselines.has('energy'));
    });

    it('includes temperature baseline', () => {
      mod.loadBaselines();
      assert.ok(mod.baselines.has('temperature'));
    });

    it('includes devices baseline', () => {
      mod.loadBaselines();
      assert.ok(mod.baselines.has('devices'));
    });

    it('energy baseline has hourly data', () => {
      mod.loadBaselines();
      const energy = mod.baselines.get('energy');
      assert.ok(energy.hourly);
      assert.ok(energy.hourly.length > 0);
    });
  });

  describe('getTypicalEnergyForHour', () => {
    it('returns low energy for night hours (0-5)', () => {
      const nightEnergy = mod.getTypicalEnergyForHour(2);
      assert.ok(nightEnergy <= 1.0, `Night energy ${nightEnergy} should be low`);
    });

    it('returns higher energy for morning hours (6-8)', () => {
      const morningEnergy = mod.getTypicalEnergyForHour(7);
      assert.ok(morningEnergy > 1.0, `Morning energy ${morningEnergy} should be elevated`);
    });

    it('returns moderate energy for daytime (9-16)', () => {
      const dayEnergy = mod.getTypicalEnergyForHour(12);
      assert.ok(dayEnergy > 0, `Day energy ${dayEnergy} should be positive`);
    });

    it('returns high energy for evening (17-21)', () => {
      const eveningEnergy = mod.getTypicalEnergyForHour(19);
      assert.ok(eveningEnergy > 1.5, `Evening energy ${eveningEnergy} should be high`);
    });
  });

  describe('simulateCurrentEnergy', () => {
    it('returns a positive number', () => {
      const energy = mod.simulateCurrentEnergy(12);
      assert.strictEqual(typeof energy, 'number');
      assert.ok(energy > 0);
    });
  });

  describe('calculateSeverity', () => {
    it('returns low for small deviations', () => {
      const severity = mod.calculateSeverity(0.2, 0.5, 0.9);
      assert.strictEqual(severity, 'low');
    });

    it('returns medium for moderate deviations', () => {
      const severity = mod.calculateSeverity(0.55, 0.5, 0.9);
      assert.strictEqual(severity, 'medium');
    });

    it('returns high for large deviations', () => {
      const severity = mod.calculateSeverity(0.75, 0.5, 0.9);
      assert.strictEqual(severity, 'high');
    });

    it('returns critical for extreme deviations', () => {
      const severity = mod.calculateSeverity(0.95, 0.5, 0.9);
      assert.strictEqual(severity, 'critical');
    });
  });

  describe('reportAnomaly', () => {
    it('adds anomaly to the list', () => {
      mod.reportAnomaly({
        type: 'energy',
        category: 'consumption',
        severity: 'high',
        title: 'High energy',
        description: 'Way too much energy',
        value: 10,
        expected: 5,
        deviation: 1.0,
        recommendations: []
      });
      assert.strictEqual(mod.anomalies.length, 1);
    });

    it('anomaly has a timestamp', () => {
      mod.reportAnomaly({
        type: 'energy',
        category: 'consumption',
        severity: 'low',
        title: 'Test',
        description: 'Test anomaly',
        value: 1,
        expected: 1,
        deviation: 0,
        timestamp: Date.now(),
        recommendations: []
      });
      assert.ok(mod.anomalies[0].timestamp);
    });
  });

  describe('checkEnergyAnomalies', () => {
    it('runs without error', async () => {
      mod.loadBaselines();
      await assert.doesNotReject(() => mod.checkEnergyAnomalies());
    });
  });

  describe('checkTemperatureAnomalies', () => {
    it('runs without error', async () => {
      mod.loadBaselines();
      await assert.doesNotReject(() => mod.checkTemperatureAnomalies());
    });
  });

  describe('getEnergyRecommendations', () => {
    it('returns an array of recommendations', () => {
      mod.loadBaselines();
      const baseline = mod.baselines.get('energy');
      const recs = mod.getEnergyRecommendations(10, baseline);
      assert.ok(Array.isArray(recs));
    });
  });
});
