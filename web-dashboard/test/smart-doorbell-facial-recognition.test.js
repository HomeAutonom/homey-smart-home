'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const SmartDoorbellFacialRecognition = require('../smart-doorbell-facial-recognition');

describe('SmartDoorbellFacialRecognition', () => {
  let mod;

  beforeEach(async () => {
    mod = new SmartDoorbellFacialRecognition({ emit: () => {} });
    await mod.initialize();
  });

  afterEach(() => {
    mod.destroy();
  });

  describe('initialization', () => {
    it('sets up known people', () => {
      assert.ok(mod.knownPeople.size >= 7);
      assert.ok(mod.knownPeople.has('person_anna'));
      assert.ok(mod.knownPeople.has('person_erik'));
      assert.ok(mod.knownPeople.has('person_delivery_postnord'));
    });

    it('sets up motion zones', () => {
      assert.ok(mod.motionZones.length >= 3);
      const entrance = mod.motionZones.find(z => z.id === 'zone_entrance');
      assert.ok(entrance);
      assert.strictEqual(entrance.enabled, true);
      assert.strictEqual(entrance.sensitivity, 'medium');
    });

    it('has default settings', () => {
      assert.strictEqual(mod.settings.motionDetection, true);
      assert.strictEqual(mod.settings.nightVision, true);
      assert.strictEqual(mod.settings.recordingMode, 'motion');
      assert.strictEqual(mod.settings.resolution, '1080p');
      assert.strictEqual(mod.settings.audioEnabled, true);
    });
  });

  describe('recognizeFace', () => {
    it('returns a recognition result with recognized boolean', async () => {
      const result = await mod.recognizeFace('image_data');
      assert.strictEqual(typeof result.recognized, 'boolean');
      if (result.recognized) {
        assert.ok(result.person);
        assert.ok(result.confidence > 0);
      } else {
        assert.strictEqual(result.stranger, true);
      }
    });
  });

  describe('addKnownPerson / removeKnownPerson', () => {
    it('adds a new person', async () => {
      const result = await mod.addKnownPerson({ name: 'TestPerson', relation: 'friend' });
      assert.strictEqual(result.success, true);
      assert.ok(result.personId.startsWith('person_'));
    });

    it('removes an existing person', async () => {
      const added = await mod.addKnownPerson({ name: 'ToRemove', relation: 'friend' });
      const result = await mod.removeKnownPerson(added.personId);
      assert.strictEqual(result.success, true);
    });

    it('fails to remove nonexistent person', async () => {
      const result = await mod.removeKnownPerson('person_nonexistent');
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('handleDoorbellPress', () => {
    it('creates a doorbell event', async () => {
      const result = await mod.handleDoorbellPress();
      assert.ok(result.id);
      assert.strictEqual(result.type, 'doorbell');
      assert.ok(result.timestamp);
      assert.ok(mod.events.length > 0);
    });
  });

  describe('detectMotion', () => {
    it('detects motion in enabled zone', async () => {
      const result = await mod.detectMotion('zone_entrance');
      assert.strictEqual(result.motionDetected, true);
      assert.ok(result.event);
    });

    it('returns no motion for disabled zone', async () => {
      const result = await mod.detectMotion('zone_driveway');
      assert.strictEqual(result.motionDetected, false);
    });

    it('returns no motion for unknown zone', async () => {
      const result = await mod.detectMotion('zone_nonexistent');
      assert.strictEqual(result.motionDetected, false);
    });
  });

  describe('detectPackage', () => {
    it('creates a package event', async () => {
      const result = await mod.detectPackage();
      assert.ok(result);
      assert.ok(mod.events.length > 0);
    });
  });

  describe('audio features', () => {
    it('speak returns success', async () => {
      const result = await mod.speak('Hello');
      assert.strictEqual(result.success, true);
    });

    it('enableTwoWayAudio returns active', async () => {
      const result = await mod.enableTwoWayAudio();
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.status, 'active');
    });

    it('playPrerecordedMessage returns known message', async () => {
      const result = await mod.playPrerecordedMessage('msg_1');
      assert.strictEqual(result.success, true);
      assert.ok(result.message);
    });

    it('playPrerecordedMessage defaults for unknown ID', async () => {
      const result = await mod.playPrerecordedMessage('msg_unknown');
      assert.strictEqual(result.success, true);
    });
  });

  describe('door control', () => {
    it('unlockDoor returns success with duration', async () => {
      const result = await mod.unlockDoor();
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.duration, 300);
    });

    it('lockDoor returns success', async () => {
      const result = await mod.lockDoor();
      assert.strictEqual(result.success, true);
    });
  });

  describe('logVisit', () => {
    it('logs a visit and adds to visitors', async () => {
      const visit = await mod.logVisit({ personId: 'person_anna', name: 'Anna', relation: 'family', recognized: true, timestamp: Date.now() });
      assert.ok(visit.id.startsWith('visit_'));
      assert.strictEqual(visit.name, 'Anna');
      assert.strictEqual(visit.recognized, true);
      assert.ok(mod.visitors.length > 0);
    });
  });

  describe('getVisitorHistory', () => {
    it('returns recent visitors', async () => {
      await mod.logVisit({ personId: 'person_anna', name: 'Anna', relation: 'family', recognized: true, timestamp: Date.now() });
      const history = mod.getVisitorHistory(7);
      assert.ok(Array.isArray(history));
      assert.ok(history.length > 0);
      assert.ok(history[0].name);
      assert.ok(history[0].date);
    });
  });

  describe('getFrequentVisitors', () => {
    it('returns sorted frequent visitors', async () => {
      await mod.logVisit({ personId: 'p1', name: 'Anna', relation: 'family', recognized: true, timestamp: Date.now() });
      await mod.logVisit({ personId: 'p1', name: 'Anna', relation: 'family', recognized: true, timestamp: Date.now() });
      await mod.logVisit({ personId: 'p2', name: 'Erik', relation: 'family', recognized: true, timestamp: Date.now() });
      const frequent = mod.getFrequentVisitors(30);
      assert.ok(Array.isArray(frequent));
      assert.strictEqual(frequent[0].name, 'Anna');
      assert.strictEqual(frequent[0].visits, 2);
    });
  });

  describe('smart features', () => {
    it('enableQuietMode returns success', async () => {
      const result = await mod.enableQuietMode('22:00', '07:00');
      assert.strictEqual(result.success, true);
    });

    it('setCustomGreeting updates people by relation', async () => {
      const result = await mod.setCustomGreeting('family', 'Hej!');
      assert.strictEqual(result.success, true);
      assert.ok(result.count > 0);
    });

    it('analyzeVisitorPatterns returns patterns', async () => {
      const patterns = await mod.analyzeVisitorPatterns();
      assert.ok(patterns.peakHours);
      assert.ok(patterns.commonRelations);
      assert.ok(typeof patterns.averageVisitsPerDay === 'number');
    });
  });

  describe('reporting', () => {
    it('getDoorbellOverview returns stats', () => {
      const overview = mod.getDoorbellOverview();
      assert.ok(typeof overview.knownPeople === 'number');
      assert.ok(typeof overview.totalEvents === 'number');
      assert.ok(typeof overview.totalVisitors === 'number');
    });

    it('getKnownPeopleList returns array', () => {
      const list = mod.getKnownPeopleList();
      assert.ok(Array.isArray(list));
      assert.ok(list.length > 0);
      assert.ok(list[0].name);
      assert.ok(list[0].relation);
    });

    it('getRecentEvents returns array', () => {
      const events = mod.getRecentEvents();
      assert.ok(Array.isArray(events));
    });
  });

  describe('notifications', () => {
    it('sendNotification returns success', async () => {
      const result = await mod.sendNotification('Test', 'high');
      assert.strictEqual(result.success, true);
    });
  });

  describe('destroy', () => {
    it('clears intervals and timeouts', () => {
      mod.destroy();
      assert.deepStrictEqual(mod._intervals, []);
      assert.deepStrictEqual(mod._timeouts, []);
    });
  });
});
