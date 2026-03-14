'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const HomeOfficeOptimizer = require('../home-office-optimizer');

describe('HomeOfficeOptimizer', () => {
  let opt;

  beforeEach(() => {
    opt = new HomeOfficeOptimizer({});
  });

  afterEach(() => {
    opt.destroy();
  });

  // ── Constructor ──
  describe('constructor', () => {
    it('initializes data structures', () => {
      assert.ok(opt.workModes instanceof Map);
      assert.ok(Array.isArray(opt.workSessions));
      assert.ok(Array.isArray(opt.focusPeriods));
      assert.ok(Array.isArray(opt.breakReminders));
      assert.ok(opt.productivityStats instanceof Map);
      assert.ok(Array.isArray(opt._intervals));
    });
  });

  // ── Initialize ──
  describe('initialize', () => {
    it('populates work modes', async () => {
      await opt.initialize();
      assert.ok(opt.workModes.size >= 4);
      assert.ok(opt.workModes.has('deep_focus'));
      assert.ok(opt.workModes.has('collaborative'));
      assert.ok(opt.workModes.has('video_call'));
      assert.ok(opt.workModes.has('creative'));
    });
  });

  // ── activateWorkMode ──
  describe('activateWorkMode', () => {
    it('activates a known mode and starts session', async () => {
      await opt.initialize();
      const result = await opt.activateWorkMode('deep_focus');
      assert.equal(result.success, true);
      assert.ok(result.duration);
      // activateWorkMode calls startWorkSession internally
      assert.ok(opt.workSessions.length >= 1);
    });

    it('returns error for unknown mode', async () => {
      await opt.initialize();
      const result = await opt.activateWorkMode('nonexistent');
      assert.equal(result.success, false);
    });
  });

  // ── startWorkSession / endWorkSession ──
  describe('work sessions', () => {
    it('starts and ends a session', async () => {
      await opt.initialize();
      const start = await opt.startWorkSession('collaborative');
      assert.equal(start.success, true);
      assert.ok(start.sessionId.startsWith('session_'));

      const end = await opt.endWorkSession(start.sessionId);
      assert.equal(end.success, true);
      assert.ok(end.duration >= 0);
    });

    it('returns error ending unknown session', async () => {
      await opt.initialize();
      const result = await opt.endWorkSession('session_unknown');
      assert.equal(result.success, false);
    });
  });

  // ── takeBreak ──
  describe('takeBreak', () => {
    it('adds a short break to session', async () => {
      await opt.initialize();
      const start = await opt.startWorkSession('deep_focus');
      const result = await opt.takeBreak(start.sessionId, 'short');
      assert.equal(result.success, true);
      assert.equal(result.duration, 5);
    });

    it('adds a long break', async () => {
      await opt.initialize();
      const start = await opt.startWorkSession('deep_focus');
      const result = await opt.takeBreak(start.sessionId, 'long');
      assert.equal(result.success, true);
      assert.equal(result.duration, 15);
    });

    it('returns error for unknown session', async () => {
      await opt.initialize();
      const result = await opt.takeBreak('session_nonexistent');
      assert.equal(result.success, false);
    });
  });

  // ── Focus periods ──
  describe('focus periods', () => {
    it('starts and ends a focus period', async () => {
      const start = await opt.startFocusPeriod(25);
      assert.equal(start.success, true);
      assert.ok(start.focusId.startsWith('focus_'));
      assert.equal(opt.focusPeriods.length, 1);

      const end = await opt.endFocusPeriod(start.focusId);
      assert.equal(end.success, true);
    });

    it('returns error ending unknown focus period', async () => {
      const result = await opt.endFocusPeriod('focus_unknown');
      assert.equal(result.success, false);
    });
  });

  // ── recordInterruption ──
  describe('recordInterruption', () => {
    it('increments interruption count', async () => {
      const start = await opt.startFocusPeriod(30);
      opt.recordInterruption(start.focusId);
      opt.recordInterruption(start.focusId);
      const period = opt.focusPeriods.find(f => f.id === start.focusId);
      assert.equal(period.interruptions, 2);
    });
  });

  // ── scheduleBreakReminder ──
  describe('scheduleBreakReminder', () => {
    it('adds a break reminder', async () => {
      await opt.initialize();
      const before = opt.breakReminders.length;
      opt.scheduleBreakReminder('session_test', 60);
      assert.equal(opt.breakReminders.length, before + 1);
    });
  });

  // ── Reporting ──
  describe('reporting', () => {
    it('getOfficeOptimizerOverview returns stats', async () => {
      await opt.initialize();
      const overview = opt.getOfficeOptimizerOverview();
      assert.equal(overview.workModes, opt.workModes.size);
      assert.equal(typeof overview.totalSessions, 'number');
      assert.equal(typeof overview.activeSessions, 'number');
    });

    it('getWorkModesList returns modes', async () => {
      await opt.initialize();
      const modes = opt.getWorkModesList();
      assert.ok(Array.isArray(modes));
      assert.ok(modes.length >= 4);
      assert.ok(modes[0].name);
      assert.ok(modes[0].duration);
    });

    it('getRecentSessions returns completed sessions', async () => {
      await opt.initialize();
      const sessions = opt.getRecentSessions(10);
      assert.ok(Array.isArray(sessions));
    });

    it('getCurrentSession returns null when no active session', async () => {
      await opt.initialize();
      const current = opt.getCurrentSession();
      assert.equal(current, null);
    });

    it('getCurrentSession returns session when active', async () => {
      await opt.initialize();
      await opt.startWorkSession('deep_focus');
      const current = opt.getCurrentSession();
      assert.ok(current);
      assert.ok(current.mode);
      assert.ok(current.elapsed);
    });
  });

  // ── destroy ──
  describe('destroy', () => {
    it('clears intervals', async () => {
      await opt.initialize();
      opt.destroy();
      assert.deepEqual(opt._intervals, []);
    });
  });
});
