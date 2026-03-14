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

describe('FamilyCalendarCoordinator', () => {
  let calendar;

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
    const FamilyCalendarCoordinator = require('../family-calendar-coordinator');
    calendar = new FamilyCalendarCoordinator();
    await calendar.initialize();
  });

  afterEach(() => {
    if (calendar && typeof calendar.destroy === 'function') {
      calendar.destroy();
    }
    for (const id of trackedIntervals) originalClearInterval(id);
    for (const id of trackedTimeouts) originalClearTimeout(id);
    trackedIntervals = [];
    trackedTimeouts = [];
  });

  describe('Initialization', () => {
    it('should have events map', () => {
      assert.ok(calendar.events instanceof Map);
    });

    it('should have members map', () => {
      assert.ok(calendar.members instanceof Map);
      assert.ok(calendar.members.size > 0);
    });

    it('should have routines map', () => {
      assert.ok(calendar.routines instanceof Map);
    });

    it('should have conflicts array', () => {
      assert.ok(Array.isArray(calendar.conflicts));
    });

    it('should have reminders array', () => {
      assert.ok(Array.isArray(calendar.reminders));
    });

    it('should have locations map', () => {
      assert.ok(calendar.locations instanceof Map);
    });

    it('should setup family members', () => {
      const anna = calendar.members.get('parent1');
      assert.ok(anna);
      assert.strictEqual(anna.name, 'Anna');
      assert.strictEqual(anna.type, 'adult');
    });

    it('should setup children', () => {
      const lisa = calendar.members.get('child1');
      assert.ok(lisa);
      assert.strictEqual(lisa.name, 'Lisa');
      assert.strictEqual(lisa.type, 'child');
    });

    it('should have sample events after init', () => {
      assert.ok(calendar.events.size > 0);
    });
  });

  describe('Calendar Overview', () => {
    it('should return calendar overview', () => {
      const overview = calendar.getCalendarOverview();
      assert.ok(overview);
      assert.strictEqual(typeof overview.familyMembers, 'number');
      assert.strictEqual(typeof overview.totalEvents, 'number');
    });

    it('should include upcoming today count', () => {
      const overview = calendar.getCalendarOverview();
      assert.strictEqual(typeof overview.upcomingToday, 'number');
    });

    it('should include active conflicts count', () => {
      const overview = calendar.getCalendarOverview();
      assert.strictEqual(typeof overview.activeConflicts, 'number');
    });

    it('should include pending reminders count', () => {
      const overview = calendar.getCalendarOverview();
      assert.strictEqual(typeof overview.pendingReminders, 'number');
    });
  });

  describe('Member Summary', () => {
    it('should return member summary for existing member', () => {
      const summary = calendar.getMemberSummary('parent1');
      assert.ok(summary);
      assert.strictEqual(summary.name, 'Anna');
    });

    it('should include location and availability', () => {
      const summary = calendar.getMemberSummary('parent1');
      assert.ok(summary.location !== undefined);
      assert.ok(summary.availability !== undefined);
    });

    it('should return null for unknown member', () => {
      const summary = calendar.getMemberSummary('unknown_member');
      assert.strictEqual(summary, null);
    });
  });

  describe('Week View', () => {
    it('should return 7-day array', () => {
      const week = calendar.getWeekView();
      assert.ok(Array.isArray(week));
      assert.strictEqual(week.length, 7);
    });

    it('should have date and dayName for each day', () => {
      const week = calendar.getWeekView();
      for (const day of week) {
        assert.ok(day.date);
        assert.ok(day.dayName);
        assert.ok(Array.isArray(day.events));
      }
    });
  });

  describe('Conflict Report', () => {
    it('should return conflict report', () => {
      const report = calendar.getConflictReport();
      assert.ok(report);
      assert.strictEqual(typeof report.totalConflicts, 'number');
      assert.ok(report.bySeverity);
    });

    it('should have severity breakdown', () => {
      const report = calendar.getConflictReport();
      assert.strictEqual(typeof report.bySeverity.critical, 'number');
      assert.strictEqual(typeof report.bySeverity.high, 'number');
      assert.strictEqual(typeof report.bySeverity.medium, 'number');
      assert.strictEqual(typeof report.bySeverity.low, 'number');
    });
  });

  describe('Event CRUD', () => {
    it('should create an event', async () => {
      const result = await calendar.createEvent({
        title: 'Test Event',
        type: 'family',
        startTime: Date.now() + 86400000,
        duration: 60,
        attendees: ['parent1'],
        location: 'home'
      });
      assert.ok(result.success);
      assert.ok(result.event);
      assert.strictEqual(result.event.title, 'Test Event');
    });

    it('should update an existing event', async () => {
      const created = await calendar.createEvent({
        title: 'Update Me',
        type: 'family',
        startTime: Date.now() + 86400000,
        duration: 30,
        attendees: ['parent1'],
        location: 'home'
      });
      const eventId = created.event.id;
      const updated = await calendar.updateEvent(eventId, { title: 'Updated' });
      assert.ok(updated.success);
      assert.strictEqual(updated.event.title, 'Updated');
    });

    it('should fail to update non-existent event', async () => {
      const result = await calendar.updateEvent('no_such_event', { title: 'X' });
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Event not found');
    });

    it('should delete an event', async () => {
      const created = await calendar.createEvent({
        title: 'Delete Me',
        type: 'family',
        startTime: Date.now() + 86400000,
        duration: 30,
        attendees: ['parent1'],
        location: 'home'
      });
      const eventId = created.event.id;
      const result = await calendar.deleteEvent(eventId);
      assert.ok(result.success);
      assert.ok(!calendar.events.has(eventId));
    });

    it('should fail to delete non-existent event', async () => {
      const result = await calendar.deleteEvent('no_such_event');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Event not found');
    });
  });

  describe('Upcoming Events', () => {
    it('should return upcoming events array', () => {
      const events = calendar.getUpcomingEvents();
      assert.ok(Array.isArray(events));
    });

    it('should filter by member', () => {
      const events = calendar.getUpcomingEvents('parent1');
      assert.ok(Array.isArray(events));
    });
  });

  describe('Day Schedule', () => {
    it('should return day schedule', () => {
      const schedule = calendar.getDaySchedule(new Date());
      assert.ok(Array.isArray(schedule));
    });

    it('should filter by member', () => {
      const schedule = calendar.getDaySchedule(new Date(), 'child1');
      assert.ok(Array.isArray(schedule));
    });
  });

  describe('Member Location', () => {
    it('should update member location', async () => {
      const result = await calendar.updateMemberLocation('parent1', 'work');
      assert.ok(result.success);
      assert.strictEqual(result.member.location, 'work');
    });

    it('should fail for unknown member', async () => {
      const result = await calendar.updateMemberLocation('nobody', 'home');
      assert.strictEqual(result.success, false);
    });
  });

  describe('Travel Time', () => {
    it('should calculate travel time', () => {
      const time = calendar.calculateTravelTime('home', 'Kontoret');
      assert.strictEqual(typeof time, 'number');
      assert.ok(time >= 0);
    });
  });

  describe('Cleanup', () => {
    it('should have destroy method', () => {
      assert.strictEqual(typeof calendar.destroy, 'function');
    });

    it('should clear intervals on destroy', () => {
      calendar.destroy();
      assert.ok(Array.isArray(calendar._intervals));
    });
  });
});
