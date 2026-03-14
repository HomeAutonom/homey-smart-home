'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const DeviceHealthMonitor = require('../device-health-monitor');

describe('DeviceHealthMonitor', () => {
  let mod;
  let mockApp;

  beforeEach(() => {
    mockApp = { homeyClient: null };
    mod = new DeviceHealthMonitor(mockApp);
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

    it('initializes devices as a Map', () => {
      assert.ok(mod.devices instanceof Map);
    });

    it('initializes empty healthHistory', () => {
      assert.ok(Array.isArray(mod.healthHistory));
      assert.strictEqual(mod.healthHistory.length, 0);
    });

    it('initializes empty alerts array', () => {
      assert.ok(Array.isArray(mod.alerts));
      assert.strictEqual(mod.alerts.length, 0);
    });

    it('initializes maintenanceSchedule as a Map', () => {
      assert.ok(mod.maintenanceSchedule instanceof Map);
    });

    it('sets maxHistorySize to 5000', () => {
      assert.strictEqual(mod.maxHistorySize, 5000);
    });
  });

  describe('loadDevices', () => {
    it('populates devices map', () => {
      mod.loadDevices();
      assert.ok(mod.devices.size > 0);
    });

    it('loads 5 devices', () => {
      mod.loadDevices();
      assert.strictEqual(mod.devices.size, 5);
    });

    it('each device has health score of 100', () => {
      mod.loadDevices();
      for (const [_id, device] of mod.devices) {
        assert.strictEqual(device.health.score, 100);
      }
    });

    it('each device has metrics object', () => {
      mod.loadDevices();
      for (const [_id, device] of mod.devices) {
        assert.ok(device.metrics);
        assert.ok(device.metrics.lastCommunication);
        assert.ok(typeof device.metrics.batteryLevel === 'number' || device.metrics.batteryLevel === null);
      }
    });
  });

  describe('checkDeviceHealth', () => {
    it('returns health status for a valid device', async () => {
      mod.loadDevices();
      const deviceId = [...mod.devices.keys()][0];
      const result = await mod.checkDeviceHealth(deviceId);
      assert.ok(result);
      assert.ok(['healthy', 'warning', 'critical', 'offline'].includes(result.status));
      assert.strictEqual(typeof result.score, 'number');
    });

    it('returns issues array', async () => {
      mod.loadDevices();
      const deviceId = [...mod.devices.keys()][0];
      const result = await mod.checkDeviceHealth(deviceId);
      assert.ok(Array.isArray(result.issues));
    });

    it('returns predictions object', async () => {
      mod.loadDevices();
      const deviceId = [...mod.devices.keys()][0];
      const result = await mod.checkDeviceHealth(deviceId);
      assert.ok(typeof result.predictions === 'object' && result.predictions !== null);
    });

    it('score is between 0 and 100', async () => {
      mod.loadDevices();
      for (const deviceId of mod.devices.keys()) {
        const result = await mod.checkDeviceHealth(deviceId);
        assert.ok(result.score >= 0 && result.score <= 100,
          `Score ${result.score} out of range for device ${deviceId}`);
      }
    });
  });

  describe('generatePredictions', () => {
    it('returns an object', () => {
      mod.loadDevices();
      const device = [...mod.devices.values()][0];
      const result = mod.generatePredictions(device, []);
      assert.ok(typeof result === 'object' && result !== null);
    });

    it('predicts battery replacement for battery-powered devices', () => {
      mod.loadDevices();
      const device = [...mod.devices.values()][0];
      device.batteryPowered = true;
      device.batteryType = 'CR2032';
      device.metrics.batteryLevel = 15;
      const result = mod.generatePredictions(device, []);
      assert.ok(typeof result === 'object' && result !== null);
      assert.ok(result.batteryReplacement);
      assert.strictEqual(typeof result.batteryReplacement.daysRemaining, 'number');
    });
  });

  describe('performHealthChecks', () => {
    it('runs without error when devices loaded', async () => {
      mod.loadDevices();
      await assert.doesNotReject(() => mod.performHealthChecks());
    });

    it('runs without error when no devices', async () => {
      await assert.doesNotReject(() => mod.performHealthChecks());
    });
  });

  describe('runPredictiveAnalysis', () => {
    it('runs without error', async () => {
      mod.loadDevices();
      await assert.doesNotReject(() => mod.runPredictiveAnalysis());
    });
  });
});
