'use strict';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const FinancialPlanningOptimizer = require('../financial-planning-optimizer');

// Timer tracking wrapper
let originalSetInterval, originalSetTimeout;
let trackedIntervals = [];
let trackedTimeouts = [];

before(() => {
  originalSetInterval = global.setInterval;
  originalSetTimeout = global.setTimeout;
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
});

afterEach(() => {
  trackedIntervals.forEach(id => clearInterval(id));
  trackedTimeouts.forEach(id => clearTimeout(id));
  trackedIntervals = [];
  trackedTimeouts = [];
});

describe('FinancialPlanningOptimizer', () => {
  let optimizer;

  beforeEach(async () => {
    optimizer = new FinancialPlanningOptimizer();
    await optimizer.initialize();
  });

  afterEach(() => {
    if (optimizer && optimizer.destroy) optimizer.destroy();
  });

  describe('Constructor and Initialization', () => {
    it('initializes accounts map', () => {
      assert.ok(optimizer.accounts instanceof Map);
      assert.ok(optimizer.accounts.size >= 4);
    });

    it('initializes budgets map', () => {
      assert.ok(optimizer.budgets instanceof Map);
      assert.ok(optimizer.budgets.size >= 7);
    });

    it('initializes bills map', () => {
      assert.ok(optimizer.bills instanceof Map);
      assert.ok(optimizer.bills.size >= 7);
    });

    it('initializes financial goals', () => {
      assert.ok(optimizer.financialGoals instanceof Map);
      assert.ok(optimizer.financialGoals.size >= 4);
    });

    it('has expenses array', () => {
      assert.ok(Array.isArray(optimizer.expenses));
    });

    it('has income array', () => {
      assert.ok(Array.isArray(optimizer.income));
      assert.ok(optimizer.income.length >= 2);
    });
  });

  describe('Accounts', () => {
    it('has checking account', () => {
      const checking = optimizer.accounts.get('checking');
      assert.ok(checking);
      assert.strictEqual(checking.currency, 'SEK');
    });

    it('has savings account', () => {
      const savings = optimizer.accounts.get('savings');
      assert.ok(savings);
      assert.strictEqual(typeof savings.balance, 'number');
    });

    it('has emergency account', () => {
      assert.ok(optimizer.accounts.has('emergency'));
    });

    it('has investment account', () => {
      assert.ok(optimizer.accounts.has('investment'));
    });
  });

  describe('addTransaction', () => {
    it('adds income transaction to checking', async () => {
      const result = await optimizer.addTransaction('checking', {
        type: 'income',
        amount: 5000,
        category: 'bonus',
        description: 'Quarterly bonus'
      });
      assert.ok(result.success);
      assert.ok(result.transaction);
      assert.ok(result.transaction.id);
    });

    it('adds expense transaction', async () => {
      const result = await optimizer.addTransaction('checking', {
        type: 'expense',
        amount: 200,
        category: 'food',
        description: 'Groceries'
      });
      assert.ok(result.success);
    });

    it('returns error for non-existent account', async () => {
      const result = await optimizer.addTransaction('fake_account', {
        type: 'expense',
        amount: 100,
        category: 'test'
      });
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    it('updates account balance on income', async () => {
      const before = optimizer.accounts.get('checking').balance;
      await optimizer.addTransaction('checking', {
        type: 'income',
        amount: 1000,
        category: 'bonus'
      });
      const after = optimizer.accounts.get('checking').balance;
      assert.strictEqual(after, before + 1000);
    });

    it('updates account balance on expense', async () => {
      const before = optimizer.accounts.get('checking').balance;
      await optimizer.addTransaction('checking', {
        type: 'expense',
        amount: 500,
        category: 'food'
      });
      const after = optimizer.accounts.get('checking').balance;
      assert.strictEqual(after, before - 500);
    });
  });

  describe('Budgets', () => {
    it('has housing budget', () => {
      const budget = optimizer.budgets.get('housing');
      assert.ok(budget);
      assert.strictEqual(budget.monthlyLimit, 15000);
    });

    it('has food budget', () => {
      const budget = optimizer.budgets.get('food');
      assert.ok(budget);
      assert.strictEqual(budget.monthlyLimit, 8000);
    });

    it('budget has spent and remaining after init', () => {
      const budget = optimizer.budgets.get('food');
      assert.strictEqual(typeof budget.spent, 'number');
      assert.strictEqual(typeof budget.remaining, 'number');
    });
  });

  describe('checkBudgetImpact', () => {
    it('updates budget spent on matching expense', async () => {
      const before = optimizer.budgets.get('food').spent;
      await optimizer.checkBudgetImpact({ type: 'expense', amount: 500, category: 'food' });
      const after = optimizer.budgets.get('food').spent;
      assert.strictEqual(after, before + 500);
    });

    it('updates budget remaining on matching expense', async () => {
      const before = optimizer.budgets.get('food').remaining;
      await optimizer.checkBudgetImpact({ type: 'expense', amount: 500, category: 'food' });
      const after = optimizer.budgets.get('food').remaining;
      assert.strictEqual(after, before - 500);
    });
  });

  describe('resetMonthlyBudgets', () => {
    it('resets spent to zero', async () => {
      await optimizer.checkBudgetImpact({ type: 'expense', amount: 1000, category: 'food' });
      await optimizer.resetMonthlyBudgets();
      const budget = optimizer.budgets.get('food');
      assert.strictEqual(budget.spent, 0);
    });

    it('resets remaining to monthlyLimit', async () => {
      await optimizer.resetMonthlyBudgets();
      const budget = optimizer.budgets.get('food');
      assert.strictEqual(budget.remaining, budget.monthlyLimit);
    });
  });

  describe('Bills', () => {
    it('has rent bill', () => {
      const rent = optimizer.bills.get('rent');
      assert.ok(rent);
      assert.strictEqual(rent.amount, 12000);
    });

    it('bills have nextDue date', () => {
      for (const [, bill] of optimizer.bills) {
        assert.ok(bill.nextDue || bill.dueDay);
      }
    });
  });

  describe('calculateNextDueDate', () => {
    it('returns a Date object', () => {
      const bill = optimizer.bills.get('rent');
      const nextDue = optimizer.calculateNextDueDate(bill);
      assert.ok(nextDue instanceof Date);
    });
  });

  describe('payBill', () => {
    it('pays a bill successfully', async () => {
      const result = await optimizer.payBill('rent');
      assert.ok(result.success);
    });

    it('returns error for non-existent bill', async () => {
      const result = await optimizer.payBill('fake_bill');
      assert.strictEqual(result.success, false);
    });
  });

  describe('Financial Goals', () => {
    it('has emergency fund goal', () => {
      const goal = optimizer.financialGoals.get('emergency_fund');
      assert.ok(goal);
      assert.strictEqual(goal.target, 100000);
    });

    it('has vacation goal', () => {
      const goal = optimizer.financialGoals.get('vacation');
      assert.ok(goal);
    });

    it('goals have current amount', () => {
      for (const [, goal] of optimizer.financialGoals) {
        assert.strictEqual(typeof goal.current, 'number');
      }
    });
  });

  describe('contributeToGoal', () => {
    it('contributes to existing goal', async () => {
      const before = optimizer.financialGoals.get('vacation').current;
      const result = await optimizer.contributeToGoal('vacation', 1000);
      assert.ok(result.success);
      const after = optimizer.financialGoals.get('vacation').current;
      assert.strictEqual(after, before + 1000);
    });

    it('returns error for non-existent goal', async () => {
      const result = await optimizer.contributeToGoal('fake_goal', 1000);
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('calculateRequiredMonthlyContribution', () => {
    it('returns a number', () => {
      const goal = optimizer.financialGoals.get('vacation');
      const monthly = optimizer.calculateRequiredMonthlyContribution(goal);
      assert.strictEqual(typeof monthly, 'number');
      assert.ok(monthly >= 0);
    });
  });

  describe('generateForecast', () => {
    it('generates 12-month forecast by default', async () => {
      const forecast = await optimizer.generateForecast();
      assert.ok(Array.isArray(forecast));
      assert.strictEqual(forecast.length, 12);
    });

    it('generates custom length forecast', async () => {
      const forecast = await optimizer.generateForecast(6);
      assert.ok(Array.isArray(forecast));
      assert.strictEqual(forecast.length, 6);
    });

    it('forecast entries have month and balances', async () => {
      const forecast = await optimizer.generateForecast(3);
      const entry = forecast[0];
      assert.ok(entry.month);
      assert.strictEqual(typeof entry.checking, 'number');
      assert.strictEqual(typeof entry.savings, 'number');
    });
  });

  describe('identifyOptimizations', () => {
    it('returns array of optimizations', async () => {
      const opts = await optimizer.identifyOptimizations();
      assert.ok(Array.isArray(opts));
    });

    it('optimizations have priority and type', async () => {
      const opts = await optimizer.identifyOptimizations();
      if (opts.length > 0) {
        assert.ok(opts[0].priority !== undefined);
        assert.ok(opts[0].type);
      }
    });

    it('optimizations are sorted by priority', async () => {
      const opts = await optimizer.identifyOptimizations();
      if (opts.length >= 2) {
        assert.ok(opts[0].priority <= opts[1].priority);
      }
    });
  });

  describe('getFinancialOverview', () => {
    it('returns overview with totalWealth', () => {
      const overview = optimizer.getFinancialOverview();
      assert.ok(overview);
      assert.strictEqual(typeof overview.totalWealth, 'number');
      assert.ok(overview.totalWealth > 0);
    });

    it('returns monthly income', () => {
      const overview = optimizer.getFinancialOverview();
      assert.strictEqual(overview.monthlyIncome, 87000);
    });

    it('returns accounts array', () => {
      const overview = optimizer.getFinancialOverview();
      assert.ok(Array.isArray(overview.accounts));
      assert.ok(overview.accounts.length >= 4);
    });

    it('savings rate is a string from toFixed', () => {
      const overview = optimizer.getFinancialOverview();
      assert.strictEqual(typeof overview.savingsRate, 'string');
    });

    it('includes upcoming bills', () => {
      const overview = optimizer.getFinancialOverview();
      assert.ok(Array.isArray(overview.upcomingBills));
    });
  });

  describe('getUpcomingBills', () => {
    it('returns array of upcoming bills', () => {
      const bills = optimizer.getUpcomingBills(30);
      assert.ok(Array.isArray(bills));
    });

    it('bills are sorted by due date', () => {
      const bills = optimizer.getUpcomingBills(60);
      if (bills.length >= 2) {
        assert.ok(new Date(bills[0].nextDue) <= new Date(bills[1].nextDue));
      }
    });
  });

  describe('getBudgetReport', () => {
    it('returns budget report with totals', () => {
      const report = optimizer.getBudgetReport();
      assert.ok(report);
      assert.strictEqual(typeof report.totalBudget, 'number');
      assert.strictEqual(typeof report.totalSpent, 'number');
      assert.strictEqual(typeof report.totalRemaining, 'number');
    });

    it('includes individual budget entries', () => {
      const report = optimizer.getBudgetReport();
      assert.ok(Array.isArray(report.budgets));
      assert.ok(report.budgets.length >= 7);
    });

    it('budget entries have percentUsed and status', () => {
      const report = optimizer.getBudgetReport();
      const budget = report.budgets[0];
      assert.ok(budget.percentUsed !== undefined);
      assert.ok(['ok', 'warning', 'exceeded'].includes(budget.status));
    });
  });

  describe('getGoalsReport', () => {
    it('returns goals with progress', () => {
      const report = optimizer.getGoalsReport();
      assert.ok(Array.isArray(report));
      assert.ok(report.length >= 4);
    });

    it('progress is a string from toFixed', () => {
      const report = optimizer.getGoalsReport();
      const goal = report[0];
      assert.strictEqual(typeof goal.progress, 'string');
    });

    it('goals have onTrack and status fields', () => {
      const report = optimizer.getGoalsReport();
      const goal = report[0];
      assert.strictEqual(typeof goal.onTrack, 'boolean');
      assert.strictEqual(typeof goal.status, 'string');
    });
  });

  describe('getCashFlowAnalysis', () => {
    it('returns 6-month analysis by default', () => {
      const analysis = optimizer.getCashFlowAnalysis();
      assert.ok(Array.isArray(analysis));
      assert.strictEqual(analysis.length, 6);
    });

    it('entries have income, expenses, surplus', () => {
      const analysis = optimizer.getCashFlowAnalysis(3);
      const entry = analysis[0];
      assert.strictEqual(typeof entry.income, 'number');
      assert.strictEqual(typeof entry.expenses, 'number');
      assert.strictEqual(typeof entry.surplus, 'number');
    });
  });

  describe('getNetWorthTrend', () => {
    it('returns 12-month trend by default', () => {
      const trend = optimizer.getNetWorthTrend();
      assert.ok(Array.isArray(trend));
      assert.strictEqual(trend.length, 12);
    });

    it('entries have month and netWorth', () => {
      const trend = optimizer.getNetWorthTrend(3);
      const entry = trend[0];
      assert.ok(entry.month);
      assert.strictEqual(typeof entry.netWorth, 'number');
    });
  });

  describe('destroy', () => {
    it('clears intervals and timeouts', () => {
      optimizer.destroy();
      assert.deepStrictEqual(optimizer._intervals, []);
      assert.deepStrictEqual(optimizer._timeouts, []);
    });
  });
});
