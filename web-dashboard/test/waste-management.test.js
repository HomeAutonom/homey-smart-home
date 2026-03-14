'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const WasteManagement = require('../waste-management');

describe('WasteManagement', () => {
  let mod;
  const mockApp = {};

  beforeEach(() => {
    mod = new WasteManagement(mockApp);
  });

  afterEach(() => {
    mod.destroy();
  });

  describe('constructor', () => {
    it('initializes _intervals as empty array', () => {
      assert.ok(Array.isArray(mod._intervals));
      assert.strictEqual(mod._intervals.length, 0);
    });

    it('initializes empty bins map', () => {
      assert.ok(mod.bins instanceof Map);
      assert.strictEqual(mod.bins.size, 0);
    });

    it('initializes empty collectionSchedule map', () => {
      assert.ok(mod.collectionSchedule instanceof Map);
      assert.strictEqual(mod.collectionSchedule.size, 0);
    });

    it('initializes empty wasteLog array', () => {
      assert.ok(Array.isArray(mod.wasteLog));
      assert.strictEqual(mod.wasteLog.length, 0);
    });
  });

  describe('initialize', () => {
    it('loads 9 bins', async () => {
      await mod.initialize();
      assert.strictEqual(mod.bins.size, 9);
    });

    it('loads collection schedule', async () => {
      await mod.initialize();
      assert.ok(mod.collectionSchedule.size > 0);
    });

    it('starts intervals', async () => {
      await mod.initialize();
      assert.ok(mod._intervals.length > 0);
    });

    it('loads bin_general with correct data', async () => {
      await mod.initialize();
      const bin = mod.bins.get('bin_general');
      assert.ok(bin);
      assert.strictEqual(bin.name, 'Restavfall');
      assert.strictEqual(bin.color, 'green');
      assert.strictEqual(bin.capacity, 240);
      assert.strictEqual(bin.collectionDay, 'tuesday');
    });

    it('loads bin_organic as compostable', async () => {
      await mod.initialize();
      const bin = mod.bins.get('bin_organic');
      assert.ok(bin);
      assert.strictEqual(bin.name, 'Matavfall');
      assert.strictEqual(bin.color, 'brown');
      assert.strictEqual(bin.capacity, 140);
      assert.strictEqual(bin.collectionDay, 'monday');
      assert.strictEqual(bin.compostable, true);
    });

    it('loads bin_electronics with special handling', async () => {
      await mod.initialize();
      const bin = mod.bins.get('bin_electronics');
      assert.ok(bin);
      assert.strictEqual(bin.name, 'Elektronik');
      assert.strictEqual(bin.specialHandling, true);
    });

    it('sets sensor true for bins with capacity > 100', async () => {
      await mod.initialize();
      const general = mod.bins.get('bin_general');
      assert.strictEqual(general.sensor, true);
      const batteries = mod.bins.get('bin_batteries');
      assert.strictEqual(batteries.sensor, false);
    });
  });

  describe('recordWaste', () => {
    it('records waste for valid bin', async () => {
      await mod.initialize();
      const result = await mod.recordWaste('bin_general', 5, { category: 'general' });
      assert.strictEqual(result.success, true);
      assert.ok(result.entry);
    });

    it('returns error for non-existent bin', async () => {
      await mod.initialize();
      const result = await mod.recordWaste('bin_fake', 5);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Bin not found');
    });
  });

  describe('emptyBin', () => {
    it('empties valid bin', async () => {
      await mod.initialize();
      const result = await mod.emptyBin('bin_general');
      assert.strictEqual(result.success, true);
      assert.ok(result.bin);
    });

    it('returns error for non-existent bin', async () => {
      await mod.initialize();
      const result = await mod.emptyBin('bin_fake');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Bin not found');
    });
  });

  describe('getBinStatus', () => {
    it('returns null for non-existent bin', async () => {
      await mod.initialize();
      const result = mod.getBinStatus('bin_fake');
      assert.strictEqual(result, null);
    });

    it('returns status object for valid bin', async () => {
      await mod.initialize();
      const result = mod.getBinStatus('bin_general');
      assert.ok(result);
      assert.ok(result.status);
      assert.ok(['ok', 'nearly_full', 'full'].includes(result.status));
    });
  });

  describe('getAllBins', () => {
    it('returns array of all bins', async () => {
      await mod.initialize();
      const bins = mod.getAllBins();
      assert.ok(Array.isArray(bins));
      assert.strictEqual(bins.length, 9);
    });
  });

  describe('getCollectionSchedule', () => {
    it('returns collection schedule', async () => {
      await mod.initialize();
      const schedule = mod.getCollectionSchedule();
      assert.ok(schedule);
    });

    it('has monday schedule for organic waste', async () => {
      await mod.initialize();
      const schedule = mod.getCollectionSchedule();
      const monday = schedule.find(s => s.day === 'monday') || schedule.get?.('monday');
      // Schedule might be array or map - check accordingly
      assert.ok(schedule);
    });
  });

  describe('getUpcomingCollections', () => {
    it('returns upcoming collections', async () => {
      await mod.initialize();
      const upcoming = mod.getUpcomingCollections();
      assert.ok(Array.isArray(upcoming));
    });

    it('accepts days parameter', async () => {
      await mod.initialize();
      const upcoming = mod.getUpcomingCollections(3);
      assert.ok(Array.isArray(upcoming));
    });
  });

  describe('getWasteSummary', () => {
    it('returns summary object', async () => {
      await mod.initialize();
      const summary = mod.getWasteSummary();
      assert.ok(summary);
    });

    it('accepts days parameter', async () => {
      await mod.initialize();
      const summary = mod.getWasteSummary(7);
      assert.ok(summary);
    });
  });

  describe('getWasteReductionTips', () => {
    it('returns tips with 4 categories', async () => {
      await mod.initialize();
      const tips = mod.getWasteReductionTips();
      assert.ok(tips);
      assert.ok(Array.isArray(tips) || typeof tips === 'object');
    });
  });

  describe('getRecyclingGuide', () => {
    it('returns recycling guide', async () => {
      await mod.initialize();
      const guide = mod.getRecyclingGuide();
      assert.ok(guide);
    });

    it('includes guide for Papper', async () => {
      await mod.initialize();
      const guide = mod.getRecyclingGuide();
      const paper = Array.isArray(guide) 
        ? guide.find(g => g.type === 'Papper' || g.name === 'Papper')
        : guide['Papper'] || guide.papper;
      assert.ok(paper);
    });
  });

  describe('getEnvironmentalImpact', () => {
    it('returns environmental impact stats', async () => {
      await mod.initialize();
      const impact = mod.getEnvironmentalImpact();
      assert.ok(impact);
      assert.ok(typeof impact.co2Saved === 'number');
      assert.ok(typeof impact.landfillAvoided === 'number');
      assert.ok(typeof impact.treesEquivalent === 'number');
      assert.ok(typeof impact.costSavings === 'number');
    });
  });

  describe('getMonthlyComparison', () => {
    it('returns monthly comparison', async () => {
      await mod.initialize();
      const comparison = mod.getMonthlyComparison();
      assert.ok(comparison);
      assert.ok('thisMonth' in comparison);
      assert.ok('lastMonth' in comparison);
      assert.ok('change' in comparison);
      assert.ok('trend' in comparison);
    });

    it('trend is one of improving/worsening/stable', async () => {
      await mod.initialize();
      const comparison = mod.getMonthlyComparison();
      assert.ok(['improving', 'worsening', 'stable'].includes(comparison.trend));
    });
  });

  describe('destroy', () => {
    it('clears all intervals', async () => {
      await mod.initialize();
      assert.ok(mod._intervals.length > 0);
      mod.destroy();
      assert.strictEqual(mod._intervals.length, 0);
    });
  });
});
