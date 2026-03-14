'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const EnergyBudgetManager = require('../energy-budget-manager');

describe('EnergyBudgetManager', () => {
  let mod;

  beforeEach(async () => {
    mod = new EnergyBudgetManager({ emit: () => {} });
    await mod.initialize();
  });

  afterEach(() => {
    mod.destroy();
  });

  describe('constructor and initialize', () => {
    it('sets up default budgets', () => {
      assert.ok(mod.budgets instanceof Map);
      assert.ok(mod.budgets.size >= 4);
    });

    it('creates daily budget with 25 kWh limit', () => {
      const daily = mod.budgets.get('daily');
      assert.ok(daily);
      assert.strictEqual(daily.limit, 25);
      assert.strictEqual(daily.period, 'daily');
    });

    it('creates monthly budget with 600 kWh limit', () => {
      const monthly = mod.budgets.get('monthly');
      assert.ok(monthly);
      assert.strictEqual(monthly.limit, 600);
    });

    it('creates monthly cost budget at 2000 SEK', () => {
      const cost = mod.budgets.get('monthly_cost');
      assert.ok(cost);
      assert.strictEqual(cost.limit, 2000);
      assert.strictEqual(cost.limitType, 'cost');
    });

    it('initializes empty arrays', () => {
      assert.ok(Array.isArray(mod.consumptionHistory));
      assert.ok(Array.isArray(mod.alerts));
      assert.ok(Array.isArray(mod.recommendations));
    });
  });

  describe('createBudget', () => {
    it('creates a custom budget', async () => {
      const result = await mod.createBudget({
        name: 'Test Budget',
        limit: 100,
        limitType: 'energy',
        period: 'weekly'
      });
      assert.strictEqual(result.success, true);
      assert.ok(result.budget.id);
      assert.strictEqual(result.budget.name, 'Test Budget');
    });
  });

  describe('updateBudget', () => {
    it('updates an existing budget', async () => {
      const result = await mod.updateBudget('daily', { limit: 30 });
      assert.strictEqual(result.success, true);
      assert.strictEqual(mod.budgets.get('daily').limit, 30);
    });

    it('returns error for unknown budget', async () => {
      const result = await mod.updateBudget('nonexistent', { limit: 30 });
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('deleteBudget', () => {
    it('deletes an existing budget', async () => {
      const sizeBefore = mod.budgets.size;
      const result = await mod.deleteBudget('daily');
      assert.strictEqual(result.success, true);
      assert.strictEqual(mod.budgets.size, sizeBefore - 1);
    });

    it('returns error for unknown budget', async () => {
      const result = await mod.deleteBudget('nonexistent');
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('updateConsumption', () => {
    it('adds consumption records to history', async () => {
      const beforeLen = mod.consumptionHistory.length;
      await mod.updateConsumption();
      assert.ok(mod.consumptionHistory.length > beforeLen);
    });

    it('updates budget current values', async () => {
      await mod.updateConsumption();
      const daily = mod.budgets.get('daily');
      assert.ok(daily.current >= 0);
    });
  });

  describe('updateBudgetStatus', () => {
    it('sets on_track for low usage', () => {
      const budget = mod.budgets.get('daily');
      budget.current = 5;
      budget.limit = 25;
      budget.percentage = 20;
      mod.updateBudgetStatus('daily');
      assert.strictEqual(budget.status, 'on_track');
    });

    it('sets approaching for 80%+ usage', () => {
      const budget = mod.budgets.get('daily');
      budget.current = 21;
      budget.limit = 25;
      budget.percentage = 84;
      mod.updateBudgetStatus('daily');
      assert.strictEqual(budget.status, 'approaching');
    });

    it('sets critical for 90%+ usage', () => {
      const budget = mod.budgets.get('daily');
      budget.current = 23;
      budget.limit = 25;
      budget.percentage = 92;
      mod.updateBudgetStatus('daily');
      assert.strictEqual(budget.status, 'critical');
    });

    it('sets exceeded for 100%+ usage', () => {
      const budget = mod.budgets.get('daily');
      budget.current = 30;
      budget.limit = 25;
      budget.percentage = 120;
      mod.updateBudgetStatus('daily');
      assert.strictEqual(budget.status, 'exceeded');
    });
  });

  describe('resetBudget', () => {
    it('resets budget counters', () => {
      const budget = mod.budgets.get('daily');
      budget.current = 20;
      mod.resetBudget('daily');
      assert.strictEqual(budget.current, 0);
      assert.strictEqual(budget.status, 'on_track');
    });

    it('saves period to history on reset', () => {
      const budget = mod.budgets.get('daily');
      budget.current = 15;
      budget.percentage = 60;
      const histBefore = budget.history.length;
      mod.resetBudget('daily');
      assert.strictEqual(budget.history.length, histBefore + 1);
    });
  });

  describe('projectConsumption', () => {
    it('returns projection data', () => {
      const budget = mod.budgets.get('daily');
      budget.current = 10;
      const projection = mod.projectConsumption(budget);
      assert.ok(typeof projection.projected === 'number');
      assert.ok(typeof projection.willExceed === 'boolean');
      assert.ok(typeof projection.daysRemaining === 'number');
    });
  });

  describe('triggerAlert', () => {
    it('creates an alert', () => {
      const alertsBefore = mod.alerts.length;
      mod.triggerAlert('daily', 'threshold', 0.9);
      assert.strictEqual(mod.alerts.length, alertsBefore + 1);
      assert.strictEqual(mod.alerts[mod.alerts.length - 1].budgetId, 'daily');
    });

    it('trims alerts at 100', () => {
      for (let i = 0; i < 105; i++) {
        mod.triggerAlert('daily', 'threshold', 0.8);
      }
      assert.ok(mod.alerts.length <= 100);
    });
  });

  describe('generateRecommendations', () => {
    it('returns array of recommendations', () => {
      const budget = mod.budgets.get('daily');
      budget.projection = { willExceed: true, projected: 30, daysRemaining: 5, recommendedDailyLimit: 15 };
      const recs = mod.generateRecommendations('daily');
      assert.ok(Array.isArray(recs));
      assert.ok(recs.length > 0);
    });

    it('includes time_shifting recommendation', () => {
      const budget = mod.budgets.get('daily');
      budget.projection = { willExceed: false, projected: 20, daysRemaining: 5, recommendedDailyLimit: 15 };
      const recs = mod.generateRecommendations('daily');
      const timeShift = recs.find(r => r.type === 'time_shifting');
      assert.ok(timeShift);
    });
  });

  describe('dismissAlert', () => {
    it('dismisses an existing alert', async () => {
      mod.triggerAlert('daily', 'threshold', 0.9);
      const alert = mod.alerts[mod.alerts.length - 1];
      const result = await mod.dismissAlert(alert.id);
      assert.strictEqual(result.success, true);
      assert.strictEqual(alert.status, 'dismissed');
    });

    it('returns error for unknown alert', async () => {
      const result = await mod.dismissAlert('nonexistent_alert');
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('reporting', () => {
    it('returns budget summary', async () => {
      const summary = await mod.getBudgetSummary();
      assert.ok(Array.isArray(summary.budgets));
      assert.ok(summary.budgets.length >= 4);
      assert.ok(typeof summary.totalAlerts === 'number');
    });

    it('returns budget details', async () => {
      const details = await mod.getBudgetDetails('daily');
      assert.ok(details.budget);
      assert.strictEqual(details.budget.id, 'daily');
    });

    it('returns error for unknown budget detail', async () => {
      const result = await mod.getBudgetDetails('nonexistent');
      assert.ok(result.error);
    });

    it('returns all budgets list', () => {
      const budgets = mod.getAllBudgets();
      assert.ok(Array.isArray(budgets));
      assert.ok(budgets.length >= 4);
      assert.ok(budgets[0].id);
      assert.ok(budgets[0].name);
    });

    it('gets active alerts', () => {
      const alerts = mod.getActiveAlerts();
      assert.ok(Array.isArray(alerts));
    });
  });

  describe('destroy', () => {
    it('clears intervals', () => {
      mod.destroy();
      assert.strictEqual(mod._intervals.length, 0);
    });
  });
});
