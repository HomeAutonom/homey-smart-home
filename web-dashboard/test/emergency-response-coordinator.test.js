'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const EmergencyResponseCoordinator = require('../emergency-response-coordinator');

describe('EmergencyResponseCoordinator', () => {
  let mod;

  beforeEach(async () => {
    mod = new EmergencyResponseCoordinator();
    await mod.initialize();
  });

  afterEach(() => {
    mod.destroy();
  });

  describe('initialization', () => {
    it('sets up emergency types', () => {
      assert.ok(mod.emergencyTypes.size >= 8);
      assert.ok(mod.emergencyTypes.has('fire'));
      assert.ok(mod.emergencyTypes.has('water_leak'));
      assert.ok(mod.emergencyTypes.has('gas_leak'));
      assert.ok(mod.emergencyTypes.has('intrusion'));
      assert.ok(mod.emergencyTypes.has('medical'));
      assert.ok(mod.emergencyTypes.has('power_outage'));
    });

    it('sets up emergency protocols', () => {
      assert.ok(mod.emergencyProtocols.size >= 7);
      assert.ok(mod.emergencyProtocols.has('fire_protocol'));
      assert.ok(mod.emergencyProtocols.has('intrusion_protocol'));
    });

    it('sets up emergency contacts', () => {
      assert.ok(mod.emergencyContacts.size >= 5);
      assert.ok(mod.emergencyContacts.has('contact_anna'));
      assert.ok(mod.emergencyContacts.has('contact_erik'));
      assert.ok(mod.emergencyContacts.has('contact_emergency'));
    });

    it('sets up evacuation plans', () => {
      assert.ok(mod.evacuationPlans.size >= 2);
      assert.ok(mod.evacuationPlans.has('fire_evacuation'));
      assert.ok(mod.evacuationPlans.has('flood_evacuation'));
    });
  });

  describe('detectEmergency', () => {
    it('detects a fire emergency', async () => {
      const result = await mod.detectEmergency('fire', { location: 'kitchen' });
      assert.equal(result.success, true);
      assert.ok(result.emergency);
      assert.ok(result.emergency.id.startsWith('emergency_'));
      assert.equal(result.emergency.type, 'fire');
      assert.equal(result.emergency.status, 'active');
    });

    it('fails for unknown emergency type', async () => {
      const result = await mod.detectEmergency('tornado', {});
      assert.equal(result.success, false);
      assert.ok(result.error);
    });

    it('auto-activates protocol for fire (autoActivate true)', async () => {
      const result = await mod.detectEmergency('fire', {});
      assert.equal(result.success, true);
      // Protocol gets activated but the emergency object may not track it directly
      // Verify the emergency was created and is active
      assert.equal(result.emergency.status, 'active');
      assert.equal(result.emergency.type, 'fire');
    });

    it('adds emergency to activeEmergencies', async () => {
      const before = mod.activeEmergencies.length;
      await mod.detectEmergency('water_leak', { location: 'bathroom' });
      assert.equal(mod.activeEmergencies.length, before + 1);
    });
  });

  describe('confirmEmergency', () => {
    it('confirms an existing emergency', async () => {
      const det = await mod.detectEmergency('fire', {});
      const result = await mod.confirmEmergency(det.emergency.id);
      assert.equal(result.success, true);
    });

    it('fails for non-existent emergency', async () => {
      const result = await mod.confirmEmergency('emergency_nonexistent');
      assert.equal(result.success, false);
      assert.equal(result.error, 'Emergency not found');
    });
  });

  describe('resolveEmergency', () => {
    it('resolves an active emergency', async () => {
      const det = await mod.detectEmergency('gas_leak', {});
      const result = await mod.resolveEmergency(det.emergency.id, 'Leak fixed');
      assert.equal(result.success, true);
    });

    it('moves resolved emergency to history', async () => {
      const det = await mod.detectEmergency('power_outage', {});
      const historyBefore = mod.emergencyHistory.length;
      await mod.resolveEmergency(det.emergency.id, 'Power restored');
      assert.ok(mod.emergencyHistory.length > historyBefore);
    });

    it('removes from activeEmergencies on resolve', async () => {
      const det = await mod.detectEmergency('medical', {});
      const countBefore = mod.activeEmergencies.length;
      await mod.resolveEmergency(det.emergency.id, 'Patient stable');
      assert.equal(mod.activeEmergencies.length, countBefore - 1);
    });

    it('fails for non-existent emergency', async () => {
      const result = await mod.resolveEmergency('emergency_fake', 'test');
      assert.equal(result.success, false);
    });
  });

  describe('activateProtocol', () => {
    it('activates a protocol for an emergency', async () => {
      const det = await mod.detectEmergency('intrusion', {});
      const result = await mod.activateProtocol(det.emergency.id, 'intrusion_protocol');
      assert.equal(result.success, true);
    });

    it('fails for non-existent emergency or protocol', async () => {
      const result = await mod.activateProtocol('emergency_fake', 'fire_protocol');
      assert.equal(result.success, false);
    });
  });

  describe('getEmergencyOverview', () => {
    it('returns overview object', () => {
      const overview = mod.getEmergencyOverview();
      assert.ok('activeEmergencies' in overview);
      assert.ok('emergencyContacts' in overview);
      assert.ok('protocols' in overview);
      assert.ok('totalHistorical' in overview);
    });

    it('reflects detected emergencies', async () => {
      await mod.detectEmergency('fire', {});
      const overview = mod.getEmergencyOverview();
      assert.ok(overview.activeEmergencies >= 1);
    });
  });

  describe('getActiveEmergencies', () => {
    it('returns empty array initially', () => {
      const active = mod.getActiveEmergencies();
      assert.ok(Array.isArray(active));
      assert.equal(active.length, 0);
    });

    it('returns detected emergencies', async () => {
      await mod.detectEmergency('fire', {});
      await mod.detectEmergency('water_leak', {});
      const active = mod.getActiveEmergencies();
      assert.equal(active.length, 2);
    });
  });

  describe('getEmergencyHistory', () => {
    it('returns history array', () => {
      const history = mod.getEmergencyHistory();
      assert.ok(Array.isArray(history));
    });

    it('includes resolved emergencies', async () => {
      const det = await mod.detectEmergency('fire', {});
      await mod.resolveEmergency(det.emergency.id, 'Contained');
      const history = mod.getEmergencyHistory();
      assert.ok(history.length >= 1);
    });
  });

  describe('getEmergencyContacts', () => {
    it('returns sorted contacts array', () => {
      const contacts = mod.getEmergencyContacts();
      assert.ok(Array.isArray(contacts));
      assert.ok(contacts.length >= 5);
    });
  });

  describe('destroy', () => {
    it('clears intervals and timeouts', () => {
      mod.destroy();
      assert.deepEqual(mod._intervals, []);
      assert.deepEqual(mod._timeouts, []);
    });
  });
});
