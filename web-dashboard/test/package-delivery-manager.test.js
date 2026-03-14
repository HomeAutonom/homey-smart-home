'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const PackageDeliveryManager = require('../package-delivery-manager');

describe('PackageDeliveryManager', () => {
  let mgr;

  beforeEach(() => {
    mgr = new PackageDeliveryManager({});
  });

  afterEach(() => {
    mgr.destroy();
  });

  // ── Constructor ──
  describe('constructor', () => {
    it('initializes data structures', () => {
      assert.ok(mgr.packages instanceof Map);
      assert.ok(mgr.deliveryZones instanceof Map);
      assert.ok(mgr.deliveryPeople instanceof Map);
      assert.ok(Array.isArray(mgr.notifications));
      assert.ok(Array.isArray(mgr._intervals));
      assert.ok(Array.isArray(mgr._timeouts));
    });
  });

  // ── Initialize ──
  describe('initialize', () => {
    it('populates packages and delivery zones', async () => {
      await mgr.initialize();
      assert.ok(mgr.packages.size >= 3);
      assert.ok(mgr.deliveryZones.size > 0);
    });
  });

  // ── trackPackage ──
  describe('trackPackage', () => {
    it('returns package info by tracking number', async () => {
      await mgr.initialize();
      const result = await mgr.trackPackage('SE123456789');
      assert.equal(result.carrier, 'PostNord');
      assert.equal(result.status, 'in_transit');
      assert.ok(result.trackingNumber);
    });

    it('returns error for unknown tracking number', async () => {
      await mgr.initialize();
      const result = await mgr.trackPackage('NONEXISTENT');
      assert.equal(result.success, false);
      assert.ok(result.error);
    });
  });

  // ── addPackage ──
  describe('addPackage', () => {
    it('adds a new package and returns id', async () => {
      await mgr.initialize();
      const before = mgr.packages.size;
      const result = await mgr.addPackage({
        trackingNumber: 'TEST123',
        carrier: 'DHL',
        recipient: 'Test User',
        estimatedDelivery: Date.now() + 86400000
      });
      assert.equal(result.success, true);
      assert.ok(result.packageId.startsWith('pkg_'));
      assert.equal(mgr.packages.size, before + 1);
    });
  });

  // ── updatePackageStatus ──
  describe('updatePackageStatus', () => {
    it('updates status of existing package', async () => {
      await mgr.initialize();
      const result = await mgr.updatePackageStatus('pkg_1', 'out_for_delivery', 'Stockholm');
      assert.equal(result.success, true);
      assert.equal(mgr.packages.get('pkg_1').status, 'out_for_delivery');
      assert.equal(mgr.packages.get('pkg_1').location, 'Stockholm');
    });

    it('sets actualDelivery when delivered', async () => {
      await mgr.initialize();
      await mgr.updatePackageStatus('pkg_1', 'delivered');
      assert.ok(mgr.packages.get('pkg_1').actualDelivery);
    });

    it('returns error for unknown package', async () => {
      await mgr.initialize();
      const result = await mgr.updatePackageStatus('pkg_999', 'delivered');
      assert.equal(result.success, false);
    });
  });

  // ── getStatusMessage ──
  describe('getStatusMessage', () => {
    it('returns Swedish message for in_transit', () => {
      const msg = mgr.getStatusMessage({ status: 'in_transit', sender: 'Amazon' });
      assert.ok(msg.includes('Amazon'));
      assert.ok(msg.includes('på väg'));
    });

    it('returns Swedish message for delivered', () => {
      const msg = mgr.getStatusMessage({ status: 'delivered', sender: 'Apple' });
      assert.ok(msg.includes('levererat'));
    });

    it('returns fallback for unknown status', () => {
      const msg = mgr.getStatusMessage({ status: 'custom_status', sender: 'Test' });
      assert.ok(msg.includes('Test'));
    });
  });

  // ── recognizeDeliveryPerson ──
  describe('recognizeDeliveryPerson', () => {
    it('returns recognized carrier with access granted', async () => {
      const result = await mgr.recognizeDeliveryPerson({});
      assert.equal(result.success, true);
      assert.ok(result.carrier);
      assert.equal(result.access, 'granted');
    });
  });

  // ── grantTempAccess ──
  describe('grantTempAccess', () => {
    it('returns access code with expiry', async () => {
      const result = await mgr.grantTempAccess('PostNord', 60);
      assert.equal(result.success, true);
      assert.equal(typeof result.code, 'number');
      assert.equal(result.expiresIn, 60);
    });
  });

  // ── scheduleSafeDeliveryTime ──
  describe('scheduleSafeDeliveryTime', () => {
    it('returns weekday and weekend schedule', async () => {
      const schedule = await mgr.scheduleSafeDeliveryTime();
      assert.ok(schedule.weekdays);
      assert.ok(schedule.weekends);
      assert.ok(schedule.weekdays.start);
    });
  });

  // ── Reporting methods ──
  describe('reporting', () => {
    it('getDeliveryOverview returns counts', async () => {
      await mgr.initialize();
      const overview = mgr.getDeliveryOverview();
      assert.equal(typeof overview.total, 'number');
      assert.equal(typeof overview.pending, 'number');
      assert.equal(typeof overview.delivered, 'number');
      assert.ok(overview.total >= 3);
    });

    it('getActivePackages returns non-delivered packages', async () => {
      await mgr.initialize();
      const active = mgr.getActivePackages();
      assert.ok(Array.isArray(active));
      for (const pkg of active) {
        assert.ok(pkg.tracking);
        assert.ok(pkg.carrier);
        assert.notEqual(pkg.status, 'delivered');
      }
    });

    it('getRecentDeliveries returns array', async () => {
      await mgr.initialize();
      const recent = mgr.getRecentDeliveries(7);
      assert.ok(Array.isArray(recent));
    });

    it('getDeliveryZones returns zone info', async () => {
      await mgr.initialize();
      const zones = mgr.getDeliveryZones();
      assert.ok(Array.isArray(zones));
      assert.ok(zones.length > 0);
      assert.ok(zones[0].name);
    });
  });

  // ── destroy ──
  describe('destroy', () => {
    it('clears intervals and timeouts', async () => {
      await mgr.initialize();
      mgr.destroy();
      assert.deepEqual(mgr._intervals, []);
      assert.deepEqual(mgr._timeouts, []);
    });
  });
});
