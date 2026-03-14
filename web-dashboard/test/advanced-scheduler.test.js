'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const AdvancedScheduler = require('../advanced-scheduler');

describe('AdvancedScheduler', () => {
  let scheduler;
  let trackedTimers = [];
  let origSetInterval, origSetTimeout;
  const mockApp = { log: () => {}, emit: () => {} };

  beforeEach(async () => {
    trackedTimers = [];
    origSetInterval = global.setInterval;
    origSetTimeout = global.setTimeout;
    global.setInterval = (...args) => { const id = origSetInterval(...args); trackedTimers.push({ id, type: 'interval' }); return id; };
    global.setTimeout = (...args) => { const id = origSetTimeout(...args); trackedTimers.push({ id, type: 'timeout' }); return id; };
    scheduler = new AdvancedScheduler(mockApp);
    await scheduler.initialize();
  });

  afterEach(() => {
    if (scheduler && scheduler.destroy) scheduler.destroy();
    // Nuke all timers created during test
    for (const t of trackedTimers) {
      if (t.type === 'interval') clearInterval(t.id);
      else clearTimeout(t.id);
    }
    trackedTimers = [];
    global.setInterval = origSetInterval;
    global.setTimeout = origSetTimeout;
    scheduler = null;
  });

  describe('initialization', () => {
    it('loads default schedules', () => {
      assert.ok(scheduler.schedules instanceof Map);
      assert.ok(scheduler.schedules.size >= 2);
    });

    it('loads Swedish holidays', () => {
      assert.ok(Array.isArray(scheduler.holidays));
      assert.ok(scheduler.holidays.length >= 16);
    });

    it('initializes execution history', () => {
      assert.ok(Array.isArray(scheduler.executionHistory));
    });
  });

  describe('createSchedule', () => {
    it('creates a time-based schedule', async () => {
      const result = await scheduler.createSchedule({
        name: 'Test Schedule',
        type: 'time',
        time: '08:00',
        days: [1, 2, 3, 4, 5],
        actions: [{ type: 'device', deviceId: 'lamp1', value: true }]
      });
      assert.strictEqual(result.success, true);
      assert.ok(result.schedule);
      assert.ok(result.schedule.id);
    });

    it('creates a sunset schedule', async () => {
      const result = await scheduler.createSchedule({
        name: 'Sunset Test',
        type: 'sunset',
        offset: -30,
        actions: [{ type: 'device', deviceId: 'light1', value: true }]
      });
      assert.strictEqual(result.success, true);
    });

    it('creates an interval schedule', async () => {
      const result = await scheduler.createSchedule({
        name: 'Interval',
        type: 'interval',
        repeatEvery: 3600000,
        actions: [{ type: 'notification', message: 'Test' }]
      });
      assert.strictEqual(result.success, true);
    });
  });

  describe('updateSchedule', () => {
    it('updates an existing schedule', async () => {
      const created = await scheduler.createSchedule({
        name: 'Update Test',
        type: 'time',
        time: '09:00',
        actions: []
      });
      const result = await scheduler.updateSchedule(created.schedule.id, { name: 'Updated' });
      assert.strictEqual(result.success, true);
    });

    it('fails for non-existent schedule', async () => {
      const result = await scheduler.updateSchedule('fake_id', { name: 'X' });
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('deleteSchedule', () => {
    it('deletes an existing schedule', async () => {
      const created = await scheduler.createSchedule({
        name: 'Delete Me',
        type: 'time',
        time: '10:00',
        actions: []
      });
      const result = await scheduler.deleteSchedule(created.schedule.id);
      assert.strictEqual(result.success, true);
    });

    it('fails for non-existent schedule', async () => {
      const result = await scheduler.deleteSchedule('fake_id');
      assert.strictEqual(result.success, false);
    });
  });

  describe('executeAction', () => {
    it('executes a device_on action', async () => {
      const result = await scheduler.executeAction({ type: 'device_on', deviceId: 'lamp1' });
      assert.strictEqual(result.executed, true);
    });

    it('executes a notification action', async () => {
      const result = await scheduler.executeAction({ type: 'notification', message: 'Hello' });
      assert.strictEqual(result.executed, true);
    });

    it('executes a scene action', async () => {
      const result = await scheduler.executeAction({ type: 'scene', sceneId: 'scene1' });
      assert.strictEqual(result.executed, true);
    });
  });

  describe('holiday methods', () => {
    it('isHoliday returns boolean', () => {
      const result = scheduler.isHoliday(new Date('2026-01-01'));
      assert.strictEqual(typeof result, 'boolean');
    });

    it('getHolidayName returns name or null', () => {
      const result = scheduler.getHolidayName(new Date('2026-12-25'));
      assert.ok(result === null || typeof result === 'string');
    });
  });

  describe('templates', () => {
    it('getTemplates returns 4 templates', () => {
      const templates = scheduler.getTemplates();
      assert.ok(Array.isArray(templates));
      assert.strictEqual(templates.length, 4);
      assert.ok(templates[0].id);
      assert.ok(templates[0].name);
    });

    it('createFromTemplate creates a schedule', async () => {
      const result = await scheduler.createFromTemplate('morning_routine');
      assert.strictEqual(result.success, true);
      assert.ok(result.schedule);
    });

    it('createFromTemplate fails for unknown template', async () => {
      const result = await scheduler.createFromTemplate('nonexistent');
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('getScheduleInfo', () => {
    it('returns info for existing schedule', async () => {
      const created = await scheduler.createSchedule({
        name: 'Info Test',
        type: 'time',
        time: '11:00',
        actions: [{ type: 'device', deviceId: 'd1', value: true }]
      });
      const info = scheduler.getScheduleInfo(created.schedule.id);
      assert.ok(info);
      assert.ok(info.id);
      assert.ok(info.name);
      assert.ok('enabled' in info);
      assert.ok('actions' in info);
    });

    it('returns null for non-existent schedule', () => {
      const info = scheduler.getScheduleInfo('fake');
      assert.strictEqual(info, null);
    });
  });

  describe('getAllSchedules', () => {
    it('returns array of schedules', () => {
      const all = scheduler.getAllSchedules();
      assert.ok(Array.isArray(all));
      assert.ok(all.length >= 0);
    });
  });

  describe('getUpcomingSchedules', () => {
    it('returns upcoming schedules', () => {
      const upcoming = scheduler.getUpcomingSchedules(5);
      assert.ok(Array.isArray(upcoming));
    });
  });

  describe('getScheduleStats', () => {
    it('returns stats object', () => {
      const stats = scheduler.getScheduleStats();
      assert.ok('total' in stats);
      assert.ok('enabled' in stats);
      assert.ok('disabled' in stats);
      assert.ok('byType' in stats);
      assert.ok('totalExecutions' in stats);
    });
  });

  describe('getExecutionHistory', () => {
    it('returns execution history array', () => {
      const history = scheduler.getExecutionHistory(10);
      assert.ok(Array.isArray(history));
    });
  });

  describe('checkConditions', () => {
    it('returns true for schedule without conditions', async () => {
      const created = await scheduler.createSchedule({
        name: 'No Cond',
        type: 'time',
        time: '12:00',
        actions: []
      });
      const schedule = scheduler.schedules.get(created.schedule.id);
      const result = await scheduler.checkConditions(schedule);
      assert.strictEqual(result, true);
    });
  });

  describe('destroy', () => {
    it('clears all timers', () => {
      scheduler.destroy();
      assert.deepStrictEqual(scheduler._intervals, []);
      assert.deepStrictEqual(scheduler._timeouts, []);
    });
  });
});
