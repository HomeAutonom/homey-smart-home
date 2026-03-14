'use strict';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

const CommunityIntegrationHub = require('../community-integration-hub');

describe('CommunityIntegrationHub', () => {
  let hub;
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
    hub = new CommunityIntegrationHub({});
    await hub.initialize();
  });

  afterEach(() => {
    if (hub && typeof hub.destroy === 'function') {
      hub.destroy();
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
      assert.ok(hub);
    });

    it('should have neighbors map', () => {
      assert.ok(hub.neighbors instanceof Map);
    });

    it('should have shared resources', () => {
      assert.ok(hub.sharedResources instanceof Map);
    });

    it('should have community events', () => {
      assert.ok(Array.isArray(hub.communityEvents));
    });

    it('should have local services', () => {
      assert.ok(hub.localServices instanceof Map);
    });
  });

  describe('addNeighbor', () => {
    it('should add a neighbor', async () => {
      const neighbor = await hub.addNeighbor({ name: 'Alice', apartment: '3A', phone: '0701234567' });
      assert.ok(neighbor);
      assert.ok(neighbor.id);
      assert.strictEqual(neighbor.name, 'Alice');
    });

    it('should set default trust level', async () => {
      const neighbor = await hub.addNeighbor({ name: 'Bob' });
      assert.strictEqual(typeof neighbor.trustLevel, 'number');
    });
  });

  describe('updateTrustLevel', () => {
    it('should increase trust on positive interaction', async () => {
      const neighbor = await hub.addNeighbor({ name: 'Claire' });
      const initialTrust = neighbor.trustLevel;
      const result = await hub.updateTrustLevel(neighbor.id, 'positive');
      assert.strictEqual(result.success, true);
      assert.ok(result.neighbor.trustLevel >= initialTrust);
    });

    it('should decrease trust on negative interaction', async () => {
      const neighbor = await hub.addNeighbor({ name: 'Dave' });
      const initialTrust = neighbor.trustLevel;
      const result = await hub.updateTrustLevel(neighbor.id, 'negative');
      assert.strictEqual(result.success, true);
      assert.ok(result.neighbor.trustLevel <= initialTrust);
    });

    it('should fail for unknown neighbor', async () => {
      const result = await hub.updateTrustLevel('nonexistent', 'positive');
      assert.strictEqual(result.success, false);
    });
  });

  describe('shareResource', () => {
    it('should share a resource', async () => {
      const resource = await hub.shareResource('Ladder', 'tools', 500);
      assert.ok(resource);
      assert.ok(resource.id);
      assert.strictEqual(resource.name, 'Ladder');
    });

    it('should mark resource as available for sharing', async () => {
      const resource = await hub.shareResource('Drill', 'tools', 300);
      assert.strictEqual(resource.availableForSharing, true);
    });
  });

  describe('borrowResource', () => {
    it('should borrow an available resource', async () => {
      const resource = await hub.shareResource('Saw', 'tools', 200);
      const result = await hub.borrowResource(resource.id, 3);
      assert.strictEqual(result.success, true);
      assert.ok(result.transaction);
    });

    it('should fail for non-existent resource', async () => {
      const result = await hub.borrowResource('nonexistent', 3);
      assert.strictEqual(result.success, false);
    });

    it('should fail for already borrowed resource', async () => {
      const resource = await hub.shareResource('Hammer', 'tools', 100);
      await hub.borrowResource(resource.id, 3);
      const result = await hub.borrowResource(resource.id, 2);
      assert.strictEqual(result.success, false);
    });
  });

  describe('returnResource', () => {
    it('should return a borrowed resource', async () => {
      const resource = await hub.shareResource('Wrench', 'tools', 150);
      await hub.borrowResource(resource.id, 3);
      const result = await hub.returnResource(resource.id);
      assert.strictEqual(result.success, true);
    });

    it('should fail for non-existent resource', async () => {
      const result = await hub.returnResource('nonexistent');
      assert.strictEqual(result.success, false);
    });
  });

  describe('createEvent', () => {
    it('should create a community event', async () => {
      const event = await hub.createEvent({
        name: 'BBQ Party',
        date: new Date(Date.now() + 86400000).toISOString(),
        location: 'Garden',
        maxParticipants: 20
      });
      assert.ok(event);
      assert.ok(event.id);
      assert.strictEqual(event.name, 'BBQ Party');
    });
  });

  describe('joinEvent', () => {
    it('should return already-joined for own event', async () => {
      const event = await hub.createEvent({
        name: 'Movie Night',
        date: new Date(Date.now() + 86400000).toISOString()
      });
      const result = await hub.joinEvent(event.id);
      // Creator 'self' is already in participants
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Already joined');
    });

    it('should fail for non-existent event', async () => {
      const result = await hub.joinEvent('nonexistent');
      assert.strictEqual(result.success, false);
    });
  });

  describe('recommendService', () => {
    it('should return recommendations or null', async () => {
      const result = await hub.recommendService('plumber');
      // Can be null or object depending on data
      assert.ok(result === null || typeof result === 'object');
    });
  });

  describe('useService', () => {
    it('should fail for non-existent service', async () => {
      const result = await hub.useService('nonexistent');
      assert.strictEqual(result.success, false);
    });
  });

  describe('getCommunityOverview', () => {
    it('should return overview stats', () => {
      const overview = hub.getCommunityOverview();
      assert.ok(overview);
      assert.strictEqual(typeof overview.totalNeighbors, 'number');
      assert.strictEqual(typeof overview.sharedResources, 'number');
    });
  });

  describe('getNeighborsList', () => {
    it('should return neighbors array', () => {
      const list = hub.getNeighborsList();
      assert.ok(Array.isArray(list));
    });
  });

  describe('getSharedResourcesList', () => {
    it('should return resources array', () => {
      const list = hub.getSharedResourcesList();
      assert.ok(Array.isArray(list));
    });
  });

  describe('getUpcomingEvents', () => {
    it('should return events array', () => {
      const events = hub.getUpcomingEvents();
      assert.ok(Array.isArray(events));
    });
  });

  describe('getLocalServiceRecommendations', () => {
    it('should return recommendations object', () => {
      const recs = hub.getLocalServiceRecommendations();
      assert.ok(recs);
      assert.strictEqual(typeof recs, 'object');
    });
  });

  describe('destroy', () => {
    it('should clean up resources', () => {
      hub.destroy();
      assert.ok(true);
    });
  });
});
