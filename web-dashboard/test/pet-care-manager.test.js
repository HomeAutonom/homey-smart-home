'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const PetCareManager = require('../pet-care-manager');

describe('PetCareManager', () => {
  let manager;
  const mockApp = { log: () => {}, emit: () => {} };

  beforeEach(async () => {
    manager = new PetCareManager(mockApp);
    await manager.initialize();
  });

  afterEach(() => {
    if (manager && manager.destroy) manager.destroy();
  });

  describe('initialization', () => {
    it('loads 2 default pets', () => {
      assert.ok(manager.pets instanceof Map);
      assert.strictEqual(manager.pets.size, 2);
    });

    it('loads feeding schedules', () => {
      assert.ok(manager.feedingSchedules instanceof Map);
      assert.ok(manager.feedingSchedules.size >= 2);
    });

    it('loads health records', () => {
      assert.ok(manager.healthRecords instanceof Map);
    });

    it('loads reminders', () => {
      assert.ok(manager.reminders instanceof Map);
    });
  });

  describe('getAllPets', () => {
    it('returns 2 pets', () => {
      const pets = manager.getAllPets();
      assert.ok(Array.isArray(pets));
      assert.strictEqual(pets.length, 2);
    });
  });

  describe('getPetProfile', () => {
    it('returns profile for known pet', () => {
      const profile = manager.getPetProfile('pet_1');
      assert.ok(profile);
      assert.strictEqual(profile.name, 'Charlie');
      assert.ok('age' in profile);
    });

    it('returns null for unknown pet', () => {
      const result = manager.getPetProfile('fake_pet');
      assert.strictEqual(result, null);
    });
  });

  describe('recordFeeding', () => {
    it('records a feeding successfully', async () => {
      const result = await manager.recordFeeding('pet_1', { amount: 200, type: 'regular' });
      assert.strictEqual(result.success, true);
      assert.ok(result.feeding);
    });

    it('fails for unknown pet', async () => {
      const result = await manager.recordFeeding('fake', { amount: 100 });
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('dispenseTreat', () => {
    it('dispenses treat successfully', async () => {
      const result = await manager.dispenseTreat('pet_1', 20);
      assert.strictEqual(result.success, true);
    });

    it('fails for unknown pet', async () => {
      const result = await manager.dispenseTreat('fake', 10);
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('addHealthRecord', () => {
    it('adds a health record', async () => {
      const result = await manager.addHealthRecord('pet_1', {
        type: 'vaccination',
        description: 'Rabies booster',
        date: new Date().toISOString()
      });
      assert.strictEqual(result.success, true);
      assert.ok(result.record);
    });
  });

  describe('reminders', () => {
    it('createReminder creates a new reminder', async () => {
      const result = await manager.createReminder({
        petId: 'pet_1',
        type: 'medication',
        description: 'Give vitamins',
        time: '09:00'
      });
      assert.strictEqual(result.success, true);
      assert.ok(result.reminder);
      assert.ok(result.reminder.id);
    });

    it('completeReminder completes an existing reminder', async () => {
      const created = await manager.createReminder({
        petId: 'pet_1',
        type: 'grooming',
        description: 'Brush fur',
        time: '10:00'
      });
      const result = await manager.completeReminder(created.reminder.id);
      assert.strictEqual(result.success, true);
    });

    it('completeReminder fails for non-existent', async () => {
      const result = await manager.completeReminder('fake_reminder');
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    it('getUpcomingReminders returns array', () => {
      const reminders = manager.getUpcomingReminders();
      assert.ok(Array.isArray(reminders));
    });
  });

  describe('activity tracking', () => {
    it('getRecentActivity returns array', () => {
      const recent = manager.getRecentActivity('pet_1', 24);
      assert.ok(Array.isArray(recent));
    });

    it('getActivitySummary returns summary', () => {
      const summary = manager.getActivitySummary('pet_1', 7);
      assert.ok(typeof summary === 'object');
    });
  });

  describe('feeding history', () => {
    it('getFeedingHistory returns data for known pet', () => {
      const history = manager.getFeedingHistory('pet_1', 7);
      assert.ok(history === null || typeof history === 'object');
    });

    it('getFeedingHistory returns null for unknown pet', () => {
      const result = manager.getFeedingHistory('fake', 7);
      assert.strictEqual(result, null);
    });
  });

  describe('getHealthRecordsSummary', () => {
    it('returns summary for known pet', () => {
      const summary = manager.getHealthRecordsSummary('pet_1');
      assert.ok(summary);
      assert.ok('totalRecords' in summary);
    });
  });

  describe('getPetCareTips', () => {
    it('returns tips for dogs', () => {
      const tips = manager.getPetCareTips('dog');
      assert.ok(Array.isArray(tips));
      assert.ok(tips.length > 0);
    });

    it('returns tips for cats', () => {
      const tips = manager.getPetCareTips('cat');
      assert.ok(Array.isArray(tips));
      assert.ok(tips.length > 0);
    });
  });

  describe('destroy', () => {
    it('clears intervals', () => {
      manager.destroy();
      assert.deepStrictEqual(manager._intervals, []);
    });
  });
});
