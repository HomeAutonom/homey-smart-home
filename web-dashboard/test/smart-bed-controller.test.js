'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const SmartBedController = require('../smart-bed-controller');

describe('SmartBedController', () => {
  let mod;

  beforeEach(async () => {
    mod = new SmartBedController({ emit: () => {} });
    await mod.initialize();
  });

  afterEach(() => {
    mod.destroy();
  });

  describe('constructor and initialize', () => {
    it('sets up beds map', () => {
      assert.ok(mod.beds instanceof Map);
      assert.ok(mod.beds.size >= 2);
    });

    it('creates master and guest beds', () => {
      assert.ok(mod.beds.has('bed_master'));
      assert.ok(mod.beds.has('bed_guest'));
    });

    it('master bed is dual zone with Anna and Erik', () => {
      const master = mod.beds.get('bed_master');
      assert.strictEqual(master.type, 'dual');
      assert.strictEqual(master.sides.left.user, 'Anna');
      assert.strictEqual(master.sides.right.user, 'Erik');
    });
  });

  describe('adjustPosition', () => {
    it('adjusts head position within range', async () => {
      const result = await mod.adjustPosition('bed_master', 'left', 'head', 20);
      assert.strictEqual(result.success, true);
    });

    it('clamps position to max 45', async () => {
      const result = await mod.adjustPosition('bed_master', 'left', 'head', 60);
      assert.strictEqual(result.success, true);
      const bed = mod.beds.get('bed_master');
      assert.ok(bed.sides.left.position.head <= 45);
    });

    it('clamps position to min 0', async () => {
      const result = await mod.adjustPosition('bed_master', 'left', 'head', -10);
      assert.strictEqual(result.success, true);
      const bed = mod.beds.get('bed_master');
      assert.ok(bed.sides.left.position.head >= 0);
    });

    it('returns error for unknown bed', async () => {
      const result = await mod.adjustPosition('bed_unknown', 'left', 'head', 20);
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('setTemperature', () => {
    it('sets temperature within range', async () => {
      const result = await mod.setTemperature('bed_master', 'left', 22);
      assert.strictEqual(result.success, true);
    });

    it('clamps temperature to max 30', async () => {
      const result = await mod.setTemperature('bed_master', 'left', 35);
      assert.strictEqual(result.success, true);
      const bed = mod.beds.get('bed_master');
      assert.ok(bed.sides.left.temperature <= 30);
    });

    it('clamps temperature to min 15', async () => {
      const result = await mod.setTemperature('bed_master', 'left', 10);
      assert.strictEqual(result.success, true);
      const bed = mod.beds.get('bed_master');
      assert.ok(bed.sides.left.temperature >= 15);
    });

    it('returns error for unknown bed', async () => {
      const result = await mod.setTemperature('bed_unknown', 'left', 22);
      assert.strictEqual(result.success, false);
    });
  });

  describe('setFirmness', () => {
    it('sets firmness within range', async () => {
      const result = await mod.setFirmness('bed_master', 'left', 5);
      assert.strictEqual(result.success, true);
    });

    it('clamps firmness to max 10', async () => {
      const result = await mod.setFirmness('bed_master', 'left', 15);
      assert.strictEqual(result.success, true);
      const bed = mod.beds.get('bed_master');
      assert.ok(bed.sides.left.firmness <= 10);
    });

    it('clamps firmness to min 1', async () => {
      const result = await mod.setFirmness('bed_master', 'left', 0);
      assert.strictEqual(result.success, true);
      const bed = mod.beds.get('bed_master');
      assert.ok(bed.sides.left.firmness >= 1);
    });
  });

  describe('startMassage and stopMassage', () => {
    it('starts massage with valid program', async () => {
      const result = await mod.startMassage('bed_master', 'left', 'wave', 5);
      assert.strictEqual(result.success, true);
    });

    it('rejects invalid massage program', async () => {
      const result = await mod.startMassage('bed_master', 'left', 'invalid_program', 5);
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    it('stops massage', async () => {
      await mod.startMassage('bed_master', 'left', 'wave', 5);
      const result = await mod.stopMassage('bed_master', 'left');
      assert.strictEqual(result.success, true);
    });
  });

  describe('detectOccupancy', () => {
    it('returns occupied boolean', async () => {
      const result = await mod.detectOccupancy('bed_master', 'left');
      assert.ok(typeof result.occupied === 'boolean');
    });
  });

  describe('sleep session lifecycle', () => {
    it('starts a sleep session', async () => {
      const result = await mod.startSleepSession('bed_master', 'left');
      assert.ok(result.id);
      assert.strictEqual(result.bedId, 'bed_master');
      assert.ok(mod.sleepSessions.length > 0);
    });

    it('ends a sleep session with quality score', async () => {
      await mod.startSleepSession('bed_master', 'left');
      // Let session exist for a moment
      const result = await mod.endSleepSession('bed_master', 'left');
      assert.strictEqual(result.success, true);
    });
  });

  describe('calculateSleepQuality', () => {
    it('returns max quality for perfect sleep', () => {
      const session = {
        movements: 0,
        snoreEvents: 0,
        startTime: Date.now() - 8 * 60 * 60 * 1000,
        endTime: Date.now()
      };
      session.duration = (session.endTime - session.startTime) / (60 * 1000);
      const quality = mod.calculateSleepQuality(session);
      assert.strictEqual(quality, 100);
    });

    it('deducts for movements and snoring', () => {
      const session = {
        movements: 10,
        snoreEvents: 5,
        startTime: Date.now() - 8 * 60 * 60 * 1000,
        endTime: Date.now()
      };
      session.duration = (session.endTime - session.startTime) / (60 * 1000);
      const quality = mod.calculateSleepQuality(session);
      // 100 - 10*2 - 5*3 = 65
      assert.strictEqual(quality, 65);
    });

    it('clamps quality to 0 minimum', () => {
      const session = {
        movements: 50,
        snoreEvents: 50,
        startTime: Date.now() - 8 * 60 * 60 * 1000,
        endTime: Date.now()
      };
      session.duration = (session.endTime - session.startTime) / (60 * 1000);
      const quality = mod.calculateSleepQuality(session);
      assert.strictEqual(quality, 0);
    });
  });

  describe('trackSleepStages', () => {
    it('tracks stages for active session', async () => {
      await mod.startSleepSession('bed_master', 'left');
      const sessionId = mod.sleepSessions[mod.sleepSessions.length - 1].id;
      const result = await mod.trackSleepStages(sessionId);
      assert.ok(result.stage);
      assert.ok(typeof result.heartRate === 'number');
      assert.ok(typeof result.respiratoryRate === 'number');
    });

    it('returns failure for unknown session', async () => {
      const result = await mod.trackSleepStages('unknown_session');
      assert.strictEqual(result.success, false);
    });
  });

  describe('detectSnoring', () => {
    it('returns snoring boolean', async () => {
      const result = await mod.detectSnoring('bed_master', 'left');
      assert.ok(typeof result.snoring === 'boolean');
    });
  });

  describe('routines', () => {
    it('activates sleep mode', async () => {
      const result = await mod.activateSleepMode('bed_master', 'left');
      assert.strictEqual(result.success, true);
    });

    it('triggers wake-up routine', async () => {
      const result = await mod.triggerWakeUpRoutine('bed_master', 'left');
      assert.strictEqual(result.success, true);
      assert.ok(result.user);
    });
  });

  describe('setPreset', () => {
    it('sets flat preset', async () => {
      const result = await mod.setPreset('bed_master', 'left', 'flat');
      assert.strictEqual(result.success, true);
    });

    it('sets zero_gravity preset', async () => {
      const result = await mod.setPreset('bed_master', 'left', 'zero_gravity');
      assert.strictEqual(result.success, true);
    });

    it('rejects unknown preset', async () => {
      const result = await mod.setPreset('bed_master', 'left', 'nonexistent');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Unknown preset');
    });
  });

  describe('reporting', () => {
    it('returns bed overview', () => {
      const overview = mod.getBedOverview();
      assert.strictEqual(overview.totalBeds, 2);
      assert.ok(typeof overview.activeSleepSessions === 'number');
      assert.ok(typeof overview.totalSleepSessions === 'number');
    });

    it('returns bed status list', () => {
      const status = mod.getBedStatus();
      assert.ok(Array.isArray(status));
      assert.ok(status.length >= 2);
    });

    it('returns sleep report', () => {
      const report = mod.getSleepReport('Anna', 7);
      assert.strictEqual(report.user, 'Anna');
      assert.ok(report.period);
    });
  });

  describe('destroy', () => {
    it('clears intervals and timeouts', () => {
      mod.destroy();
      assert.strictEqual(mod._intervals.length, 0);
      assert.strictEqual(mod._timeouts.length, 0);
    });
  });
});
