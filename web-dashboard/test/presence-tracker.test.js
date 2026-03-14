'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const PresenceTracker = require('../presence-tracker');

describe('PresenceTracker', () => {
  let mod;
  let mockApp;

  beforeEach(() => {
    mockApp = { homeyClient: null };
    mod = new PresenceTracker(mockApp);
  });

  afterEach(() => {
    for (const id of mod._intervals) clearInterval(id);
    mod._intervals = [];
  });

  describe('constructor', () => {
    it('stores the app reference', () => {
      assert.strictEqual(mod.app, mockApp);
    });

    it('initializes empty intervals array', () => {
      assert.ok(Array.isArray(mod._intervals));
      assert.strictEqual(mod._intervals.length, 0);
    });

    it('initializes rooms as a Map', () => {
      assert.ok(mod.rooms instanceof Map);
    });

    it('initializes empty presenceHistory', () => {
      assert.ok(Array.isArray(mod.presenceHistory));
      assert.strictEqual(mod.presenceHistory.length, 0);
    });

    it('initializes behaviors as a Map', () => {
      assert.ok(mod.behaviors instanceof Map);
    });

    it('sets maxHistorySize to 10000', () => {
      assert.strictEqual(mod.maxHistorySize, 10000);
    });
  });

  describe('initializeRooms', () => {
    it('populates rooms map', () => {
      mod.initializeRooms();
      assert.ok(mod.rooms.size > 0);
    });

    it('loads 6 rooms', () => {
      mod.initializeRooms();
      assert.strictEqual(mod.rooms.size, 6);
    });

    it('includes expected rooms', () => {
      mod.initializeRooms();
      const expected = ['living_room', 'kitchen', 'bedroom', 'bathroom', 'hallway', 'office'];
      for (const roomId of expected) {
        assert.ok(mod.rooms.has(roomId), `Missing room: ${roomId}`);
      }
    });

    it('each room starts unoccupied', () => {
      mod.initializeRooms();
      for (const [_id, room] of mod.rooms) {
        assert.strictEqual(room.occupied, false);
      }
    });

    it('each room has sensors array', () => {
      mod.initializeRooms();
      for (const [_id, room] of mod.rooms) {
        assert.ok(Array.isArray(room.sensors));
      }
    });

    it('each room has timeout', () => {
      mod.initializeRooms();
      for (const [_id, room] of mod.rooms) {
        assert.strictEqual(typeof room.timeout, 'number');
        assert.ok(room.timeout > 0);
      }
    });
  });

  describe('simulateMotionDetection', () => {
    it('returns a boolean', () => {
      mod.initializeRooms();
      const result = mod.simulateMotionDetection('living_room');
      assert.strictEqual(typeof result, 'boolean');
    });
  });

  describe('handleRoomEntry', () => {
    it('marks room as occupied', () => {
      mod.initializeRooms();
      mod.handleRoomEntry('living_room', Date.now());
      const room = mod.rooms.get('living_room');
      assert.strictEqual(room.occupied, true);
    });

    it('increments visit count', () => {
      mod.initializeRooms();
      const before = mod.rooms.get('living_room').visitCount;
      mod.handleRoomEntry('living_room', Date.now());
      assert.strictEqual(mod.rooms.get('living_room').visitCount, before + 1);
    });

    it('adds entry to presence history', () => {
      mod.initializeRooms();
      mod.handleRoomEntry('kitchen', Date.now());
      assert.ok(mod.presenceHistory.length > 0);
    });
  });

  describe('handleRoomExit', () => {
    it('marks room as unoccupied', () => {
      mod.initializeRooms();
      mod.handleRoomEntry('living_room', Date.now() - 60000);
      mod.handleRoomExit('living_room', Date.now());
      const room = mod.rooms.get('living_room');
      assert.strictEqual(room.occupied, false);
    });
  });

  describe('logPresenceEvent', () => {
    it('adds event to history', () => {
      mod.logPresenceEvent({ type: 'entry', roomId: 'kitchen', timestamp: Date.now() });
      assert.ok(mod.presenceHistory.length > 0);
    });

    it('trims history when exceeding maxHistorySize', () => {
      mod.maxHistorySize = 3;
      for (let i = 0; i < 10; i++) {
        mod.logPresenceEvent({ type: 'entry', roomId: 'kitchen', timestamp: Date.now() });
      }
      assert.ok(mod.presenceHistory.length <= 3);
    });
  });

  describe('initialize', () => {
    it('does not reject', async () => {
      await assert.doesNotReject(() => mod.initialize());
    });
  });
});
