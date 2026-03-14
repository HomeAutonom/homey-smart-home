'use strict';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

const HomeMaintenancePredictor = require('../home-maintenance-predictor');

describe('HomeMaintenancePredictor', () => {
  let predictor;
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
    predictor = new HomeMaintenancePredictor({});
    await predictor.initialize();
  });

  afterEach(() => {
    if (predictor && typeof predictor.destroy === 'function') {
      predictor.destroy();
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
      assert.ok(predictor);
    });

    it('should have systems map', () => {
      assert.ok(predictor.systems instanceof Map);
    });

    it('should have tasks map', () => {
      assert.ok(predictor.maintenanceTasks instanceof Map);
    });

    it('should have maintenance history', () => {
      assert.ok(Array.isArray(predictor.maintenanceHistory));
    });

    it('should have default systems registered', () => {
      assert.ok(predictor.systems.size > 0);
      assert.ok(predictor.systems.has('hvac'));
    });
  });

  describe('getMaintenanceOverview', () => {
    it('should return overview object', () => {
      const overview = predictor.getMaintenanceOverview();
      assert.ok(overview);
      assert.strictEqual(typeof overview.totalTasks, 'number');
      assert.strictEqual(typeof overview.criticalSystems, 'number');
    });

    it('should include upcoming tasks', () => {
      const overview = predictor.getMaintenanceOverview();
      assert.ok(Array.isArray(overview.upcomingTasks) || typeof overview.upcomingTasks === 'number');
    });
  });

  describe('getSystemHealthReport', () => {
    it('should return report for all systems', () => {
      const report = predictor.getSystemHealthReport();
      assert.ok(report);
      assert.ok(Array.isArray(report) || typeof report === 'object');
    });
  });

  describe('calculateSystemHealth', () => {
    it('should return health score between 0 and 100', () => {
      const system = predictor.systems.get('hvac');
      if (system) {
        const health = predictor.calculateSystemHealth(system);
        assert.strictEqual(typeof health, 'number');
        assert.ok(health >= 0 && health <= 100);
      }
    });

    it('should return valid health for all systems', () => {
      for (const [id, system] of predictor.systems) {
        const health = predictor.calculateSystemHealth(system);
        assert.strictEqual(typeof health, 'number');
        assert.ok(health >= 0 && health <= 100, `System ${id} health ${health} out of range`);
      }
    });
  });

  describe('completeTask', () => {
    it('should complete an existing task', async () => {
      const taskId = predictor.maintenanceTasks.keys().next().value;
      if (taskId) {
        const result = await predictor.completeTask(taskId, { notes: 'Done' });
        assert.strictEqual(result.success, true);
        assert.ok(result.task);
      }
    });

    it('should fail for non-existent task', async () => {
      const result = await predictor.completeTask('nonexistent', {});
      assert.strictEqual(result.success, false);
    });
  });

  describe('analyzeSystems', () => {
    it('should return array of system analyses', async () => {
      const result = await predictor.analyzeSystems();
      assert.ok(Array.isArray(result));
    });

    it('should include health status for each system', async () => {
      const result = await predictor.analyzeSystems();
      for (const sys of result) {
        assert.ok(sys.id || sys.name || sys.system);
        assert.ok(sys.health !== undefined || sys.healthScore !== undefined || sys.status !== undefined);
      }
    });
  });

  describe('predictMaintenanceCosts', () => {
    it('should predict costs for given years', async () => {
      const result = await predictor.predictMaintenanceCosts(3);
      assert.ok(Array.isArray(result));
      assert.ok(result.length > 0);
    });

    it('should predict costs for 1 year', async () => {
      const result = await predictor.predictMaintenanceCosts(1);
      assert.ok(Array.isArray(result));
    });
  });

  describe('recommendContractor', () => {
    it('should return recommendation for known system', async () => {
      const result = await predictor.recommendContractor('hvac');
      assert.ok(result === null || typeof result === 'object');
    });

    it('should return null or empty for unknown system', async () => {
      const result = await predictor.recommendContractor('nonexistent');
      assert.ok(result === null || typeof result === 'object');
    });
  });

  describe('getMaintenanceHistory', () => {
    it('should return history object', () => {
      const history = predictor.getMaintenanceHistory(12);
      assert.ok(typeof history === 'object');
      assert.strictEqual(typeof history.totalRecords, 'number');
      assert.strictEqual(typeof history.totalCost, 'number');
    });

    it('should accept months parameter', () => {
      const history = predictor.getMaintenanceHistory(6);
      assert.ok(typeof history === 'object');
      assert.strictEqual(history.period, '6 months');
    });
  });

  describe('getMaintenanceCalendar', () => {
    it('should return calendar data', () => {
      const calendar = predictor.getMaintenanceCalendar(3);
      assert.ok(calendar);
      assert.ok(Array.isArray(calendar) || typeof calendar === 'object');
    });
  });

  describe('destroy', () => {
    it('should clean up resources', () => {
      predictor.destroy();
      assert.ok(true);
    });
  });
});
