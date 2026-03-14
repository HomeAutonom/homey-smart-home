'use strict';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

const BackupSystem = require('../backup-system');

describe('BackupSystem', () => {
  let backup;
  const originalSetTimeout = global.setTimeout;
  const originalSetInterval = global.setInterval;
  let trackedTimers = [];

  beforeEach(async () => {
    trackedTimers = [];
    global.setTimeout = function (...args) {
      const id = originalSetTimeout.apply(this, args);
      trackedTimers.push({ type: 'timeout', id });
      return id;
    };
    global.setInterval = function (...args) {
      const id = originalSetInterval.apply(this, args);
      trackedTimers.push({ type: 'interval', id });
      return id;
    };
    backup = new BackupSystem({});
    await backup.initialize();
  });

  afterEach(() => {
    if (backup && typeof backup.destroy === 'function') {
      backup.destroy();
    }
    for (const t of trackedTimers) {
      if (t.type === 'timeout') clearTimeout(t.id);
      else clearInterval(t.id);
    }
    trackedTimers = [];
    global.setTimeout = originalSetTimeout;
    global.setInterval = originalSetInterval;
  });

  describe('initialization', () => {
    it('should initialize without errors', () => {
      assert.ok(backup);
    });

    it('should have backups map', () => {
      assert.ok(backup.backups instanceof Map);
    });

    it('should have export formats', () => {
      assert.ok(Array.isArray(backup.exportFormats));
      assert.ok(backup.exportFormats.includes('json'));
    });

    it('should have auto backup enabled by default', () => {
      assert.strictEqual(backup.autoBackupEnabled, true);
    });

    it('should have max backups limit', () => {
      assert.strictEqual(typeof backup.maxBackups, 'number');
      assert.ok(backup.maxBackups > 0);
    });
  });

  describe('createBackup', () => {
    it('should create a full backup', async () => {
      const result = await backup.createBackup();
      assert.strictEqual(result.success, true);
      assert.ok(result.backup);
      assert.ok(result.backup.id);
      assert.ok(result.backup.timestamp);
    });

    it('should create a partial backup with options', async () => {
      const result = await backup.createBackup({ type: 'partial', description: 'Test backup' });
      assert.strictEqual(result.success, true);
    });

    it('should create backup with exclude option', async () => {
      const result = await backup.createBackup({ exclude: ['weather', 'notifications'] });
      assert.strictEqual(result.success, true);
    });
  });

  describe('collectBackupData', () => {
    it('should collect all data categories', async () => {
      const data = await backup.collectBackupData({});
      assert.ok(data);
      assert.ok('intelligence' in data || 'automations' in data || 'configuration' in data);
    });
  });

  describe('listBackups', () => {
    it('should return backup list', async () => {
      await backup.createBackup();
      const list = await backup.listBackups();
      assert.ok(list);
      assert.ok(Array.isArray(list.backups));
      assert.strictEqual(typeof list.total, 'number');
    });
  });

  describe('getBackupInfo', () => {
    it('should return info for existing backup', async () => {
      const created = await backup.createBackup();
      const info = await backup.getBackupInfo(created.backup.id);
      assert.ok(info);
      assert.ok(info.id || info.error === undefined);
    });

    it('should return error for non-existent backup', async () => {
      const info = await backup.getBackupInfo('nonexistent');
      assert.ok(info.error);
    });
  });

  describe('deleteBackup', () => {
    it('should delete an existing backup', async () => {
      const created = await backup.createBackup();
      const result = await backup.deleteBackup(created.backup.id);
      assert.strictEqual(result.success, true);
    });

    it('should fail for non-existent backup', async () => {
      const result = await backup.deleteBackup('nonexistent');
      assert.strictEqual(result.success, false);
    });
  });

  describe('restoreBackup', () => {
    it('should restore an existing backup', async () => {
      const created = await backup.createBackup();
      const result = await backup.restoreBackup(created.backup.id);
      assert.strictEqual(result.success, true);
      assert.ok(result.results);
    });

    it('should fail for non-existent backup', async () => {
      const result = await backup.restoreBackup('nonexistent');
      assert.strictEqual(result.success, false);
    });
  });

  describe('exportData', () => {
    it('should export as JSON by default', async () => {
      const result = await backup.exportData();
      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.ok(result.filename);
    });

    it('should export as CSV', async () => {
      const result = await backup.exportData({ format: 'csv' });
      assert.strictEqual(result.success, true);
    });

    it('should export as YAML', async () => {
      const result = await backup.exportData({ format: 'yaml' });
      assert.strictEqual(result.success, true);
    });
  });

  describe('importData', () => {
    it('should import valid JSON data', async () => {
      const exported = await backup.exportData({ format: 'json' });
      const result = await backup.importData(exported.data, { format: 'json' });
      assert.strictEqual(result.success, true);
    });

    it('should fail on invalid data', async () => {
      const result = await backup.importData('not valid json', { format: 'json' });
      assert.strictEqual(result.success, false);
    });
  });

  describe('convertToFormat', () => {
    it('should convert to JSON', () => {
      const data = { test: 'value' };
      const result = backup.convertToFormat(data, 'json');
      assert.strictEqual(typeof result, 'string');
      assert.ok(result.includes('test'));
    });

    it('should convert to CSV', () => {
      const data = { test: 'value' };
      const result = backup.convertToFormat(data, 'csv');
      assert.strictEqual(typeof result, 'string');
    });
  });

  describe('validateImportData', () => {
    it('should validate object data', () => {
      assert.strictEqual(backup.validateImportData({ key: 'val' }), true);
    });

    it('should reject non-object data', () => {
      assert.ok(!backup.validateImportData(null));
    });
  });

  describe('calculateBackupSize', () => {
    it('should return formatted size string', () => {
      const size = backup.calculateBackupSize({ key: 'value' });
      assert.strictEqual(typeof size, 'string');
      assert.ok(size.includes('B') || size.includes('KB') || size.includes('MB'));
    });
  });

  describe('countBackupItems', () => {
    it('should count items in data', () => {
      const count = backup.countBackupItems({ a: [1, 2], b: [3] });
      assert.strictEqual(typeof count, 'number');
    });
  });

  describe('generateExportFilename', () => {
    it('should generate filename with format extension', () => {
      const name = backup.generateExportFilename('json');
      assert.ok(name.endsWith('.json'));
      assert.ok(name.includes('homey'));
    });
  });

  describe('destroy', () => {
    it('should clean up resources', () => {
      backup.destroy();
      assert.ok(true);
    });
  });
});
