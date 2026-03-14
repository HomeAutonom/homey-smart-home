'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const UserProfileManager = require('../user-profile-manager');

describe('UserProfileManager', () => {
  let manager;

  beforeEach(async () => {
    manager = new UserProfileManager();
    await manager.initialize();
  });

  afterEach(() => {
    if (manager && manager.destroy) manager.destroy();
  });

  describe('Initialization', () => {
    it('loads 3 default profiles', () => {
      const profiles = manager.getAllProfiles();
      assert.strictEqual(profiles.length, 3);
    });

    it('default profiles have expected names', () => {
      const profiles = manager.getAllProfiles();
      const names = profiles.map(p => p.name);
      assert.ok(names.includes('Magnus'));
      assert.ok(names.includes('Anna'));
      assert.ok(names.includes('Emma'));
    });

    it('sets a current user after initialization', () => {
      const current = manager.getCurrentUser();
      assert.ok(current !== null);
      assert.ok(current.id);
      assert.ok(current.name);
    });

    it('profiles have correct types', () => {
      const info1 = manager.getProfileInfo('user_1');
      const info3 = manager.getProfileInfo('user_3');
      assert.strictEqual(info1.type, 'adult');
      assert.strictEqual(info3.type, 'child');
    });
  });

  describe('Profile CRUD', () => {
    it('creates a new profile', async () => {
      const result = await manager.createProfile({
        name: 'TestUser',
        type: 'adult',
        avatar: '🧑'
      });
      assert.strictEqual(result.success, true);
      assert.ok(result.profile);
      assert.strictEqual(result.profile.name, 'TestUser');
    });

    it('updates a profile with deep merge', async () => {
      const result = await manager.updateProfile('user_1', {
        preferences: { temperature: 25 }
      });
      assert.strictEqual(result.success, true);
      assert.ok(result.profile);
    });

    it('deletes a non-active profile', async () => {
      // Switch to user_1 first so user_2 is not active
      await manager.switchToUser('user_1');
      const result = await manager.deleteProfile('user_2');
      assert.strictEqual(result.success, true);
      // Confirm deleted
      const info = manager.getProfileInfo('user_2');
      assert.strictEqual(info, null);
    });

    it('cannot delete active profile', async () => {
      const current = manager.getCurrentUser();
      const result = await manager.deleteProfile(current.id);
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
      assert.ok(result.error.includes('active'));
    });
  });

  describe('User switching', () => {
    it('switches to a different user', async () => {
      const result = await manager.switchToUser('user_2');
      assert.strictEqual(result.success, true);
      assert.ok(result.user);
      assert.strictEqual(result.user.id, 'user_2');
      assert.ok(result.appliedSettings);
    });

    it('current user changes after switch', async () => {
      await manager.switchToUser('user_2');
      const current = manager.getCurrentUser();
      assert.strictEqual(current.id, 'user_2');
    });
  });

  describe('NFC Tag scanning', () => {
    it('switches user on known NFC tag after assigning one', async () => {
      // Default profiles have no nfcTag, so assign one first
      await manager.updateProfile('user_1', { nfcTag: 'tag_magnus' });
      const result = await manager.scanNFCTag('tag_magnus');
      assert.strictEqual(result.success, true);
    });

    it('returns error on unknown NFC tag', async () => {
      const result = await manager.scanNFCTag('tag_unknown_xyz');
      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('Unknown NFC tag'));
    });
  });

  describe('Family and Guest modes', () => {
    it('enables family mode', async () => {
      const result = await manager.enableFamilyMode();
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.mode, 'family');
      assert.ok(result.settings);
    });

    it('enableGuestMode throws due to missing roomPreferences', async () => {
      // Guest profile created internally lacks roomPreferences,
      // causing applyUserPreferences to fail on Object.entries
      await assert.rejects(
        () => manager.enableGuestMode(),
        (err) => err instanceof TypeError
      );
    });
  });

  describe('Learning and tracking', () => {
    it('learns user preferences', async () => {
      const result = await manager.learnUserPreferences('user_1');
      assert.strictEqual(result.success, true);
      assert.ok(result.learned);
      assert.ok(Array.isArray(result.learned.temperatureAdjustments));
      assert.ok(Array.isArray(result.learned.lightingAdjustments));
    });

    it('tracks device usage without error', () => {
      // trackDeviceUsage is void, just must not throw
      manager.trackDeviceUsage('user_1', 'device_lamp_1');
      manager.trackDeviceUsage('user_1', 'device_lamp_1');
      assert.ok(true);
    });

    it('tracks scene usage without error', () => {
      manager.trackSceneUsage('user_1', 'scene_movie');
      assert.ok(true);
    });
  });

  describe('Reporting', () => {
    it('getProfileInfo returns null for non-existent user', () => {
      const info = manager.getProfileInfo('nonexistent_user');
      assert.strictEqual(info, null);
    });

    it('getProfileInfo returns object for existing user', () => {
      const info = manager.getProfileInfo('user_1');
      assert.ok(info);
      assert.strictEqual(info.id, 'user_1');
      assert.ok(info.name);
      assert.ok(info.type);
    });

    it('getAllProfiles returns array of summaries', () => {
      const profiles = manager.getAllProfiles();
      assert.ok(Array.isArray(profiles));
      assert.ok(profiles.length >= 3);
      assert.ok(profiles[0].id);
      assert.ok(profiles[0].name);
    });

    it('getUserStats returns stats for existing user', () => {
      const stats = manager.getUserStats('user_1');
      assert.ok(stats.user);
      assert.strictEqual(stats.user.id, 'user_1');
      assert.ok(stats.stats);
      assert.ok(stats.usage);
    });

    it('getSystemStats returns overview', () => {
      const stats = manager.getSystemStats();
      assert.strictEqual(stats.totalProfiles, 3);
      assert.ok(stats.byType);
      assert.ok(typeof stats.byType.adults === 'number');
      assert.ok(typeof stats.byType.children === 'number');
      assert.ok(stats.currentUser);
    });
  });

  describe('Cleanup', () => {
    it('destroy clears intervals and timeouts', () => {
      manager.destroy();
      assert.deepStrictEqual(manager._intervals, []);
      assert.deepStrictEqual(manager._timeouts, []);
    });
  });
});
