'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const SceneBuilderModule = require('../modules/scene-builder');

describe('SceneBuilderModule', () => {
  let mod;
  let mockApp;

  beforeEach(() => {
    mockApp = { homeyClient: null };
    mod = new SceneBuilderModule(mockApp);
  });

  afterEach(() => {
    mod.destroy();
  });

  describe('constructor', () => {
    it('initializes with empty scenes', () => {
      assert.deepStrictEqual(mod.scenes, {});
    });

    it('stores the app reference', () => {
      assert.strictEqual(mod.app, mockApp);
    });

    it('has no refresh interval initially', () => {
      assert.strictEqual(mod._refreshInterval, null);
    });
  });

  describe('getScenes', () => {
    it('returns the current scenes object', () => {
      assert.deepStrictEqual(mod.getScenes(), {});
    });

    it('returns scenes after manual assignment', () => {
      mod.scenes = { 'scene-1': { name: 'Night Mode' } };
      const result = mod.getScenes();
      assert.strictEqual(result['scene-1'].name, 'Night Mode');
    });
  });

  describe('initialize', () => {
    it('starts the refresh interval', async () => {
      await mod.initialize();
      assert.ok(mod._refreshInterval !== null);
    });

    it('does not throw when homeyClient is null', async () => {
      await assert.doesNotReject(() => mod.initialize());
    });
  });

  describe('_loadScenes', () => {
    it('loads scenes from a mock client', async () => {
      mockApp.homeyClient = {
        request: async () => ({ scenes: { 's1': { name: 'Morning' } } }),
      };
      await mod._loadScenes();
      assert.strictEqual(mod.scenes.s1.name, 'Morning');
    });

    it('ignores response without scenes property', async () => {
      mockApp.homeyClient = {
        request: async () => ({ other: 'data' }),
      };
      mod.scenes = { existing: true };
      await mod._loadScenes();
      assert.deepStrictEqual(mod.scenes, { existing: true });
    });

    it('falls back silently on request error', async () => {
      mockApp.homeyClient = {
        request: async () => { throw new Error('network error'); },
      };
      mod.scenes = { cached: true };
      await mod._loadScenes();
      assert.deepStrictEqual(mod.scenes, { cached: true });
    });

    it('does nothing when homeyClient is null', async () => {
      await mod._loadScenes();
      assert.deepStrictEqual(mod.scenes, {});
    });
  });

  describe('registerSocketEvents', () => {
    it('registers connection handler on io', () => {
      let registeredEvent = null;
      const mockIo = {
        on: (event, _handler) => { registeredEvent = event; },
      };
      mod.registerSocketEvents(mockIo);
      assert.strictEqual(registeredEvent, 'connection');
    });
  });

  describe('registerRoutes', () => {
    it('exists and is callable', () => {
      assert.strictEqual(typeof mod.registerRoutes, 'function');
      assert.doesNotThrow(() => mod.registerRoutes({}));
    });
  });

  describe('destroy', () => {
    it('clears the refresh interval', async () => {
      await mod.initialize();
      assert.ok(mod._refreshInterval !== null);
      mod.destroy();
      assert.strictEqual(mod._refreshInterval, null);
    });

    it('is safe to call multiple times', () => {
      assert.doesNotThrow(() => {
        mod.destroy();
        mod.destroy();
      });
    });
  });
});
