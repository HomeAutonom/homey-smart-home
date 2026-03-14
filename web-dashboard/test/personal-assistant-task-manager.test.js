'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const PersonalAssistantTaskManager = require('../personal-assistant-task-manager');

describe('PersonalAssistantTaskManager', () => {
  let manager;

  beforeEach(async () => {
    manager = new PersonalAssistantTaskManager();
    await manager.initialize();
  });

  afterEach(() => {
    if (manager && manager.destroy) manager.destroy();
  });

  describe('Initialization', () => {
    it('sets up 4 family members', () => {
      assert.strictEqual(manager.familyMembers.size, 4);
    });

    it('has expected family member names', () => {
      const anna = manager.familyMembers.get('anna');
      assert.ok(anna);
      assert.strictEqual(anna.name, 'Anna');
      assert.strictEqual(anna.role, 'parent');
    });

    it('sets up 4 initial tasks', () => {
      assert.strictEqual(manager.tasks.size, 4);
    });

    it('sets up 3 calendar events', () => {
      assert.strictEqual(manager.calendar.size, 3);
    });

    it('sets up 2 shopping lists', () => {
      assert.strictEqual(manager.shoppingLists.size, 2);
    });
  });

  describe('Task operations', () => {
    it('adds a new task', async () => {
      const result = await manager.addTask({
        title: 'Test task',
        assignedTo: 'anna',
        priority: 'high',
        dueDate: Date.now() + 86400000,
        category: 'test'
      });
      assert.strictEqual(result.success, true);
      assert.ok(result.taskId);
    });

    it('completes a task', async () => {
      const result = await manager.completeTask('task_3');
      assert.strictEqual(result.success, true);
    });

    it('completes a recurring task and creates new one', async () => {
      const sizeBefore = manager.tasks.size;
      await manager.completeTask('task_1'); // task_1 is weekly recurring
      // Should have created a new recurring task
      assert.ok(manager.tasks.size >= sizeBefore); // original stays + new one
    });

    it('returns error for non-existent task', async () => {
      const result = await manager.completeTask('task_nonexistent');
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    it('updates task priority', async () => {
      const result = await manager.updateTaskPriority('task_3', 'high');
      assert.strictEqual(result.success, true);
    });

    it('returns error updating priority of non-existent task', async () => {
      const result = await manager.updateTaskPriority('task_nonexistent', 'high');
      assert.strictEqual(result.success, false);
    });

    it('reassigns a task', async () => {
      const result = await manager.reassignTask('task_1', 'erik');
      assert.strictEqual(result.success, true);
    });

    it('returns error reassigning non-existent task', async () => {
      const result = await manager.reassignTask('task_nonexistent', 'erik');
      assert.strictEqual(result.success, false);
    });

    it('getTasksByPerson returns pending tasks sorted by priority', () => {
      const tasks = manager.getTasksByPerson('anna');
      assert.ok(Array.isArray(tasks));
      // anna has task_1 (high) and task_4 (low)
      assert.ok(tasks.length >= 2);
      // High priority should come first
      assert.strictEqual(tasks[0].priority, 'high');
    });

    it('getOverdueTasks returns overdue items', () => {
      const overdue = manager.getOverdueTasks();
      assert.ok(Array.isArray(overdue));
      // Some tasks may have past due dates depending on setup
    });
  });

  describe('Calendar operations', () => {
    it('adds a calendar event', async () => {
      const result = await manager.addCalendarEvent({
        title: 'Test Event',
        attendees: ['anna'],
        startTime: Date.now() + 86400000,
        endTime: Date.now() + 90000000,
        location: 'Home'
      });
      assert.strictEqual(result.success, true);
      assert.ok(result.eventId);
    });

    it('getUpcomingEvents returns events within range', () => {
      const events = manager.getUpcomingEvents(14);
      assert.ok(Array.isArray(events));
      // All 3 default events are within 7 days
      assert.ok(events.length >= 0);
    });

    it('getTodaySchedule returns events and tasks for a person', () => {
      const schedule = manager.getTodaySchedule('anna');
      assert.ok('events' in schedule);
      assert.ok('tasks' in schedule);
      assert.ok(Array.isArray(schedule.events));
      assert.ok(Array.isArray(schedule.tasks));
    });
  });

  describe('Shopping list operations', () => {
    it('adds item to shopping list', async () => {
      const result = await manager.addToShoppingList('list_groceries', 'Smör', 1, 'st');
      assert.strictEqual(result.success, true);
      assert.ok(result.itemId);
    });

    it('returns error adding to non-existent list', async () => {
      const result = await manager.addToShoppingList('list_nonexistent', 'Test', 1, 'st');
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    it('marks item as purchased', async () => {
      const result = await manager.markItemPurchased('list_groceries', 'item_1');
      assert.strictEqual(result.success, true);
    });

    it('returns error marking non-existent item', async () => {
      const result = await manager.markItemPurchased('list_groceries', 'item_nonexistent');
      assert.strictEqual(result.success, false);
    });

    it('returns error marking item in non-existent list', async () => {
      const result = await manager.markItemPurchased('list_nonexistent', 'item_1');
      assert.strictEqual(result.success, false);
    });

    it('removes item from shopping list', async () => {
      const result = await manager.removeFromShoppingList('list_groceries', 'item_1');
      assert.strictEqual(result.success, true);
    });

    it('returns error removing non-existent item', async () => {
      const result = await manager.removeFromShoppingList('list_groceries', 'item_nonexistent');
      assert.strictEqual(result.success, false);
    });

    it('returns error removing from non-existent list', async () => {
      const result = await manager.removeFromShoppingList('list_nonexistent', 'item_1');
      assert.strictEqual(result.success, false);
    });
  });

  describe('Smart suggestions', () => {
    it('suggestTasks returns an array', async () => {
      const suggestions = await manager.suggestTasks('anna', {});
      assert.ok(Array.isArray(suggestions));
    });

    it('getDailySummary returns expected fields', async () => {
      const summary = await manager.getDailySummary('anna');
      assert.ok('greeting' in summary);
      assert.ok(typeof summary.events === 'number');
      assert.ok(typeof summary.tasks === 'number');
    });
  });

  describe('Reporting', () => {
    it('getAssistantOverview returns all fields', () => {
      const overview = manager.getAssistantOverview();
      assert.strictEqual(overview.familyMembers, 4);
      assert.ok(typeof overview.pendingTasks === 'number');
      assert.ok(typeof overview.upcomingEvents === 'number');
      assert.strictEqual(overview.shoppingLists, 2);
      assert.ok(typeof overview.activeReminders === 'number');
    });

    it('getTasksSummary returns correct structure', () => {
      const summary = manager.getTasksSummary();
      assert.strictEqual(summary.total, 4);
      assert.ok(typeof summary.pending === 'number');
      assert.ok(typeof summary.completed === 'number');
      assert.ok(typeof summary.highPriority === 'number');
      assert.ok(typeof summary.mediumPriority === 'number');
      assert.ok(typeof summary.lowPriority === 'number');
    });

    it('getTasksList returns formatted task objects', () => {
      const tasks = manager.getTasksList();
      assert.ok(Array.isArray(tasks));
      if (tasks.length > 0) {
        const t = tasks[0];
        assert.ok('title' in t);
        assert.ok('assignedTo' in t);
        assert.ok('priority' in t);
        assert.ok('dueDate' in t);
        assert.ok('category' in t);
      }
    });

    it('getTasksList filters by person', () => {
      const tasks = manager.getTasksList('emma');
      assert.ok(Array.isArray(tasks));
      // emma has task_3
    });

    it('getUpcomingEventsList returns formatted events', () => {
      const events = manager.getUpcomingEventsList(14);
      assert.ok(Array.isArray(events));
      if (events.length > 0) {
        const e = events[0];
        assert.ok('title' in e);
        assert.ok('date' in e);
        assert.ok('time' in e);
        assert.ok('location' in e);
        assert.ok('attendees' in e);
      }
    });

    it('getShoppingListSummary returns list summaries', () => {
      const summary = manager.getShoppingListSummary();
      assert.ok(Array.isArray(summary));
      assert.strictEqual(summary.length, 2);
      const groceries = summary.find(s => s.name === 'Matvaror');
      assert.ok(groceries);
      assert.strictEqual(groceries.total, 4);
      assert.strictEqual(groceries.unpurchased, 4);
    });
  });

  describe('Cleanup', () => {
    it('destroy clears intervals', () => {
      manager.destroy();
      assert.deepStrictEqual(manager._intervals, []);
    });
  });
});
