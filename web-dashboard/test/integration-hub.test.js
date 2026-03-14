'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const IntegrationHub = require('../integration-hub');

describe('IntegrationHub', () => {
  let mod;
  const mockApp = { emit: () => {} };

  beforeEach(() => {
    mod = new IntegrationHub(mockApp);
  });

  afterEach(() => {
    mod.destroy();
  });

  describe('constructor', () => {
    it('initializes with integrations map', () => {
      assert.ok(mod.integrations instanceof Map);
    });

    it('initializes with empty sync queue', () => {
      assert.ok(Array.isArray(mod.syncQueue));
      assert.strictEqual(mod.syncQueue.length, 0);
    });

    it('initializes with empty event log', () => {
      assert.ok(Array.isArray(mod.eventLog));
      assert.strictEqual(mod.eventLog.length, 0);
    });

    it('has an empty _intervals array', () => {
      assert.ok(Array.isArray(mod._intervals));
      assert.strictEqual(mod._intervals.length, 0);
    });
  });

  describe('initialize', () => {
    it('starts intervals', async () => {
      await mod.initialize();
      assert.ok(mod._intervals.length > 0);
    });
  });

  describe('connectIntegration', () => {
    it('connects IFTTT with api key', async () => {
      await mod.initialize();
      const result = await mod.connectIntegration('ifttt', { apiKey: 'test-key-123' });
      assert.strictEqual(result.success, true);
      assert.ok(result.integration);
    });

    it('connects home_assistant with url and token', async () => {
      await mod.initialize();
      const result = await mod.connectIntegration('home_assistant', { url: 'http://localhost:8123', token: 'test' });
      assert.strictEqual(result.success, true);
    });

    it('connects alexa with credentials', async () => {
      await mod.initialize();
      const result = await mod.connectIntegration('alexa', { skillId: 's1', clientId: 'c1' });
      assert.strictEqual(result.success, true);
    });

    it('connects homekit with default config', async () => {
      await mod.initialize();
      const result = await mod.connectIntegration('homekit', {});
      assert.strictEqual(result.success, true);
    });

    it('connects smartthings with api token', async () => {
      await mod.initialize();
      const result = await mod.connectIntegration('smartthings', { apiToken: 'tok' });
      assert.strictEqual(result.success, true);
    });

    it('connects hue with bridge IP', async () => {
      await mod.initialize();
      const result = await mod.connectIntegration('hue', { bridgeIp: '192.168.1.100' });
      assert.strictEqual(result.success, true);
    });

    it('connects telegram with bot token', async () => {
      await mod.initialize();
      const result = await mod.connectIntegration('telegram', { botToken: 'bot123' });
      assert.strictEqual(result.success, true);
    });

    it('connects google_home with project config', async () => {
      await mod.initialize();
      const result = await mod.connectIntegration('google_home', { projectId: 'p1', clientId: 'c1' });
      assert.strictEqual(result.success, true);
    });

    it('returns failure for unknown integration type', async () => {
      await mod.initialize();
      const result = await mod.connectIntegration('unknown_platform', {});
      assert.strictEqual(result.success, false);
    });

    it('stores integration in the map after initialize', async () => {
      await mod.initialize();
      assert.ok(mod.integrations.has('ifttt'));
    });
  });

  describe('disconnectIntegration', () => {
    it('disconnects an existing integration', async () => {
      await mod.initialize();
      await mod.connectIntegration('alexa', { skillId: 's1', clientId: 'c1' });
      const result = await mod.disconnectIntegration('alexa');
      assert.strictEqual(result.success, true);
    });

    it('fails for non-existent integration', async () => {
      const result = await mod.disconnectIntegration('nonexistent');
      assert.strictEqual(result.success, false);
    });
  });

  describe('getIntegrationInfo', () => {
    it('returns info for connected integration', async () => {
      await mod.initialize();
      await mod.connectIntegration('homekit', {});
      const info = mod.getIntegrationInfo('homekit');
      assert.ok(info);
      assert.strictEqual(info.id, 'homekit');
    });

    it('returns null for unknown integration', () => {
      const info = mod.getIntegrationInfo('noexist');
      assert.strictEqual(info, null);
    });
  });

  describe('getAllIntegrations', () => {
    it('returns all integrations as array', async () => {
      await mod.initialize();
      const all = mod.getAllIntegrations();
      assert.ok(Array.isArray(all));
      assert.ok(all.length > 0);
    });
  });

  describe('getIntegrationStats', () => {
    it('returns integration statistics', async () => {
      await mod.initialize();
      const stats = mod.getIntegrationStats();
      assert.ok('total' in stats);
      assert.ok('connected' in stats);
      assert.ok('byType' in stats);
    });
  });

  describe('destroy', () => {
    it('clears all intervals', async () => {
      await mod.initialize();
      assert.ok(mod._intervals.length > 0);
      mod.destroy();
      assert.strictEqual(mod._intervals.length, 0);
    });
  });
});
