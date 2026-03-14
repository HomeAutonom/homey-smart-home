'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const SmartLighting = require('../smart-lighting-choreographer');

describe('SmartLightingChoreographer', () => {
  let lc;

  beforeEach(() => {
    lc = new SmartLighting({});
  });

  afterEach(() => {
    lc.destroy();
  });

  // ── Constructor ──
  describe('constructor', () => {
    it('initializes data structures', () => {
      assert.ok(lc.lights instanceof Map);
      assert.ok(lc.lightingScenes instanceof Map);
      assert.ok(lc.circadianSchedule instanceof Map);
      assert.ok(lc.choreographies instanceof Map);
      assert.equal(lc.musicSync, false);
      assert.ok(Array.isArray(lc._intervals));
    });
  });

  // ── Initialize ──
  describe('initialize', () => {
    it('populates lights and scenes', async () => {
      await lc.initialize();
      assert.ok(lc.lights.size > 0);
      assert.ok(lc.lightingScenes.size > 0);
      assert.ok(lc.circadianSchedule.size > 0);
      assert.ok(lc.choreographies.size > 0);
    });
  });

  // ── turnOn / turnOff ──
  describe('turnOn / turnOff', () => {
    it('turns on a light', async () => {
      await lc.initialize();
      const ids = Array.from(lc.lights.keys());
      const result = await lc.turnOn(ids[0]);
      assert.equal(result.success, true);
      assert.equal(lc.lights.get(ids[0]).on, true);
    });

    it('turns on with custom brightness', async () => {
      await lc.initialize();
      const ids = Array.from(lc.lights.keys());
      await lc.turnOn(ids[0], 50);
      assert.equal(lc.lights.get(ids[0]).brightness, 50);
    });

    it('turns off a light', async () => {
      await lc.initialize();
      const ids = Array.from(lc.lights.keys());
      await lc.turnOn(ids[0]);
      const result = await lc.turnOff(ids[0]);
      assert.equal(result.success, true);
      assert.equal(lc.lights.get(ids[0]).on, false);
    });

    it('returns error for unknown light', async () => {
      await lc.initialize();
      const result = await lc.turnOn('nonexistent');
      assert.equal(result.success, false);
    });
  });

  // ── setBrightness ──
  describe('setBrightness', () => {
    it('sets brightness and turns on if needed', async () => {
      await lc.initialize();
      const ids = Array.from(lc.lights.keys());
      await lc.turnOff(ids[0]);
      const result = await lc.setBrightness(ids[0], 75);
      assert.equal(result.success, true);
      assert.equal(lc.lights.get(ids[0]).brightness, 75);
      assert.equal(lc.lights.get(ids[0]).on, true);
    });

    it('clamps brightness to 0-100', async () => {
      await lc.initialize();
      const ids = Array.from(lc.lights.keys());
      await lc.setBrightness(ids[0], 200);
      assert.equal(lc.lights.get(ids[0]).brightness, 100);
      await lc.setBrightness(ids[0], -50);
      assert.equal(lc.lights.get(ids[0]).brightness, 0);
    });

    it('returns error for unknown light', async () => {
      await lc.initialize();
      const result = await lc.setBrightness('fake', 50);
      assert.equal(result.success, false);
    });
  });

  // ── setColor ──
  describe('setColor', () => {
    it('sets color on RGB light', async () => {
      await lc.initialize();
      // Find an RGB light
      const rgbId = Array.from(lc.lights.entries())
        .find(([, l]) => l.type === 'rgb')?.[0];
      if (rgbId) {
        const result = await lc.setColor(rgbId, 255, 0, 128);
        assert.equal(result.success, true);
        assert.deepEqual(lc.lights.get(rgbId).color, { r: 255, g: 0, b: 128 });
      }
    });

    it('fails on non-RGB light', async () => {
      await lc.initialize();
      const nonRgb = Array.from(lc.lights.entries())
        .find(([, l]) => l.type !== 'rgb')?.[0];
      if (nonRgb) {
        const result = await lc.setColor(nonRgb, 255, 0, 0);
        assert.equal(result.success, false);
      }
    });
  });

  // ── setTemperature ──
  describe('setTemperature', () => {
    it('sets color temperature', async () => {
      await lc.initialize();
      const ids = Array.from(lc.lights.keys());
      const result = await lc.setTemperature(ids[0], 4000);
      assert.equal(result.success, true);
      assert.equal(lc.lights.get(ids[0]).temperature, 4000);
    });

    it('clamps temperature to valid range', async () => {
      await lc.initialize();
      const ids = Array.from(lc.lights.keys());
      await lc.setTemperature(ids[0], 1000);
      assert.equal(lc.lights.get(ids[0]).temperature, 2000);
      await lc.setTemperature(ids[0], 9000);
      assert.equal(lc.lights.get(ids[0]).temperature, 6500);
    });
  });

  // ── controlRoom ──
  describe('controlRoom', () => {
    it('controls lights in a valid room', async () => {
      await lc.initialize();
      const result = await lc.controlRoom('living_room', 'on');
      assert.equal(result.success, true);
    });

    it('fails for empty room', async () => {
      await lc.initialize();
      const result = await lc.controlRoom('nonexistent_room', 'on');
      assert.equal(result.success, false);
    });
  });

  // ── activateScene ──
  describe('activateScene', () => {
    it('activates a known scene', async () => {
      await lc.initialize();
      const sceneId = Array.from(lc.lightingScenes.keys())[0];
      const result = await lc.activateScene(sceneId);
      assert.equal(result.success, true);
    });

    it('fails for unknown scene', async () => {
      await lc.initialize();
      const result = await lc.activateScene('fake_scene');
      assert.equal(result.success, false);
    });
  });

  // ── Music sync ──
  describe('music sync', () => {
    it('enables music sync', async () => {
      await lc.enableMusicSync(true);
      assert.equal(lc.musicSync, true);
    });

    it('disables music sync', async () => {
      await lc.enableMusicSync(true);
      await lc.enableMusicSync(false);
      assert.equal(lc.musicSync, false);
    });
  });

  // ── Reporting ──
  describe('reporting', () => {
    it('getLightingOverview returns stats', async () => {
      await lc.initialize();
      const overview = lc.getLightingOverview();
      assert.equal(overview.totalLights, lc.lights.size);
      assert.equal(typeof overview.onLights, 'number');
      assert.ok(overview.scenes > 0);
      assert.equal(overview.musicSync, 'Disabled');
    });

    it('getLightsByRoom returns grouped object', async () => {
      await lc.initialize();
      const rooms = lc.getLightsByRoom();
      assert.equal(typeof rooms, 'object');
      assert.ok(Object.keys(rooms).length > 0);
      const firstRoom = Object.values(rooms)[0];
      assert.ok(Array.isArray(firstRoom));
    });

    it('getScenesList returns array', async () => {
      await lc.initialize();
      const scenes = lc.getScenesList();
      assert.ok(Array.isArray(scenes));
      assert.ok(scenes.length > 0);
      assert.ok(scenes[0].name);
    });

    it('getCircadianStatus returns current phase', async () => {
      await lc.initialize();
      const status = lc.getCircadianStatus();
      // May be null if no matching schedule entry
      if (status) {
        assert.ok(status.temperature);
        assert.ok(status.brightness);
      }
    });
  });

  // ── destroy ──
  describe('destroy', () => {
    it('clears intervals', async () => {
      await lc.initialize();
      lc.destroy();
      assert.deepEqual(lc._intervals, []);
    });
  });
});
