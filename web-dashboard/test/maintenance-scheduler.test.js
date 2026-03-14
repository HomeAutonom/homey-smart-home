'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const MaintenanceScheduler = require('../maintenance-scheduler');

describe('MaintenanceScheduler', () => {
  let mod;
  const mockApp = { emit: () => {} };

  beforeEach(() => {
    mod = new MaintenanceScheduler(mockApp);
  });

  afterEach(() => {
    mod.destroy();
  });

  describe('constructor', () => {
    it('initializes with empty device map', () => {
      assert.ok(mod.devices instanceof Map);
      assert.strictEqual(mod.devices.size, 0);
    });

    it('initializes with empty task map', () => {
      assert.ok(mod.tasks instanceof Map);
      assert.strictEqual(mod.tasks.size, 0);
    });

    it('initializes with empty warranty map', () => {
      assert.ok(mod.warranties instanceof Map);
      assert.strictEqual(mod.warranties.size, 0);
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

  describe('createTask', () => {
    it('returns success with a created task', async () => {
      const result = await mod.createTask({ title: 'Filter replacement', type: 'replacement', deviceId: 'dev-1' });
      assert.strictEqual(result.success, true);
      assert.ok(result.task);
      assert.ok(result.task.id);
      assert.strictEqual(result.task.title, 'Filter replacement');
    });

    it('auto-generates task id', async () => {
      const r1 = await mod.createTask({ title: 'Task A' });
      const r2 = await mod.createTask({ title: 'Task B' });
      assert.notStrictEqual(r1.task.id, r2.task.id);
    });

    it('sets default status and priority', async () => {
      const result = await mod.createTask({ title: 'Test task' });
      assert.strictEqual(result.task.status, 'pending');
      assert.ok(result.task.priority);
    });

    it('stores the task in the map', async () => {
      const result = await mod.createTask({ title: 'Stored task' });
      assert.strictEqual(mod.tasks.size, 1);
      assert.ok(mod.tasks.has(result.task.id));
    });
  });

  describe('updateTask', () => {
    it('updates an existing task', async () => {
      const { task } = await mod.createTask({ title: 'Original' });
      const result = await mod.updateTask(task.id, { title: 'Updated' });
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.task.title, 'Updated');
    });

    it('returns error for non-existent task', async () => {
      const result = await mod.updateTask('fake-id', { title: 'x' });
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Task not found');
    });

    it('preserves unmodified fields', async () => {
      const { task } = await mod.createTask({ title: 'Keep this', type: 'cleaning' });
      await mod.updateTask(task.id, { type: 'replacement' });
      const updated = mod.tasks.get(task.id);
      assert.strictEqual(updated.title, 'Keep this');
      assert.strictEqual(updated.type, 'replacement');
    });
  });

  describe('completeTask', () => {
    it('sets status to completed', async () => {
      const { task } = await mod.createTask({ title: 'Finish me' });
      const result = await mod.completeTask(task.id, { completedBy: 'admin' });
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.task.status, 'completed');
      assert.ok(result.task.completedDate);
      assert.strictEqual(result.task.completedBy, 'admin');
    });

    it('returns error for non-existent task', async () => {
      const result = await mod.completeTask('fake-id', {});
      assert.strictEqual(result.success, false);
    });
  });

  describe('deleteTask', () => {
    it('removes the task from the map', async () => {
      const { task } = await mod.createTask({ title: 'Delete me' });
      await mod.deleteTask(task.id);
      assert.strictEqual(mod.tasks.has(task.id), false);
    });

    it('returns success even for non-existent task', async () => {
      const result = await mod.deleteTask('no-such-id');
      assert.strictEqual(result.success, true);
    });
  });

  describe('getDashboard', () => {
    it('returns dashboard summary with all fields', async () => {
      await mod.createTask({ title: 'T1', priority: 'high' });
      await mod.createTask({ title: 'T2', priority: 'low' });
      const dashboard = mod.getDashboard();
      assert.ok('pendingTasks' in dashboard);
      assert.ok('overdueTasks' in dashboard);
      assert.ok('dueSoonTasks' in dashboard);
      assert.ok('completedTasks' in dashboard);
      assert.ok('byPriority' in dashboard);
    });

    it('categorizes tasks by priority', async () => {
      await mod.createTask({ title: 'Critical task', priority: 'critical' });
      await mod.createTask({ title: 'Low task', priority: 'low' });
      const dashboard = mod.getDashboard();
      assert.ok(dashboard.byPriority);
    });

    it('returns empty dashboard when no tasks exist', () => {
      const dashboard = mod.getDashboard();
      assert.strictEqual(dashboard.pendingTasks, 0);
      assert.strictEqual(dashboard.completedTasks, 0);
    });
  });

  describe('getUpcomingTasks', () => {
    it('returns an array of upcoming items', async () => {
      await mod.createTask({ title: 'Soon', dueDate: Date.now() + 86400000 });
      const upcoming = mod.getUpcomingTasks(7);
      assert.ok(Array.isArray(upcoming));
    });

    it('returns empty array when nothing is due', () => {
      const upcoming = mod.getUpcomingTasks(0);
      assert.ok(Array.isArray(upcoming));
    });
  });

  describe('getMaintenanceStats', () => {
    it('returns maintenance statistics', () => {
      const stats = mod.getMaintenanceStats();
      assert.ok('totalCompleted' in stats);
      assert.ok('totalCost' in stats);
      assert.ok('byCategory' in stats);
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
