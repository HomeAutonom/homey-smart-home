'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const AirQualityManager = require('../air-quality-manager');

describe('AirQualityManager', () => {
  let mod;
  let mockApp;

  beforeEach(() => {
    mockApp = { homeyClient: null };
    mod = new AirQualityManager(mockApp);
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

    it('initializes sensors as a Map', () => {
      assert.ok(mod.sensors instanceof Map);
    });

    it('initializes rooms as a Map', () => {
      assert.ok(mod.rooms instanceof Map);
    });

    it('initializes empty measurements array', () => {
      assert.ok(Array.isArray(mod.measurements));
      assert.strictEqual(mod.measurements.length, 0);
    });

    it('initializes empty alerts array', () => {
      assert.ok(Array.isArray(mod.alerts));
      assert.strictEqual(mod.alerts.length, 0);
    });

    it('initializes ventilationDevices as a Map', () => {
      assert.ok(mod.ventilationDevices instanceof Map);
    });
  });

  describe('thresholds', () => {
    it('has CO2 thresholds', () => {
      assert.ok(mod.thresholds.co2);
      assert.strictEqual(mod.thresholds.co2.excellent, 400);
      assert.strictEqual(mod.thresholds.co2.bad, 2000);
    });

    it('has PM2.5 thresholds', () => {
      assert.ok(mod.thresholds.pm25);
      assert.strictEqual(mod.thresholds.pm25.excellent, 5);
    });

    it('has PM10 thresholds', () => {
      assert.ok(mod.thresholds.pm10);
      assert.strictEqual(mod.thresholds.pm10.excellent, 10);
    });

    it('has VOC thresholds', () => {
      assert.ok(mod.thresholds.voc);
      assert.strictEqual(mod.thresholds.voc.excellent, 220);
    });

    it('has humidity thresholds', () => {
      assert.ok(mod.thresholds.humidity);
      assert.strictEqual(mod.thresholds.humidity.min, 30);
      assert.strictEqual(mod.thresholds.humidity.max, 70);
    });

    it('has temperature thresholds', () => {
      assert.ok(mod.thresholds.temperature);
      assert.strictEqual(mod.thresholds.temperature.min, 18);
      assert.strictEqual(mod.thresholds.temperature.max, 26);
    });
  });

  describe('loadSensors', () => {
    it('populates sensors map', () => {
      mod.loadSensors();
      assert.ok(mod.sensors.size > 0);
    });

    it('loads 5 sensors', () => {
      mod.loadSensors();
      assert.strictEqual(mod.sensors.size, 5);
    });

    it('each sensor has capabilities array', () => {
      mod.loadSensors();
      for (const [_id, sensor] of mod.sensors) {
        assert.ok(Array.isArray(sensor.capabilities));
      }
    });
  });

  describe('loadRooms', () => {
    it('populates rooms map', () => {
      mod.loadRooms();
      assert.ok(mod.rooms.size > 0);
    });

    it('loads 5 rooms', () => {
      mod.loadRooms();
      assert.strictEqual(mod.rooms.size, 5);
    });

    it('each room has area and volume', () => {
      mod.loadRooms();
      for (const [_id, room] of mod.rooms) {
        assert.strictEqual(typeof room.area, 'number');
        assert.strictEqual(typeof room.volume, 'number');
        assert.ok(room.area > 0);
        assert.ok(room.volume > 0);
      }
    });

    it('each room starts with airQuality score 100', () => {
      mod.loadRooms();
      for (const [_id, room] of mod.rooms) {
        assert.strictEqual(room.airQuality.score, 100);
        assert.strictEqual(room.airQuality.status, 'excellent');
      }
    });
  });

  describe('loadVentilationDevices', () => {
    it('populates ventilation devices map', () => {
      mod.loadVentilationDevices();
      assert.ok(mod.ventilationDevices.size > 0);
    });

    it('each device has capacity and speed', () => {
      mod.loadVentilationDevices();
      for (const [_id, device] of mod.ventilationDevices) {
        assert.strictEqual(typeof device.capacity, 'number');
        assert.strictEqual(typeof device.speed, 'number');
      }
    });
  });

  describe('initialize', () => {
    it('does not reject', async () => {
      await assert.doesNotReject(() => mod.initialize());
    });

    it('populates sensors after initialization', async () => {
      await mod.initialize();
      assert.ok(mod.sensors.size > 0);
    });
  });
});
