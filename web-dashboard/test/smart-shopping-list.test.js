'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const SmartShoppingList = require('../smart-shopping-list');

describe('SmartShoppingList', () => {
  let mod;
  const mockApp = {};

  beforeEach(() => {
    mod = new SmartShoppingList(mockApp);
  });

  afterEach(() => {
    mod.destroy();
  });

  describe('constructor', () => {
    it('initializes _intervals as empty array', () => {
      assert.ok(Array.isArray(mod._intervals));
      assert.strictEqual(mod._intervals.length, 0);
    });

    it('initializes empty items map', () => {
      assert.ok(mod.items instanceof Map);
      assert.strictEqual(mod.items.size, 0);
    });

    it('initializes empty categories map', () => {
      assert.ok(mod.categories instanceof Map);
      assert.strictEqual(mod.categories.size, 0);
    });

    it('initializes empty consumptionPatterns map', () => {
      assert.ok(mod.consumptionPatterns instanceof Map);
      assert.strictEqual(mod.consumptionPatterns.size, 0);
    });

    it('initializes empty stores map', () => {
      assert.ok(mod.stores instanceof Map);
      assert.strictEqual(mod.stores.size, 0);
    });

    it('initializes empty purchaseHistory array', () => {
      assert.ok(Array.isArray(mod.purchaseHistory));
      assert.strictEqual(mod.purchaseHistory.length, 0);
    });
  });

  describe('initialize', () => {
    it('loads 11 categories', async () => {
      await mod.initialize();
      assert.strictEqual(mod.categories.size, 11);
    });

    it('loads 5 stores', async () => {
      await mod.initialize();
      assert.strictEqual(mod.stores.size, 5);
    });

    it('loads 9 consumption patterns', async () => {
      await mod.initialize();
      assert.strictEqual(mod.consumptionPatterns.size, 9);
    });

    it('loads ICA store at 1.2km', async () => {
      await mod.initialize();
      const ica = mod.stores.get('ica');
      assert.ok(ica);
      assert.strictEqual(ica.name, 'ICA');
      assert.strictEqual(ica.distance, 1.2);
    });

    it('loads Coop store at 0.8km', async () => {
      await mod.initialize();
      const coop = mod.stores.get('coop');
      assert.ok(coop);
      assert.strictEqual(coop.name, 'Coop');
      assert.strictEqual(coop.distance, 0.8);
    });

    it('loads milk consumption pattern at 4 day interval', async () => {
      await mod.initialize();
      const milk = mod.consumptionPatterns.get('Mjölk');
      assert.ok(milk);
      assert.strictEqual(milk.averageInterval, 4);
    });

    it('starts intervals', async () => {
      await mod.initialize();
      assert.ok(mod._intervals.length > 0);
    });
  });

  describe('addItem', () => {
    it('adds item and returns success', async () => {
      await mod.initialize();
      const result = await mod.addItem({ name: 'Mjölk' });
      assert.strictEqual(result.success, true);
      assert.ok(result.item);
      assert.strictEqual(result.item.name, 'Mjölk');
    });

    it('defaults quantity to 1', async () => {
      await mod.initialize();
      const result = await mod.addItem({ name: 'Bröd' });
      assert.strictEqual(result.item.quantity, 1);
    });

    it('defaults unit to st', async () => {
      await mod.initialize();
      const result = await mod.addItem({ name: 'Ägg' });
      assert.strictEqual(result.item.unit, 'st');
    });

    it('defaults priority to normal', async () => {
      await mod.initialize();
      const result = await mod.addItem({ name: 'Pasta' });
      assert.strictEqual(result.item.priority, 'normal');
    });

    it('uses custom values if provided', async () => {
      await mod.initialize();
      const result = await mod.addItem({ name: 'Mjölk', quantity: 3, unit: 'liter', priority: 'high' });
      assert.strictEqual(result.item.quantity, 3);
      assert.strictEqual(result.item.unit, 'liter');
      assert.strictEqual(result.item.priority, 'high');
    });
  });

  describe('updateItem', () => {
    it('updates existing item', async () => {
      await mod.initialize();
      const { item } = (await mod.addItem({ name: 'Mjölk' }));
      const result = await mod.updateItem(item.id, { quantity: 5 });
      assert.strictEqual(result.success, true);
    });

    it('returns error for non-existent item', async () => {
      await mod.initialize();
      const result = await mod.updateItem('item_fake', { quantity: 5 });
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Item not found');
    });
  });

  describe('removeItem', () => {
    it('removes existing item', async () => {
      await mod.initialize();
      const { item } = (await mod.addItem({ name: 'Mjölk' }));
      const result = await mod.removeItem(item.id);
      assert.strictEqual(result.success, true);
    });

    it('returns error for non-existent item', async () => {
      await mod.initialize();
      const result = await mod.removeItem('item_fake');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Item not found');
    });
  });

  describe('checkItem', () => {
    it('checks an item', async () => {
      await mod.initialize();
      const { item } = (await mod.addItem({ name: 'Mjölk' }));
      const result = await mod.checkItem(item.id, true);
      assert.strictEqual(result.success, true);
    });

    it('returns error for non-existent item', async () => {
      await mod.initialize();
      const result = await mod.checkItem('item_fake', true);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Item not found');
    });
  });

  describe('markPurchased', () => {
    it('marks an item as purchased', async () => {
      await mod.initialize();
      const { item } = (await mod.addItem({ name: 'Mjölk' }));
      const result = await mod.markPurchased(item.id);
      assert.strictEqual(result.success, true);
    });

    it('returns error for non-existent item', async () => {
      await mod.initialize();
      const result = await mod.markPurchased('item_fake');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Item not found');
    });
  });

  describe('optimizeShoppingTrip', () => {
    it('returns error if list is empty', async () => {
      await mod.initialize();
      const result = await mod.optimizeShoppingTrip();
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'No items on list');
    });

    it('returns optimized trip when items exist', async () => {
      await mod.initialize();
      await mod.addItem({ name: 'Mjölk' });
      await mod.addItem({ name: 'Bröd' });
      const result = await mod.optimizeShoppingTrip();
      assert.strictEqual(result.success, true);
    });
  });

  describe('sortByStore', () => {
    it('returns error for unknown store', async () => {
      await mod.initialize();
      const result = await mod.sortByStore('nonexistent_store');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Store not found');
    });

    it('sorts items by store when items exist', async () => {
      await mod.initialize();
      await mod.addItem({ name: 'Mjölk' });
      const result = await mod.sortByStore('ica');
      assert.strictEqual(result.success, true);
    });
  });

  describe('addItemByVoice', () => {
    it('returns error for unrecognized input', async () => {
      await mod.initialize();
      const result = await mod.addItemByVoice('random gibberish');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Could not understand input');
    });

    it('parses Swedish voice command', async () => {
      await mod.initialize();
      const result = await mod.addItemByVoice('köp 2 liter mjölk');
      assert.strictEqual(result.success, true);
      assert.ok(result.item);
    });

    it('parses "lägg till" command', async () => {
      await mod.initialize();
      const result = await mod.addItemByVoice('lägg till 1 st bröd');
      assert.strictEqual(result.success, true);
    });
  });

  describe('guessCategoryByName', () => {
    it('maps dairy items to mejeri', async () => {
      await mod.initialize();
      const cat = mod.guessCategoryByName('mjölk');
      assert.strictEqual(cat, 'mejeri');
    });

    it('defaults unknown items to ovrigt', async () => {
      await mod.initialize();
      const cat = mod.guessCategoryByName('xyzunknown');
      assert.strictEqual(cat, 'ovrigt');
    });
  });

  describe('getActiveList', () => {
    it('returns empty list initially', async () => {
      await mod.initialize();
      const result = mod.getActiveList();
      assert.ok(result.items);
      assert.strictEqual(result.total, 0);
    });

    it('includes added items', async () => {
      await mod.initialize();
      await mod.addItem({ name: 'Mjölk' });
      const result = mod.getActiveList();
      assert.ok(result.total > 0);
    });
  });

  describe('getSuggestions', () => {
    it('returns suggestions array', async () => {
      await mod.initialize();
      const suggestions = mod.getSuggestions();
      assert.ok(Array.isArray(suggestions));
    });
  });

  describe('getStats', () => {
    it('returns statistics object', async () => {
      await mod.initialize();
      const stats = mod.getStats();
      assert.ok(stats);
      assert.ok(typeof stats === 'object');
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
