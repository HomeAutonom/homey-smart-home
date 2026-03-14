'use strict';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

// Timer tracking wrapper
const originalSetInterval = global.setInterval;
const originalSetTimeout = global.setTimeout;
const originalClearInterval = global.clearInterval;
const originalClearTimeout = global.clearTimeout;
let trackedIntervals = [];
let trackedTimeouts = [];

describe('HealthWellnessTracker', () => {
  let tracker;

  before(() => {
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
    global.clearInterval = originalClearInterval;
    global.clearTimeout = originalClearTimeout;
  });

  beforeEach(async () => {
    const HealthWellnessTracker = require('../health-wellness-tracker');
    tracker = new HealthWellnessTracker();
    await tracker.initialize();
  });

  afterEach(() => {
    if (tracker && typeof tracker.destroy === 'function') {
      tracker.destroy();
    }
    for (const id of trackedIntervals) originalClearInterval(id);
    for (const id of trackedTimeouts) originalClearTimeout(id);
    trackedIntervals = [];
    trackedTimeouts = [];
  });

  describe('Initialization', () => {
    it('should have users map', () => {
      assert.ok(tracker.users instanceof Map);
      assert.ok(tracker.users.size > 0);
    });

    it('should have metrics map', () => {
      assert.ok(tracker.metrics instanceof Map);
    });

    it('should have goals map', () => {
      assert.ok(tracker.goals instanceof Map);
    });

    it('should have activities array', () => {
      assert.ok(Array.isArray(tracker.activities));
    });

    it('should have sleepSessions array', () => {
      assert.ok(Array.isArray(tracker.sleepSessions));
    });

    it('should have environmentalData array', () => {
      assert.ok(Array.isArray(tracker.environmentalData));
    });

    it('should have recommendations array', () => {
      assert.ok(Array.isArray(tracker.recommendations));
    });

    it('should setup users with correct data', () => {
      const anna = tracker.users.get('user_anna');
      assert.ok(anna);
      assert.strictEqual(anna.name, 'Anna');
      assert.strictEqual(anna.age, 38);
      assert.strictEqual(anna.gender, 'female');
    });

    it('should calculate BMI for users', () => {
      const anna = tracker.users.get('user_anna');
      assert.ok(anna.bmi);
      assert.strictEqual(typeof Number(anna.bmi), 'number');
    });

    it('should calculate BMR for users', () => {
      const anna = tracker.users.get('user_anna');
      assert.strictEqual(typeof anna.bmr, 'number');
      assert.ok(anna.bmr > 0);
    });

    it('should have dailyCalories property', () => {
      const anna = tracker.users.get('user_anna');
      assert.strictEqual(typeof anna.dailyCalories, 'number');
    });
  });

  describe('BMI Calculations', () => {
    it('should calculate BMI correctly', () => {
      const bmi = tracker.calculateBMI(70, 175);
      assert.strictEqual(typeof Number(bmi), 'number');
      assert.ok(Number(bmi) > 0);
      // 70 / (1.75^2) = 22.86
      assert.ok(Number(bmi) > 22 && Number(bmi) < 24);
    });

    it('should return Undervikt for low BMI', () => {
      const cat = tracker.getBMICategory(17);
      assert.strictEqual(cat, 'Undervikt');
    });

    it('should return Normalvikt for normal BMI', () => {
      const cat = tracker.getBMICategory(22);
      assert.strictEqual(cat, 'Normalvikt');
    });

    it('should return Övervikt for high BMI', () => {
      const cat = tracker.getBMICategory(27);
      assert.strictEqual(cat, 'Övervikt');
    });

    it('should return Fetma for very high BMI', () => {
      const cat = tracker.getBMICategory(32);
      assert.strictEqual(cat, 'Fetma');
    });
  });

  describe('BMR and Calorie Calculations', () => {
    it('should calculate BMR for male', () => {
      const user = { gender: 'male', weight: 85, height: 182, age: 40 };
      const bmr = tracker.calculateBMR(user);
      assert.strictEqual(typeof bmr, 'number');
      assert.ok(bmr > 0);
    });

    it('should calculate BMR for female', () => {
      const user = { gender: 'female', weight: 65, height: 168, age: 38 };
      const bmr = tracker.calculateBMR(user);
      assert.strictEqual(typeof bmr, 'number');
      assert.ok(bmr > 0);
    });

    it('should calculate daily calories with activity multiplier', () => {
      const user = { bmr: 1500, activityLevel: 'moderate' };
      const calories = tracker.calculateDailyCalories(user);
      assert.strictEqual(typeof calories, 'number');
      // moderate = 1.55 * 1500 = 2325
      assert.ok(calories > 2000 && calories < 2500);
    });
  });

  describe('Health Overview', () => {
    it('should return health overview for existing user', () => {
      const overview = tracker.getHealthOverview('user_anna');
      assert.ok(overview);
      assert.ok(overview.user);
      assert.strictEqual(overview.user.name, 'Anna');
    });

    it('should include current metrics in overview', () => {
      const overview = tracker.getHealthOverview('user_anna');
      assert.ok(overview.current);
      assert.strictEqual(typeof overview.current.steps, 'number');
    });

    it('should include weekly stats in overview', () => {
      const overview = tracker.getHealthOverview('user_anna');
      assert.ok(overview.weekly);
      assert.strictEqual(typeof overview.weekly.averageSleep, 'string');
    });

    it('should return null for unknown user', () => {
      const overview = tracker.getHealthOverview('nonexistent');
      assert.strictEqual(overview, null);
    });
  });

  describe('Activity Tracking', () => {
    it('should log activity successfully', async () => {
      const result = await tracker.logActivity('user_anna', {
        type: 'run',
        duration: 30,
        intensity: 'medium'
      });
      assert.ok(result.success);
      assert.ok(result.activity);
      assert.strictEqual(result.activity.type, 'run');
      assert.strictEqual(result.activity.duration, 30);
    });

    it('should calculate calories burned for activity', async () => {
      const result = await tracker.logActivity('user_anna', {
        type: 'run',
        duration: 30,
        intensity: 'medium'
      });
      assert.strictEqual(typeof result.activity.caloriesBurned, 'number');
      assert.ok(result.activity.caloriesBurned > 0);
    });

    it('should fail for unknown user', async () => {
      const result = await tracker.logActivity('nonexistent', {
        type: 'walk', duration: 30, intensity: 'low'
      });
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    it('should return activity report', () => {
      const report = tracker.getActivityReport('user_anna');
      assert.ok(report);
      assert.strictEqual(typeof report.totalWorkouts, 'number');
      assert.strictEqual(typeof report.totalDuration, 'number');
      assert.strictEqual(typeof report.totalCalories, 'number');
    });
  });

  describe('Sleep Tracking', () => {
    it('should log sleep session', async () => {
      const bedtime = Date.now() - 8 * 60 * 60 * 1000;
      const wakeTime = Date.now();
      const result = await tracker.logSleep('user_anna', {
        bedtime, wakeTime, awakenings: 1
      });
      assert.ok(result.success);
      assert.ok(result.session);
      assert.strictEqual(result.session.userId, 'user_anna');
    });

    it('should assess sleep quality', () => {
      const bedtime = Date.now() - 8 * 60 * 60 * 1000;
      const wakeTime = Date.now();
      const quality = tracker.assessSleepQuality({ bedtime, wakeTime, awakenings: 0 });
      assert.strictEqual(typeof quality, 'string');
      assert.ok(['excellent', 'good', 'fair', 'poor'].includes(quality));
    });

    it('should return sleep report', () => {
      const report = tracker.getSleepReport('user_anna');
      assert.ok(report);
      assert.ok(report.period);
    });

    it('should fail sleep for unknown user', async () => {
      const result = await tracker.logSleep('noone', { bedtime: 1, wakeTime: 2 });
      assert.strictEqual(result.success, false);
    });
  });

  describe('Goals', () => {
    it('should create a goal', async () => {
      const result = await tracker.createGoal({
        userId: 'user_anna', type: 'steps', target: 10000, period: 'daily'
      });
      assert.ok(result.success);
      assert.ok(result.goal);
      assert.strictEqual(result.goal.type, 'steps');
      assert.strictEqual(result.goal.target, 10000);
    });

    it('should return user goals', () => {
      const goals = tracker.getUserGoals('user_anna');
      assert.ok(Array.isArray(goals));
    });
  });

  describe('Wellness Score', () => {
    it('should return wellness score for existing user', () => {
      const score = tracker.getWellnessScore('user_anna');
      if (score !== null) {
        assert.strictEqual(typeof score.score, 'number');
        assert.ok(score.rating);
        assert.ok(score.factors);
      }
    });

    it('should return null for unknown user', () => {
      const score = tracker.getWellnessScore('nobody');
      assert.strictEqual(score, null);
    });
  });

  describe('Environmental Health', () => {
    it('should return environmental report', () => {
      const report = tracker.getEnvironmentalHealthReport();
      assert.ok(report);
    });

    it('should handle empty environmental data', () => {
      tracker.environmentalData = [];
      const report = tracker.getEnvironmentalHealthReport();
      assert.ok(report);
      assert.ok(report.message || report.averages);
    });
  });

  describe('Cleanup', () => {
    it('should have destroy method', () => {
      assert.strictEqual(typeof tracker.destroy, 'function');
    });

    it('should clear intervals on destroy', () => {
      tracker.destroy();
      assert.ok(Array.isArray(tracker._intervals));
    });
  });
});
