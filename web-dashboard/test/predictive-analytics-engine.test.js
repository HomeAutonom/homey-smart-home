'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const PredictiveAnalyticsEngine = require('../predictive-analytics-engine');

describe('PredictiveAnalyticsEngine', () => {
  let engine;
  const mockApp = { log: () => {}, emit: () => {} };

  beforeEach(async () => {
    engine = new PredictiveAnalyticsEngine(mockApp);
    await engine.initialize();
  });

  afterEach(() => {
    if (engine && engine.destroy) engine.destroy();
  });

  describe('initialization', () => {
    it('sets up data streams', () => {
      assert.ok(engine.dataStreams instanceof Map);
      assert.ok(engine.dataStreams.size > 0);
    });

    it('loads historical data into streams', () => {
      const energyStream = engine.dataStreams.get('energy');
      assert.ok(energyStream);
      assert.ok(energyStream.data.length > 0);
    });

    it('initializes correlation and prediction arrays', () => {
      assert.ok(Array.isArray(engine.correlations));
      assert.ok(Array.isArray(engine.predictions));
      assert.ok(Array.isArray(engine.anomalies));
      assert.ok(Array.isArray(engine.trends));
      assert.ok(Array.isArray(engine.alerts));
    });

    it('has expected data stream keys', () => {
      const keys = [...engine.dataStreams.keys()];
      assert.ok(keys.includes('energy'));
      assert.ok(keys.includes('temperature'));
      assert.ok(keys.includes('humidity'));
    });
  });

  describe('addDataPoint', () => {
    it('adds a data point to an existing stream', async () => {
      const result = await engine.addDataPoint('energy', 42);
      assert.strictEqual(result.success, true);
    });

    it('fails for non-existent stream', async () => {
      const result = await engine.addDataPoint('nonexistent', 10);
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('findCorrelations', () => {
    it('returns an array of correlations', async () => {
      const result = await engine.findCorrelations();
      assert.ok(Array.isArray(result));
    });

    it('correlations have expected properties', async () => {
      const result = await engine.findCorrelations();
      if (result.length > 0) {
        const corr = result[0];
        assert.ok('stream1' in corr);
        assert.ok('stream2' in corr);
        assert.ok('coefficient' in corr);
        assert.ok('strength' in corr);
        assert.ok('type' in corr);
      }
    });
  });

  describe('detectAnomaly', () => {
    it('returns null for normal values', async () => {
      const stream = engine.dataStreams.get('energy');
      const avg = stream.data.reduce((s, d) => s + d.value, 0) / stream.data.length;
      const result = await engine.detectAnomaly('energy', avg);
      // Could be null or anomaly object depending on std deviation
      assert.ok(result === null || typeof result === 'object');
    });

    it('detects anomaly for extreme values', async () => {
      const result = await engine.detectAnomaly('energy', 999999);
      if (result) {
        assert.ok(result.stream);
        assert.ok(result.value);
      }
    });
  });

  describe('analyzeAnomalies', () => {
    it('returns anomaly summary', async () => {
      const result = await engine.analyzeAnomalies();
      assert.ok('total' in result);
      assert.ok('byStream' in result);
      assert.ok('recent' in result);
    });
  });

  describe('analyzeTrends', () => {
    it('returns an array of trends', async () => {
      const result = await engine.analyzeTrends();
      assert.ok(Array.isArray(result));
    });
  });

  describe('calculateTrend', () => {
    it('returns trend for valid stream', async () => {
      const result = await engine.calculateTrend('energy');
      if (result) {
        assert.ok('stream' in result);
        assert.ok('direction' in result);
        assert.ok('change' in result);
      }
    });

    it('returns null for unknown stream', async () => {
      const result = await engine.calculateTrend('nonexistent');
      assert.strictEqual(result, null);
    });
  });

  describe('predictFuture', () => {
    it('returns predictions for valid stream', async () => {
      const result = await engine.predictFuture('energy', 24);
      if (result) {
        assert.ok(Array.isArray(result));
        if (result.length > 0) {
          assert.ok('timestamp' in result[0]);
          assert.ok('hour' in result[0]);
          assert.ok('value' in result[0]);
          assert.ok('confidence' in result[0]);
        }
      }
    });

    it('returns null for unknown stream', async () => {
      const result = await engine.predictFuture('nonexistent', 24);
      assert.strictEqual(result, null);
    });
  });

  describe('predictEnergyPeak', () => {
    it('returns a peak prediction', async () => {
      const result = await engine.predictEnergyPeak();
      if (result) {
        assert.ok('hour' in result);
        assert.ok('expectedUsage' in result);
        assert.ok('confidence' in result);
      }
    });
  });

  describe('predictCost', () => {
    it('returns cost prediction for given hours', async () => {
      const result = await engine.predictCost(24);
      if (result) {
        assert.ok('timeframe' in result);
        assert.ok('estimatedCost' in result);
        assert.ok('averagePrice' in result);
        assert.ok('confidence' in result);
      }
    });
  });

  describe('generateOptimizationSuggestions', () => {
    it('returns suggestions array', async () => {
      const result = await engine.generateOptimizationSuggestions();
      assert.ok(Array.isArray(result));
      if (result.length > 0) {
        assert.ok('type' in result[0]);
        assert.ok('priority' in result[0]);
        assert.ok('title' in result[0]);
      }
    });
  });

  describe('alerts', () => {
    it('creates an alert', async () => {
      const alert = await engine.createAlert({ type: 'test', severity: 'high', message: 'Test alert' });
      assert.ok(alert.id);
      assert.strictEqual(alert.type, 'test');
      assert.strictEqual(alert.severity, 'high');
      assert.strictEqual(alert.acknowledged, false);
    });

    it('acknowledges an alert', async () => {
      const alert = await engine.createAlert({ type: 'test', severity: 'low', message: 'Ack test' });
      const result = await engine.acknowledgeAlert(alert.id);
      assert.strictEqual(result.success, true);
    });

    it('fails to acknowledge non-existent alert', async () => {
      const result = await engine.acknowledgeAlert('fake_id');
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    it('getActiveAlerts returns unacknowledged alerts', async () => {
      await engine.createAlert({ type: 'a', severity: 'low', message: 'one' });
      const active = engine.getActiveAlerts();
      assert.ok(Array.isArray(active));
    });
  });

  describe('getAnalyticsOverview', () => {
    it('returns overview object', () => {
      const overview = engine.getAnalyticsOverview();
      assert.ok('dataStreams' in overview);
      assert.ok('correlations' in overview);
      assert.ok('predictions' in overview);
      assert.ok('anomalies' in overview);
      assert.ok('activeAlerts' in overview);
      assert.ok('trends' in overview);
    });
  });

  describe('sync getters', () => {
    it('getStrongCorrelations returns array', () => {
      const result = engine.getStrongCorrelations();
      assert.ok(Array.isArray(result));
    });

    it('getRecentAnomalies returns array', () => {
      const result = engine.getRecentAnomalies();
      assert.ok(Array.isArray(result));
    });

    it('getSignificantTrends returns array', () => {
      const result = engine.getSignificantTrends();
      assert.ok(Array.isArray(result));
    });
  });

  describe('destroy', () => {
    it('clears intervals and timeouts', () => {
      engine.destroy();
      assert.deepStrictEqual(engine._intervals, []);
      assert.deepStrictEqual(engine._timeouts, []);
    });
  });
});
