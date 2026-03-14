'use strict';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

// Timer tracking wrapper
const originalSetInterval = global.setInterval;
const originalSetTimeout = global.setTimeout;
const originalClearInterval = global.clearInterval;
const originalClearTimeout = global.clearTimeout;
let trackedIntervals = [];
let trackedTimeouts = [];

describe('MoodLightingSystem', () => {
  let lighting;

  before(() => {
    global.setInterval = (...args) => {
      const id = originalSetInterval(...args);
      trackedIntervals.push(id);
      return id;
    };
    global.setTimeout = (...args) => {
      const id = originalSetTimeout(...args);
      trackedTimeouts.push(id);
      return id;
    };
  });

  after(() => {
    global.setInterval = originalSetInterval;
    global.setTimeout = originalSetTimeout;
    global.clearInterval = originalClearInterval;
    global.clearTimeout = originalClearTimeout;
  });

  beforeEach(async () => {
    const MoodLightingSystem = require('../mood-lighting');
    lighting = new MoodLightingSystem();
    await lighting.initialize();
  });

  afterEach(() => {
    if (lighting && typeof lighting.destroy === 'function') {
      lighting.destroy();
    }
    for (const id of trackedIntervals) originalClearInterval(id);
    for (const id of trackedTimeouts) originalClearTimeout(id);
    trackedIntervals = [];
    trackedTimeouts = [];
  });

  describe('Initialization', () => {
    it('should have lights map', () => {
      assert.ok(lighting.lights instanceof Map);
      assert.ok(lighting.lights.size > 0);
    });

    it('should have scenes map', () => {
      assert.ok(lighting.scenes instanceof Map);
      assert.ok(lighting.scenes.size > 0);
    });

    it('should have moods map', () => {
      assert.ok(lighting.moods instanceof Map);
      assert.ok(lighting.moods.size > 0);
    });

    it('should have schedules map', () => {
      assert.ok(lighting.schedules instanceof Map);
      assert.ok(lighting.schedules.size > 0);
    });

    it('should have circadianMode enabled', () => {
      assert.strictEqual(lighting.circadianMode, true);
    });

    it('should have neutral currentMood', () => {
      assert.strictEqual(lighting.currentMood, 'neutral');
    });

    it('should have intervals and timeouts arrays', () => {
      assert.ok(Array.isArray(lighting._intervals));
      assert.ok(Array.isArray(lighting._timeouts));
    });
  });

  describe('Current Status', () => {
    it('should return current status', () => {
      const status = lighting.getCurrentStatus();
      assert.ok(status);
      assert.strictEqual(typeof status.lightsOn, 'number');
      assert.strictEqual(typeof status.lightsOff, 'number');
      assert.strictEqual(status.currentMood, 'neutral');
      assert.strictEqual(status.circadianMode, true);
      assert.strictEqual(typeof status.averageBrightness, 'number');
    });
  });

  describe('Light Management', () => {
    it('should return all lights', () => {
      const lights = lighting.getAllLights();
      assert.ok(Array.isArray(lights));
      assert.ok(lights.length > 0);
      assert.ok(lights[0].id);
      assert.ok(lights[0].name);
      assert.ok(lights[0].room);
    });

    it('should return lights for a specific room', () => {
      const roomLights = lighting.getRoomLights('living_room');
      assert.ok(Array.isArray(roomLights));
      assert.ok(roomLights.length > 0);
      for (const light of roomLights) {
        assert.ok(light.id);
        assert.ok(light.name);
      }
    });

    it('should return empty array for unknown room', () => {
      const roomLights = lighting.getRoomLights('nonexistent_room');
      assert.ok(Array.isArray(roomLights));
      assert.strictEqual(roomLights.length, 0);
    });

    it('should set light settings', async () => {
      const result = await lighting.setLight('living_ceiling', { on: true, brightness: 75 });
      assert.ok(result.success);
      assert.ok(result.light);
      assert.strictEqual(result.light.on, true);
      assert.strictEqual(result.light.brightness, 75);
    });

    it('should fail for unknown light', async () => {
      const result = await lighting.setLight('no_such_light', { on: true });
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Light not found');
    });

    it('should clamp brightness to 0-100', async () => {
      const result = await lighting.setLight('living_ceiling', { brightness: 150 });
      assert.ok(result.success);
      assert.strictEqual(result.light.brightness, 100);
    });
  });

  describe('Mood Management', () => {
    it('should return all moods', () => {
      const moods = lighting.getAllMoods();
      assert.ok(Array.isArray(moods));
      assert.ok(moods.length > 0);
      const mood = moods[0];
      assert.ok(mood.id);
      assert.ok(mood.name);
      assert.ok(mood.description);
      assert.ok(mood.color);
    });

    it('should set mood', async () => {
      const result = await lighting.setMood('relaxed');
      assert.ok(result.success);
      assert.ok(result.mood);
      assert.strictEqual(lighting.currentMood, 'relaxed');
    });

    it('should fail for unknown mood', async () => {
      const result = await lighting.setMood('nonexistent');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Mood not found');
    });

    it('should set room mood', async () => {
      const result = await lighting.setRoomMood('living_room', 'relaxed');
      assert.ok(result.success);
      assert.ok(result.mood);
      assert.strictEqual(result.room, 'living_room');
    });

    it('should fail setRoomMood for unknown mood', async () => {
      const result = await lighting.setRoomMood('living_room', 'nonexistent');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Mood not found');
    });
  });

  describe('Scene Management', () => {
    it('should return all scenes', () => {
      const scenes = lighting.getAllScenes();
      assert.ok(Array.isArray(scenes));
      assert.ok(scenes.length > 0);
      const scene = scenes[0];
      assert.ok(scene.id);
      assert.ok(scene.name);
      assert.strictEqual(typeof scene.useCount, 'number');
    });

    it('should create a new scene', async () => {
      const result = await lighting.createScene({
        name: 'Test Scene',
        mood: 'relaxed',
        lights: { living_ceiling: { on: true, brightness: 50 } }
      });
      assert.ok(result.success);
      assert.ok(result.scene);
      assert.strictEqual(result.scene.name, 'Test Scene');
    });

    it('should activate a scene', async () => {
      const result = await lighting.activateScene('welcome_home');
      assert.ok(result.success);
      assert.ok(result.scene);
      assert.strictEqual(result.scene.useCount, 1);
    });

    it('should fail to activate unknown scene', async () => {
      const result = await lighting.activateScene('no_such_scene');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Scene not found');
    });
  });

  describe('Circadian Rhythm', () => {
    it('should return circadian settings', () => {
      const settings = lighting.getCircadianSettings();
      assert.ok(settings);
      assert.strictEqual(settings.enabled, true);
      assert.ok(settings.currentPhase);
      assert.strictEqual(typeof settings.recommendedColorTemp, 'number');
      assert.strictEqual(typeof settings.recommendedBrightness, 'number');
    });

    it('should return morning phase for hour 7', () => {
      assert.strictEqual(lighting.getCircadianPhase(7), 'morning');
    });

    it('should return day phase for hour 12', () => {
      assert.strictEqual(lighting.getCircadianPhase(12), 'day');
    });

    it('should return evening phase for hour 18', () => {
      assert.strictEqual(lighting.getCircadianPhase(18), 'evening');
    });

    it('should return late_evening phase for hour 21', () => {
      assert.strictEqual(lighting.getCircadianPhase(21), 'late_evening');
    });

    it('should return night phase for hour 23', () => {
      assert.strictEqual(lighting.getCircadianPhase(23), 'night');
    });

    it('should return recommended color temp', () => {
      assert.strictEqual(lighting.getRecommendedColorTemp(12), 5000);
      assert.strictEqual(lighting.getRecommendedColorTemp(21), 2700);
      assert.strictEqual(lighting.getRecommendedColorTemp(23), 2200);
    });

    it('should return recommended brightness', () => {
      assert.strictEqual(lighting.getRecommendedBrightness(12), 80);
      assert.strictEqual(lighting.getRecommendedBrightness(21), 40);
      assert.strictEqual(lighting.getRecommendedBrightness(23), 10);
    });
  });

  describe('Music Sync', () => {
    it('should sync with high energy music', async () => {
      await lighting.syncWithMusic({ tempo: 120, energy: 0.8, valence: 0.7 });
      assert.strictEqual(lighting.currentMood, 'party');
    });

    it('should sync with calm music', async () => {
      await lighting.syncWithMusic({ tempo: 60, energy: 0.3, valence: 0.6 });
      assert.strictEqual(lighting.currentMood, 'relaxed');
    });

    it('should stop music sync', () => {
      lighting.startMusicPulse(120);
      assert.ok(lighting.musicPulseInterval);
      lighting.stopMusicSync();
      assert.strictEqual(lighting.musicPulseInterval, null);
    });
  });

  describe('Cleanup', () => {
    it('should have destroy method', () => {
      assert.strictEqual(typeof lighting.destroy, 'function');
    });

    it('should clear all timers on destroy', () => {
      lighting.startMusicPulse(120);
      lighting.destroy();
      assert.strictEqual(lighting.musicPulseInterval, null);
      assert.deepStrictEqual(lighting._intervals, []);
      assert.deepStrictEqual(lighting._timeouts, []);
    });
  });
});
