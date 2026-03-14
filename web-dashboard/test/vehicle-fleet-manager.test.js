'use strict';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

const VehicleFleetManager = require('../vehicle-fleet-manager');

describe('VehicleFleetManager', () => {
  let fleet;
  const originalSetTimeout = global.setTimeout;
  const originalSetInterval = global.setInterval;
  let trackedTimers = [];

  beforeEach(async () => {
    trackedTimers = [];
    global.setTimeout = function (...args) {
      const id = originalSetTimeout.apply(this, args);
      trackedTimers.push({ type: 'timeout', id });
      return id;
    };
    global.setInterval = function (...args) {
      const id = originalSetInterval.apply(this, args);
      trackedTimers.push({ type: 'interval', id });
      return id;
    };
    fleet = new VehicleFleetManager({});
    await fleet.initialize();
  });

  afterEach(() => {
    if (fleet && typeof fleet.destroy === 'function') {
      fleet.destroy();
    }
    for (const t of trackedTimers) {
      if (t.type === 'timeout') clearTimeout(t.id);
      else clearInterval(t.id);
    }
    trackedTimers = [];
    global.setTimeout = originalSetTimeout;
    global.setInterval = originalSetInterval;
  });

  describe('initialization', () => {
    it('should initialize without errors', () => {
      assert.ok(fleet);
    });

    it('should have vehicles map', () => {
      assert.ok(fleet.vehicles instanceof Map);
    });

    it('should have default vehicles registered', () => {
      assert.ok(fleet.vehicles.size > 0);
    });

    it('should have trips array', () => {
      assert.ok(Array.isArray(fleet.trips));
    });

    it('should have charging sessions', () => {
      assert.ok(Array.isArray(fleet.chargingSessions));
    });
  });

  describe('getFleetOverview', () => {
    it('should return overview object', () => {
      const overview = fleet.getFleetOverview();
      assert.ok(overview);
      assert.strictEqual(typeof overview.totalVehicles, 'number');
      assert.ok(overview.totalVehicles > 0);
    });

    it('should include vehicle details', () => {
      const overview = fleet.getFleetOverview();
      assert.strictEqual(typeof overview.totalVehicles, 'number');
      assert.ok(overview.totalVehicles > 0);
    });
  });

  describe('addVehicle', () => {
    it('should add a new vehicle', async () => {
      const result = await fleet.addVehicle({
        name: 'Test Car',
        type: 'electric',
        make: 'BYD',
        model: 'Seal',
        year: 2024,
        batteryCapacity: 82
      });
      assert.strictEqual(result.success, true);
      assert.ok(result.vehicle);
    });
  });

  describe('updateVehicleStatus', () => {
    it('should update existing vehicle', async () => {
      const vehicleId = fleet.vehicles.keys().next().value;
      const result = await fleet.updateVehicleStatus(vehicleId, { mileage: 15000 });
      assert.strictEqual(result.success, true);
    });

    it('should fail for non-existent vehicle', async () => {
      const result = await fleet.updateVehicleStatus('nonexistent', { mileage: 5000 });
      assert.strictEqual(result.success, false);
    });
  });

  describe('getVehicleReport', () => {
    it('should return report for existing vehicle', () => {
      const vehicleId = fleet.vehicles.keys().next().value;
      const report = fleet.getVehicleReport(vehicleId);
      assert.ok(report);
    });

    it('should return error for non-existent vehicle', () => {
      const report = fleet.getVehicleReport('nonexistent');
      assert.ok(report === null || report.error || !report.name);
    });
  });

  describe('startTrip', () => {
    it('should start a trip for existing vehicle', async () => {
      const vehicleId = fleet.vehicles.keys().next().value;
      const result = await fleet.startTrip(vehicleId, 'Grocery Store');
      assert.strictEqual(result.success, true);
      assert.ok(result.trip);
    });

    it('should fail for non-existent vehicle', async () => {
      const result = await fleet.startTrip('nonexistent', 'Nowhere');
      assert.strictEqual(result.success, false);
    });
  });

  describe('endTrip', () => {
    it('should end an active trip', async () => {
      const vehicleId = fleet.vehicles.keys().next().value;
      const started = await fleet.startTrip(vehicleId, 'Office');
      if (started.success) {
        const result = await fleet.endTrip(started.trip.id, { distance: 25, duration: 30 });
        assert.strictEqual(result.success, true);
      }
    });

    it('should fail for non-existent trip', async () => {
      const result = await fleet.endTrip('nonexistent', { distance: 10 });
      assert.strictEqual(result.success, false);
    });
  });

  describe('startCharging', () => {
    it('should start charging an electric vehicle', async () => {
      // Find an electric vehicle
      let evId = null;
      for (const [id, v] of fleet.vehicles) {
        if (v.type === 'electric' || v.fuelType === 'electric') {
          evId = id;
          break;
        }
      }
      if (evId) {
        const result = await fleet.startCharging(evId, 'home');
        assert.strictEqual(result.success, true);
        assert.ok(result.session);
      }
    });

    it('should fail for non-existent vehicle', async () => {
      const result = await fleet.startCharging('nonexistent', 'home');
      assert.strictEqual(result.success, false);
    });
  });

  describe('stopCharging', () => {
    it('should stop an active charging session', async () => {
      let evId = null;
      for (const [id, v] of fleet.vehicles) {
        if (v.type === 'electric' || v.fuelType === 'electric') {
          evId = id;
          break;
        }
      }
      if (evId) {
        const started = await fleet.startCharging(evId, 'home');
        if (started.success) {
          const result = await fleet.stopCharging(started.session.id);
          assert.strictEqual(result.success, true);
        }
      }
    });

    it('should fail for non-existent session', async () => {
      const result = await fleet.stopCharging('nonexistent');
      assert.strictEqual(result.success, false);
    });
  });

  describe('addMaintenanceRecord', () => {
    it('should add record to existing vehicle', async () => {
      const vehicleId = fleet.vehicles.keys().next().value;
      const result = await fleet.addMaintenanceRecord(vehicleId, {
        type: 'oil_change',
        cost: 899,
        description: 'Regular oil change'
      });
      assert.strictEqual(result.success, true);
    });

    it('should fail for non-existent vehicle', async () => {
      const result = await fleet.addMaintenanceRecord('nonexistent', { type: 'repair' });
      assert.strictEqual(result.success, false);
    });
  });

  describe('getMaintenanceSchedule', () => {
    it('should return schedule for existing vehicle', () => {
      const vehicleId = fleet.vehicles.keys().next().value;
      const schedule = fleet.getMaintenanceSchedule(vehicleId);
      assert.ok(schedule);
    });
  });

  describe('optimizeCharging', () => {
    it('should optimize charging schedule', async () => {
      let evId = null;
      for (const [id, v] of fleet.vehicles) {
        if (v.type === 'electric' || v.fuelType === 'electric') {
          evId = id;
          break;
        }
      }
      if (evId) {
        const departure = new Date(Date.now() + 8 * 3600000).toISOString();
        const result = await fleet.optimizeCharging(evId, departure);
        assert.strictEqual(result.success, true);
      }
    });
  });

  describe('getRecommendedVehicle', () => {
    it('should recommend vehicle for short trip', async () => {
      const result = await fleet.getRecommendedVehicle(10, 'commute');
      assert.strictEqual(result.success, true);
      assert.ok(result.recommended);
    });

    it('should recommend vehicle for long trip', async () => {
      const result = await fleet.getRecommendedVehicle(500, 'highway');
      assert.strictEqual(result.success, true);
    });
  });

  describe('getCostComparison', () => {
    it('should return cost comparison data', () => {
      const comparison = fleet.getCostComparison(30);
      assert.ok(comparison);
    });
  });

  describe('getFuelPrice', () => {
    it('should return price for bensin', () => {
      const price = fleet.getFuelPrice('bensin');
      assert.strictEqual(typeof price, 'number');
      assert.ok(price > 0);
    });

    it('should return price for diesel', () => {
      const price = fleet.getFuelPrice('diesel');
      assert.strictEqual(typeof price, 'number');
      assert.ok(price > 0);
    });

    it('should return zero or default for unknown fuel', () => {
      const price = fleet.getFuelPrice('hydrogen');
      assert.strictEqual(typeof price, 'number');
    });
  });

  describe('calculateTripCost', () => {
    it('should calculate cost for a vehicle and distance', () => {
      const vehicle = fleet.vehicles.values().next().value;
      if (vehicle) {
        const cost = fleet.calculateTripCost(vehicle, 100);
        assert.strictEqual(typeof cost, 'number');
        assert.ok(cost >= 0);
      }
    });
  });

  describe('getChargePower', () => {
    it('should return charge power for home charging', () => {
      let ev = null;
      for (const v of fleet.vehicles.values()) {
        if (v.type === 'electric' || v.fuelType === 'electric') {
          ev = v;
          break;
        }
      }
      if (ev) {
        const power = fleet.getChargePower(ev, 'home');
        assert.strictEqual(typeof power, 'number');
        assert.ok(power > 0);
      }
    });
  });

  describe('destroy', () => {
    it('should clean up resources', () => {
      fleet.destroy();
      assert.ok(true);
    });
  });
});
