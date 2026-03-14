'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const GeofencingManager = require('../geofencing-manager');

describe('GeofencingManager', () => {
  let mod;
  let mockApp;

  beforeEach(() => {
    mockApp = { homeyClient: null };
    mod = new GeofencingManager(mockApp);
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

    it('initializes zones as a Map', () => {
      assert.ok(mod.zones instanceof Map);
    });

    it('initializes devices as a Map', () => {
      assert.ok(mod.devices instanceof Map);
    });

    it('initializes triggers as a Map', () => {
      assert.ok(mod.triggers instanceof Map);
    });

    it('initializes empty locationHistory', () => {
      assert.ok(Array.isArray(mod.locationHistory));
    });

    it('initializes empty events array', () => {
      assert.ok(Array.isArray(mod.events));
    });
  });

  describe('loadZones', () => {
    it('populates zones map', async () => {
      await mod.loadZones();
      assert.ok(mod.zones.size > 0);
    });

    it('loads 5 default zones', async () => {
      await mod.loadZones();
      assert.strictEqual(mod.zones.size, 5);
    });

    it('includes home zone', async () => {
      await mod.loadZones();
      assert.ok(mod.zones.has('home'));
    });

    it('each zone has center with lat, lng, and radius', async () => {
      await mod.loadZones();
      for (const [_id, zone] of mod.zones) {
        assert.strictEqual(typeof zone.center.lat, 'number');
        assert.strictEqual(typeof zone.center.lng, 'number');
        assert.strictEqual(typeof zone.radius, 'number');
      }
    });

    it('Stockholm coordinates for home zone', async () => {
      await mod.loadZones();
      const home = mod.zones.get('home');
      assert.ok(home.center.lat > 59 && home.center.lat < 60);
      assert.ok(home.center.lng > 17 && home.center.lng < 19);
    });
  });

  describe('createZone', () => {
    it('creates a zone and returns success', async () => {
      const result = await mod.createZone({
        id: 'test_zone',
        name: 'Test Zone',
        center: { lat: 59.33, lng: 18.07 },
        radius: 100
      });
      assert.strictEqual(result.success, true);
      assert.ok(result.zone);
    });

    it('adds zone to zones map', async () => {
      await mod.createZone({
        id: 'new_zone',
        name: 'New Zone',
        center: { lat: 59.33, lng: 18.07 },
        radius: 200
      });
      assert.ok(mod.zones.has('new_zone'));
    });
  });

  describe('updateZone', () => {
    it('updates existing zone', async () => {
      await mod.loadZones();
      const result = await mod.updateZone('home', { radius: 500 });
      assert.strictEqual(result.success, true);
    });

    it('returns error for non-existent zone', async () => {
      const result = await mod.updateZone('nonexistent', { radius: 100 });
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('deleteZone', () => {
    it('deletes a regular zone', async () => {
      await mod.loadZones();
      const result = await mod.deleteZone('work');
      assert.strictEqual(result.success, true);
      assert.ok(!mod.zones.has('work'));
    });

    it('prevents deletion of home zone', async () => {
      await mod.loadZones();
      const result = await mod.deleteZone('home');
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
      assert.ok(mod.zones.has('home'));
    });

    it('returns success for non-existent zone', async () => {
      const result = await mod.deleteZone('nonexistent');
      assert.strictEqual(result.success, true);
    });
  });

  describe('loadDevices', () => {
    it('populates devices map', async () => {
      await mod.loadDevices();
      assert.ok(mod.devices.size > 0);
    });

    it('loads 3 phone devices', async () => {
      await mod.loadDevices();
      assert.strictEqual(mod.devices.size, 3);
    });

    it('each device has trackingEnabled property', async () => {
      await mod.loadDevices();
      for (const [_id, device] of mod.devices) {
        assert.strictEqual(typeof device.trackingEnabled, 'boolean');
      }
    });
  });

  describe('simulateLocation', () => {
    it('returns an object with lat and lng', async () => {
      await mod.loadDevices();
      await mod.loadZones();
      const device = [...mod.devices.values()][0];
      const location = mod.simulateLocation(device);
      assert.strictEqual(typeof location.lat, 'number');
      assert.strictEqual(typeof location.lng, 'number');
    });
  });

  describe('initialize', () => {
    it('does not reject', async () => {
      await assert.doesNotReject(() => mod.initialize());
    });

    it('populates zones after initialization', async () => {
      await mod.initialize();
      assert.ok(mod.zones.size > 0);
    });
  });
});
