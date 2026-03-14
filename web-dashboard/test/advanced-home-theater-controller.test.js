'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const AdvancedHomeTheaterController = require('../advanced-home-theater-controller');

describe('AdvancedHomeTheaterController', () => {
  let mod;

  beforeEach(async () => {
    mod = new AdvancedHomeTheaterController({ emit: () => {} });
    await mod.initialize();
  });

  afterEach(() => {
    mod.destroy();
  });

  describe('constructor and initialize', () => {
    it('sets up 8 devices', () => {
      assert.ok(mod.devices instanceof Map);
      assert.strictEqual(mod.devices.size, 8);
    });

    it('has expected device IDs', () => {
      assert.ok(mod.devices.has('tv_main'));
      assert.ok(mod.devices.has('receiver'));
      assert.ok(mod.devices.has('bluray'));
      assert.ok(mod.devices.has('apple_tv'));
      assert.ok(mod.devices.has('soundbar'));
      assert.ok(mod.devices.has('projector'));
      assert.ok(mod.devices.has('gaming'));
      assert.ok(mod.devices.has('screen'));
    });

    it('sets up 5 activities', () => {
      assert.ok(mod.activities instanceof Map);
      assert.strictEqual(mod.activities.size, 5);
    });

    it('starts with no current activity', () => {
      assert.strictEqual(mod.currentActivity, null);
    });
  });

  describe('controlDevice', () => {
    it('powers on a device', async () => {
      const result = await mod.controlDevice('tv_main', 'power_on');
      assert.strictEqual(result.success, true);
      assert.strictEqual(mod.devices.get('tv_main').power, 'on');
    });

    it('powers off a device', async () => {
      await mod.controlDevice('tv_main', 'power_on');
      const result = await mod.controlDevice('tv_main', 'power_off');
      assert.strictEqual(result.success, true);
      assert.strictEqual(mod.devices.get('tv_main').power, 'off');
    });

    it('adjusts volume', async () => {
      const result = await mod.controlDevice('receiver', 'volume', 50);
      assert.strictEqual(result.success, true);
      assert.strictEqual(mod.devices.get('receiver').volume, 50);
    });

    it('mutes and unmutes', async () => {
      const muteResult = await mod.controlDevice('receiver', 'mute');
      assert.strictEqual(muteResult.success, true);

      const unmuteResult = await mod.controlDevice('receiver', 'unmute');
      assert.strictEqual(unmuteResult.success, true);
    });

    it('changes input', async () => {
      const result = await mod.controlDevice('tv_main', 'input', 'HDMI2');
      assert.strictEqual(result.success, true);
    });

    it('returns error for unknown device', async () => {
      const result = await mod.controlDevice('unknown_device', 'power_on');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Device not found');
    });

    it('returns error for unknown command', async () => {
      const result = await mod.controlDevice('tv_main', 'unknown_command');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Unknown command');
    });
  });

  describe('startActivity and stopActivity', () => {
    it('starts movie activity', async () => {
      const result = await mod.startActivity('movie');
      assert.strictEqual(result.success, true);
      assert.strictEqual(mod.currentActivity, 'movie');
    });

    it('starts gaming activity', async () => {
      const result = await mod.startActivity('gaming');
      assert.strictEqual(result.success, true);
      assert.strictEqual(mod.currentActivity, 'gaming');
    });

    it('stops active activity', async () => {
      await mod.startActivity('movie');
      const result = await mod.stopActivity();
      assert.strictEqual(result.success, true);
      assert.strictEqual(mod.currentActivity, null);
    });

    it('returns error when stopping with no activity', async () => {
      const result = await mod.stopActivity();
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    it('switches between activities', async () => {
      await mod.startActivity('movie');
      const result = await mod.startActivity('gaming');
      assert.strictEqual(result.success, true);
      assert.strictEqual(mod.currentActivity, 'gaming');
    });
  });

  describe('calibration', () => {
    it('calibrates audio system', async () => {
      const result = await mod.calibrateAudio();
      assert.strictEqual(result.success, true);
      assert.ok(result.calibration.speakerDistances);
      assert.ok(result.calibration.levels);
    });

    it('calibrates video settings', async () => {
      const result = await mod.calibrateVideo();
      assert.strictEqual(result.success, true);
      assert.ok(typeof result.calibration.brightness === 'number');
      assert.ok(result.calibration.hdrMode);
    });
  });

  describe('picture optimization', () => {
    it('optimizes for movies', async () => {
      const result = await mod.optimizePictureForMovies();
      assert.strictEqual(result.success, true);
      assert.strictEqual(mod.devices.get('tv_main').settings.pictureMode, 'movie');
    });

    it('optimizes for sports', async () => {
      const result = await mod.optimizePictureForSports();
      assert.strictEqual(result.success, true);
      assert.strictEqual(mod.devices.get('tv_main').settings.pictureMode, 'vivid');
    });

    it('optimizes for gaming', async () => {
      const result = await mod.optimizePictureForGaming();
      assert.strictEqual(result.success, true);
      assert.strictEqual(mod.devices.get('tv_main').settings.pictureMode, 'game');
    });
  });

  describe('sendRemoteCommand', () => {
    it('sends play command', async () => {
      const result = await mod.sendRemoteCommand('tv_main', 'play');
      assert.strictEqual(result.success, true);
    });

    it('adjusts volume up', async () => {
      const before = mod.devices.get('receiver').volume;
      await mod.sendRemoteCommand('receiver', 'volume_up');
      const after = mod.devices.get('receiver').volume;
      assert.strictEqual(after, Math.min(100, before + 5));
    });

    it('adjusts volume down', async () => {
      mod.devices.get('receiver').volume = 50;
      await mod.sendRemoteCommand('receiver', 'volume_down');
      assert.strictEqual(mod.devices.get('receiver').volume, 45);
    });

    it('returns error for unknown device', async () => {
      const result = await mod.sendRemoteCommand('unknown', 'play');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Device not found');
    });
  });

  describe('reporting', () => {
    it('returns theater overview', () => {
      const overview = mod.getTheaterOverview();
      assert.strictEqual(overview.totalDevices, 8);
      assert.strictEqual(overview.activities, 5);
      assert.strictEqual(overview.currentActivity, null);
    });

    it('returns devices list', () => {
      const list = mod.getDevicesList();
      assert.ok(Array.isArray(list));
      assert.strictEqual(list.length, 8);
      assert.ok(list[0].name);
      assert.ok(list[0].type);
      assert.ok(list[0].brand);
    });

    it('returns activities list', () => {
      const list = mod.getActivitiesList();
      assert.ok(Array.isArray(list));
      assert.strictEqual(list.length, 5);
      assert.ok(list[0].name);
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
