'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const EVCharging = require('../ev-charging-vehicle-integration');

describe('EVChargingVehicleIntegration', () => {
  let ev;

  beforeEach(() => {
    ev = new EVCharging({});
  });

  afterEach(() => {
    ev.destroy();
  });

  // ── Constructor ──
  describe('constructor', () => {
    it('initializes data structures', () => {
      assert.ok(ev.vehicles instanceof Map);
      assert.ok(ev.chargingStations instanceof Map);
      assert.ok(Array.isArray(ev.chargingSessions));
      assert.ok(ev.energyPrices instanceof Map);
      assert.ok(Array.isArray(ev.trips));
      assert.ok(Array.isArray(ev._intervals));
    });
  });

  // ── Initialize ──
  describe('initialize', () => {
    it('populates vehicles and stations', async () => {
      await ev.initialize();
      assert.ok(ev.vehicles.size >= 2);
      assert.ok(ev.chargingStations.size >= 2);
      assert.ok(ev.energyPrices.size > 0);
    });
  });

  // ── getVehicleStatus ──
  describe('getVehicleStatus', () => {
    it('returns status for known vehicle', async () => {
      await ev.initialize();
      const status = await ev.getVehicleStatus('tesla_model3');
      assert.ok(status.name);
      assert.ok(status.battery.includes('%'));
      assert.ok(status.range.includes('km'));
      assert.ok(status.odometer.includes('km'));
    });

    it('returns error for unknown vehicle', async () => {
      await ev.initialize();
      const result = await ev.getVehicleStatus('nonexistent');
      assert.equal(result.success, false);
    });
  });

  // ── startPreconditioning ──
  describe('startPreconditioning', () => {
    it('enables preconditioning on vehicle', async () => {
      await ev.initialize();
      const result = await ev.startPreconditioning('tesla_model3', 22);
      assert.equal(result.success, true);
      const v = ev.vehicles.get('tesla_model3');
      assert.equal(v.preconditioning, true);
      assert.equal(v.climate.targetTemp, 22);
    });

    it('returns error for unknown vehicle', async () => {
      await ev.initialize();
      const result = await ev.startPreconditioning('nonexistent');
      assert.equal(result.success, false);
    });
  });

  // ── lock/unlock ──
  describe('lockVehicle / unlockVehicle', () => {
    it('locks a known vehicle', async () => {
      await ev.initialize();
      const result = await ev.lockVehicle('volvo_xc40');
      assert.equal(result.success, true);
    });

    it('unlocks a known vehicle', async () => {
      await ev.initialize();
      const result = await ev.unlockVehicle('volvo_xc40');
      assert.equal(result.success, true);
    });

    it('returns error locking unknown vehicle', async () => {
      await ev.initialize();
      const result = await ev.lockVehicle('nonexistent');
      assert.equal(result.success, false);
    });
  });

  // ── startCharging ──
  describe('startCharging', () => {
    it('starts a charging session', async () => {
      await ev.initialize();
      const result = await ev.startCharging('home_charger', 'tesla_model3', 90);
      assert.equal(result.success, true);
      assert.ok(result.sessionId.startsWith('session_'));
      assert.ok(result.estimatedTime);
      const station = ev.chargingStations.get('home_charger');
      assert.equal(station.status, 'charging');
    });

    it('fails when station not available', async () => {
      await ev.initialize();
      await ev.startCharging('home_charger', 'tesla_model3');
      const result = await ev.startCharging('home_charger', 'volvo_xc40');
      assert.equal(result.success, false);
      assert.ok(result.error.includes('not available'));
    });

    it('fails for unknown station/vehicle', async () => {
      await ev.initialize();
      const result = await ev.startCharging('fake', 'tesla_model3');
      assert.equal(result.success, false);
    });
  });

  // ── stopCharging ──
  describe('stopCharging', () => {
    it('stops an active session', async () => {
      await ev.initialize();
      const start = await ev.startCharging('home_charger', 'tesla_model3');
      const result = await ev.stopCharging(start.sessionId);
      assert.equal(result.success, true);
    });

    it('fails for unknown session', async () => {
      await ev.initialize();
      const result = await ev.stopCharging('session_unknown');
      assert.equal(result.success, false);
    });
  });

  // ── getCurrentEnergyPrice ──
  describe('getCurrentEnergyPrice', () => {
    it('returns a number', async () => {
      await ev.initialize();
      const price = ev.getCurrentEnergyPrice();
      assert.equal(typeof price, 'number');
    });
  });

  // ── Reporting ──
  describe('reporting', () => {
    it('getEVIntegrationOverview returns stats', async () => {
      await ev.initialize();
      const overview = ev.getEVIntegrationOverview();
      assert.equal(overview.vehicles, ev.vehicles.size);
      assert.equal(overview.chargingStations, ev.chargingStations.size);
      assert.ok(overview.totalEnergy.includes('kWh'));
      assert.ok(overview.totalCost.includes('SEK'));
    });

    it('getVehiclesList returns array of vehicles', async () => {
      await ev.initialize();
      const list = ev.getVehiclesList();
      assert.ok(Array.isArray(list));
      assert.ok(list.length >= 2);
      assert.ok(list[0].name);
      assert.ok(list[0].battery.includes('%'));
    });

    it('getChargingHistory returns array', async () => {
      await ev.initialize();
      const hist = ev.getChargingHistory(30);
      assert.ok(Array.isArray(hist));
    });

    it('getEnergyPriceSchedule returns price list', async () => {
      await ev.initialize();
      const sched = ev.getEnergyPriceSchedule();
      assert.ok(Array.isArray(sched));
      assert.ok(sched.length > 0);
      assert.ok(sched[0].hour);
      assert.ok(sched[0].price.includes('SEK'));
    });
  });

  // ── destroy ──
  describe('destroy', () => {
    it('clears intervals', async () => {
      await ev.initialize();
      ev.destroy();
      assert.deepEqual(ev._intervals, []);
    });
  });
});
