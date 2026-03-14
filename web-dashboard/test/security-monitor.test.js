'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const SecurityMonitor = require('../security-monitor');

describe('SecurityMonitor', () => {
  let mod;
  const mockApp = { emit: () => {} };

  beforeEach(() => {
    mod = new SecurityMonitor(mockApp);
  });

  afterEach(() => {
    mod.destroy();
  });

  describe('constructor', () => {
    it('initializes with empty events array', () => {
      assert.ok(Array.isArray(mod.securityEvents));
      assert.strictEqual(mod.securityEvents.length, 0);
    });

    it('initializes with empty anomalies array', () => {
      assert.ok(Array.isArray(mod.anomalies));
      assert.strictEqual(mod.anomalies.length, 0);
    });

    it('initializes with baselineProfiles map', () => {
      assert.ok(mod.baselineProfiles instanceof Map);
    });

    it('initializes with alertRules map', () => {
      assert.ok(mod.alertRules instanceof Map);
    });

    it('initializes with low threat level', () => {
      assert.strictEqual(mod.threatLevel, 'low');
    });

    it('has an empty _intervals array', () => {
      assert.ok(Array.isArray(mod._intervals));
      assert.strictEqual(mod._intervals.length, 0);
    });
  });

  describe('startMonitoring', () => {
    it('pushes intervals', () => {
      mod.startMonitoring();
      assert.ok(mod._intervals.length >= 2);
    });
  });

  describe('logSecurityEvent', () => {
    it('adds event to the array', () => {
      mod.logSecurityEvent({ type: 'login', severity: 'info', details: 'test' });
      assert.strictEqual(mod.securityEvents.length, 1);
      assert.strictEqual(mod.securityEvents[0].type, 'login');
    });

    it('auto-generates event id', () => {
      mod.logSecurityEvent({ type: 'test' });
      assert.ok(mod.securityEvents[0].id);
    });

    it('sets timestamp on the event', () => {
      mod.logSecurityEvent({ type: 'test', timestamp: Date.now() });
      assert.ok(mod.securityEvents[0].timestamp);
    });
  });

  describe('handleAnomaly', () => {
    it('adds anomaly to the array', () => {
      mod.handleAnomaly({ type: 'unauthorized_access', severity: 'high', details: 'test intrusion' });
      assert.strictEqual(mod.anomalies.length, 1);
    });

    it('also logs a security event', () => {
      mod.handleAnomaly({ type: 'unusual_device', severity: 'medium', details: '' });
      assert.ok(mod.securityEvents.length >= 1);
    });

    it('keeps anomalies under 1000', () => {
      for (let i = 0; i < 1005; i++) {
        mod.handleAnomaly({ type: 'test', severity: 'low', details: `anomaly-${i}` });
      }
      assert.ok(mod.anomalies.length <= 1000);
    });
  });

  describe('updateThreatLevel', () => {
    it('stays low with no anomalies', () => {
      mod.updateThreatLevel();
      assert.strictEqual(mod.threatLevel, 'low');
    });

    it('becomes medium with multiple medium anomalies', () => {
      for (let i = 0; i < 4; i++) {
        mod.anomalies.push({ severity: 'medium', timestamp: Date.now() });
      }
      mod.updateThreatLevel();
      assert.strictEqual(mod.threatLevel, 'medium');
    });

    it('becomes high with multiple high anomalies', () => {
      mod.anomalies.push({ severity: 'high', timestamp: Date.now() });
      mod.anomalies.push({ severity: 'high', timestamp: Date.now() });
      mod.updateThreatLevel();
      assert.strictEqual(mod.threatLevel, 'high');
    });

    it('becomes critical with critical anomaly', () => {
      mod.anomalies.push({ severity: 'critical', timestamp: Date.now() });
      mod.updateThreatLevel();
      assert.strictEqual(mod.threatLevel, 'critical');
    });
  });

  describe('analyzeAnomalies', () => {
    it('returns empty analysis with no anomalies', async () => {
      const analysis = await mod.analyzeAnomalies();
      assert.strictEqual(analysis.total, 0);
      assert.strictEqual(analysis.last_hour, 0);
      assert.strictEqual(analysis.last_24h, 0);
    });

    it('counts anomalies correctly', async () => {
      mod.anomalies.push({ type: 'intrusion', severity: 'high', timestamp: Date.now() });
      mod.anomalies.push({ type: 'intrusion', severity: 'medium', timestamp: Date.now() });
      mod.anomalies.push({ type: 'network', severity: 'low', timestamp: Date.now() - 90000000 });
      const analysis = await mod.analyzeAnomalies();
      assert.strictEqual(analysis.total, 3);
      assert.strictEqual(analysis.last_hour, 2);
    });

    it('includes by_type and by_severity breakdowns', async () => {
      mod.anomalies.push({ type: 'test', severity: 'low', timestamp: Date.now() });
      const analysis = await mod.analyzeAnomalies();
      assert.ok(analysis.by_type);
      assert.ok(analysis.by_severity);
    });
  });

  describe('getSecurityReport', () => {
    it('returns report with period and summary', async () => {
      const report = await mod.getSecurityReport();
      assert.ok(report.period);
      assert.ok(report.summary);
    });

    it('includes anomalies analysis', async () => {
      const report = await mod.getSecurityReport();
      assert.ok(report.anomalies);
      assert.strictEqual(typeof report.anomalies, 'object');
    });

    it('includes top_threats', async () => {
      const report = await mod.getSecurityReport(7 * 24 * 60 * 60 * 1000);
      assert.ok(Array.isArray(report.top_threats));
    });

    it('includes recommendations', async () => {
      const report = await mod.getSecurityReport();
      assert.ok(Array.isArray(report.recommendations));
    });
  });

  describe('getCurrentStatus', () => {
    it('returns status with threat level', async () => {
      const status = await mod.getCurrentStatus();
      assert.ok('threat_level' in status);
      assert.strictEqual(status.threat_level, 'low');
    });
  });

  describe('destroy', () => {
    it('clears all intervals', () => {
      mod.startMonitoring();
      assert.ok(mod._intervals.length > 0);
      mod.destroy();
      assert.strictEqual(mod._intervals.length, 0);
    });
  });
});
