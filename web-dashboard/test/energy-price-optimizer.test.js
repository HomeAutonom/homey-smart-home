'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const EnergyPriceOptimizer = require('../energy-price-optimizer');

describe('EnergyPriceOptimizer', () => {
  let mod;

  beforeEach(() => {
    mod = new EnergyPriceOptimizer();
  });

  afterEach(() => {
    for (const id of mod._intervals) clearInterval(id);
    mod._intervals = [];
  });

  describe('constructor', () => {
    it('initializes empty intervals array', () => {
      assert.ok(Array.isArray(mod._intervals));
      assert.strictEqual(mod._intervals.length, 0);
    });

    it('initializes priceData with null current', () => {
      assert.strictEqual(mod.priceData.current, null);
    });

    it('initializes priceData with empty today array', () => {
      assert.ok(Array.isArray(mod.priceData.today));
      assert.strictEqual(mod.priceData.today.length, 0);
    });

    it('initializes priceData with empty tomorrow array', () => {
      assert.ok(Array.isArray(mod.priceData.tomorrow));
      assert.strictEqual(mod.priceData.tomorrow.length, 0);
    });

    it('sets updateInterval to 1 hour in ms', () => {
      assert.strictEqual(mod.updateInterval, 3600000);
    });

    it('initializes optimizationStrategies as a Map', () => {
      assert.ok(mod.optimizationStrategies instanceof Map);
    });
  });

  describe('generateRealisticPrices', () => {
    it('returns 24 hourly prices', () => {
      const prices = mod.generateRealisticPrices(new Date());
      assert.strictEqual(prices.length, 24);
    });

    it('each price has hour, timestamp, price, and priceLevel', () => {
      const prices = mod.generateRealisticPrices(new Date());
      for (const p of prices) {
        assert.strictEqual(typeof p.hour, 'number');
        assert.ok(p.timestamp instanceof Date);
        assert.strictEqual(typeof p.price, 'number');
        assert.strictEqual(typeof p.priceLevel, 'string');
      }
    });

    it('hours range from 0 to 23', () => {
      const prices = mod.generateRealisticPrices(new Date());
      for (let i = 0; i < 24; i++) {
        assert.strictEqual(prices[i].hour, i);
      }
    });

    it('prices are at least 50 öre', () => {
      const prices = mod.generateRealisticPrices(new Date());
      for (const p of prices) {
        assert.ok(p.price >= 50, `Price ${p.price} at hour ${p.hour} below minimum`);
      }
    });
  });

  describe('getCurrentPrice', () => {
    it('returns a price object for the current hour', () => {
      const prices = { today: mod.generateRealisticPrices(new Date()), tomorrow: [] };
      const result = mod.getCurrentPrice(prices);
      assert.strictEqual(typeof result.hour, 'number');
      assert.strictEqual(typeof result.price, 'number');
    });

    it('returns default when hour not found', () => {
      const result = mod.getCurrentPrice({ today: [], tomorrow: [] });
      assert.strictEqual(result.price, 150);
      assert.strictEqual(result.priceLevel, 'normal');
    });
  });

  describe('getPriceLevel', () => {
    const base = 150;

    it('returns very_high for diff > 50', () => {
      assert.strictEqual(mod.getPriceLevel(210, base), 'very_high');
    });

    it('returns high for diff > 25', () => {
      assert.strictEqual(mod.getPriceLevel(180, base), 'high');
    });

    it('returns normal for small diff', () => {
      assert.strictEqual(mod.getPriceLevel(155, base), 'normal');
    });

    it('returns low for diff < -10', () => {
      assert.strictEqual(mod.getPriceLevel(135, base), 'low');
    });

    it('returns very_low for diff < -25', () => {
      assert.strictEqual(mod.getPriceLevel(120, base), 'very_low');
    });
  });

  describe('initializeStrategies', () => {
    it('populates 5 strategies', () => {
      mod.initializeStrategies();
      assert.strictEqual(mod.optimizationStrategies.size, 5);
    });

    it('has heating strategy', () => {
      mod.initializeStrategies();
      assert.ok(mod.optimizationStrategies.has('heating'));
    });

    it('has hot_water strategy', () => {
      mod.initializeStrategies();
      assert.ok(mod.optimizationStrategies.has('hot_water'));
    });

    it('has charging strategy', () => {
      mod.initializeStrategies();
      assert.ok(mod.optimizationStrategies.has('charging'));
    });

    it('has load_shift strategy', () => {
      mod.initializeStrategies();
      assert.ok(mod.optimizationStrategies.has('load_shift'));
    });

    it('has appliances strategy', () => {
      mod.initializeStrategies();
      assert.ok(mod.optimizationStrategies.has('appliances'));
    });

    it('each strategy has name and execute function', () => {
      mod.initializeStrategies();
      for (const [_key, strategy] of mod.optimizationStrategies) {
        assert.strictEqual(typeof strategy.name, 'string');
        assert.strictEqual(typeof strategy.execute, 'function');
      }
    });
  });

  describe('fetchElectricityPrices', () => {
    it('returns today and tomorrow prices', async () => {
      const result = await mod.fetchElectricityPrices();
      assert.ok(Array.isArray(result.today));
      assert.ok(Array.isArray(result.tomorrow));
      assert.strictEqual(result.today.length, 24);
      assert.strictEqual(result.tomorrow.length, 24);
    });

    it('returns SEK currency', async () => {
      const result = await mod.fetchElectricityPrices();
      assert.strictEqual(result.currency, 'SEK');
      assert.strictEqual(result.unit, 'öre/kWh');
    });
  });

  describe('initialize', () => {
    it('does not reject', async () => {
      await assert.doesNotReject(() => mod.initialize());
    });

    it('populates strategies after init', async () => {
      await mod.initialize();
      assert.ok(mod.optimizationStrategies.size > 0);
    });
  });
});
