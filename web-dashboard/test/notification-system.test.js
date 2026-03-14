'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const NotificationSystem = require('../notification-system');

describe('NotificationSystem', () => {
  let mod;
  let mockApp;

  beforeEach(() => {
    mockApp = { homeyClient: null };
    mod = new NotificationSystem(mockApp);
  });

  afterEach(() => {
    for (const id of mod._intervals) clearInterval(id);
    mod._intervals = [];
  });

  describe('constructor', () => {
    it('stores the app reference', () => {
      assert.strictEqual(mod.app, mockApp);
    });

    it('initializes empty intervals array', () => {
      assert.ok(Array.isArray(mod._intervals));
      assert.strictEqual(mod._intervals.length, 0);
    });

    it('initializes channels as a Map', () => {
      assert.ok(mod.channels instanceof Map);
    });

    it('initializes empty notification queue', () => {
      assert.ok(Array.isArray(mod.notificationQueue));
      assert.strictEqual(mod.notificationQueue.length, 0);
    });

    it('initializes empty history', () => {
      assert.ok(Array.isArray(mod.history));
      assert.strictEqual(mod.history.length, 0);
    });

    it('initializes rules as a Map', () => {
      assert.ok(mod.rules instanceof Map);
    });

    it('sets maxHistorySize to 1000', () => {
      assert.strictEqual(mod.maxHistorySize, 1000);
    });
  });

  describe('initializeChannels', () => {
    it('creates 6 notification channels', async () => {
      await mod.initializeChannels();
      assert.strictEqual(mod.channels.size, 6);
    });

    it('includes all expected channel ids', async () => {
      await mod.initializeChannels();
      const expected = ['homey', 'mobile', 'email', 'sms', 'speech', 'dashboard'];
      for (const id of expected) {
        assert.ok(mod.channels.has(id), `Missing channel: ${id}`);
      }
    });

    it('each channel has enabled and priority properties', async () => {
      await mod.initializeChannels();
      for (const [_id, channel] of mod.channels) {
        assert.strictEqual(typeof channel.enabled, 'boolean');
        assert.ok(Array.isArray(channel.priority));
      }
    });

    it('each channel has a send function', async () => {
      await mod.initializeChannels();
      for (const [_id, channel] of mod.channels) {
        assert.strictEqual(typeof channel.send, 'function');
      }
    });
  });

  describe('initializeRules', () => {
    it('creates notification rules', () => {
      mod.initializeRules();
      assert.ok(mod.rules.size > 0);
    });

    it('includes quiet_hours rule', () => {
      mod.initializeRules();
      assert.ok(mod.rules.has('quiet_hours'));
    });

    it('includes duplicate_suppression rule', () => {
      mod.initializeRules();
      assert.ok(mod.rules.has('duplicate_suppression'));
    });

    it('includes rate_limit rule', () => {
      mod.initializeRules();
      assert.ok(mod.rules.has('rate_limit'));
    });

    it('includes category_grouping rule', () => {
      mod.initializeRules();
      assert.ok(mod.rules.has('category_grouping'));
    });

    it('each rule has a check function', () => {
      mod.initializeRules();
      for (const [_key, rule] of mod.rules) {
        assert.strictEqual(typeof rule.check, 'function');
        assert.strictEqual(typeof rule.name, 'string');
        assert.strictEqual(typeof rule.enabled, 'boolean');
      }
    });
  });

  describe('enrichNotification', () => {
    it('adds an id to the notification', () => {
      const result = mod.enrichNotification({ title: 'Test' });
      assert.ok(result.id);
    });

    it('adds a timestamp', () => {
      const result = mod.enrichNotification({ title: 'Test' });
      assert.strictEqual(typeof result.timestamp, 'number');
    });

    it('defaults priority to normal', () => {
      const result = mod.enrichNotification({ title: 'Test' });
      assert.strictEqual(result.priority, 'normal');
    });

    it('preserves provided priority', () => {
      const result = mod.enrichNotification({ title: 'Test', priority: 'critical' });
      assert.strictEqual(result.priority, 'critical');
    });

    it('defaults category to general', () => {
      const result = mod.enrichNotification({ title: 'Test' });
      assert.strictEqual(result.category, 'general');
    });

    it('provides default channels', () => {
      const result = mod.enrichNotification({ title: 'Test' });
      assert.ok(Array.isArray(result.channels));
      assert.ok(result.channels.length > 0);
    });
  });

  describe('shouldSendNotification', () => {
    beforeEach(() => {
      mod.initializeRules();
    });

    it('always allows critical notifications', () => {
      assert.strictEqual(
        mod.shouldSendNotification({ priority: 'critical' }),
        true
      );
    });

    it('allows normal notification with empty history', () => {
      assert.strictEqual(
        mod.shouldSendNotification({ priority: 'normal', title: 'Test', message: 'msg', category: 'general' }),
        true
      );
    });

    it('blocks duplicate notifications within 5 minutes', () => {
      const notification = { title: 'Dup', message: 'Same', priority: 'normal', category: 'general' };
      mod.history.push({ ...notification, timestamp: Date.now() });
      assert.strictEqual(mod.shouldSendNotification(notification), false);
    });

    it('allows duplicates after 5 minutes', () => {
      const notification = { title: 'Dup', message: 'Same', priority: 'normal', category: 'general' };
      mod.history.push({ ...notification, timestamp: Date.now() - 6 * 60 * 1000 });
      assert.strictEqual(mod.shouldSendNotification(notification), true);
    });
  });

  describe('addToHistory', () => {
    it('adds notification to history array', () => {
      mod.addToHistory({ title: 'Test', timestamp: Date.now() });
      assert.strictEqual(mod.history.length, 1);
    });

    it('trims history when exceeding maxHistorySize', () => {
      mod.maxHistorySize = 5;
      for (let i = 0; i < 10; i++) {
        mod.addToHistory({ title: `Test ${i}`, timestamp: Date.now() });
      }
      assert.ok(mod.history.length <= 5);
    });
  });

  describe('send', () => {
    it('enriches and queues the notification', async () => {
      await mod.initializeChannels();
      mod.initializeRules();
      const result = await mod.send({ title: 'Hello', message: 'World' });
      assert.ok(result);
    });
  });

  describe('processQueue', () => {
    it('does nothing when queue is empty', async () => {
      await mod.processQueue();
      assert.strictEqual(mod.notificationQueue.length, 0);
    });

    it('sorts by priority before processing', async () => {
      await mod.initializeChannels();
      mod.notificationQueue.push(
        { priority: 'low', channels: [], title: 'Low' },
        { priority: 'critical', channels: [], title: 'Critical' }
      );
      await mod.processQueue();
      assert.strictEqual(mod.notificationQueue.length, 0);
    });
  });
});
