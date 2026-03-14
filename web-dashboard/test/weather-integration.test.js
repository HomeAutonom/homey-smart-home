'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const WeatherIntegration = require('../weather-integration');

describe('WeatherIntegration', () => {
  let mod;

  beforeEach(() => {
    mod = new WeatherIntegration();
  });

  afterEach(() => {
    mod.destroy();
  });

  describe('constructor', () => {
    it('initializes with default location (Stockholm)', () => {
      assert.strictEqual(mod.location.lat, 59.3293);
      assert.strictEqual(mod.location.lon, 18.0686);
    });

    it('initializes with empty cache', () => {
      assert.strictEqual(mod.cache.current, null);
      assert.strictEqual(mod.cache.forecast, null);
      assert.strictEqual(mod.cache.lastUpdate, 0);
    });

    it('has no API key by default', () => {
      assert.strictEqual(mod.apiKey, '');
    });

    it('has an empty _intervals array', () => {
      assert.ok(Array.isArray(mod._intervals));
      assert.strictEqual(mod._intervals.length, 0);
    });

    it('sets a 10 minute cache duration', () => {
      assert.strictEqual(mod.cacheDuration, 10 * 60 * 1000);
    });
  });

  describe('initialize', () => {
    it('starts update interval', async () => {
      await mod.initialize();
      assert.ok(mod._intervals.length > 0);
    });

    it('accepts custom lat/lon', async () => {
      await mod.initialize(40.7128, -74.006);
      assert.strictEqual(mod.location.lat, 40.7128);
      assert.strictEqual(mod.location.lon, -74.006);
    });

    it('does not throw without API key', async () => {
      await assert.doesNotReject(() => mod.initialize());
    });
  });

  describe('getDefaultCurrentWeather', () => {
    it('returns an object with all weather fields', () => {
      const w = mod.getDefaultCurrentWeather();
      assert.strictEqual(w.temperature, 5);
      assert.strictEqual(w.feelsLike, 3);
      assert.strictEqual(w.humidity, 75);
      assert.strictEqual(w.pressure, 1013);
      assert.strictEqual(w.windSpeed, 3);
      assert.strictEqual(w.condition, 'Clouds');
      assert.ok(w.timestamp instanceof Date);
    });
  });

  describe('getDefaultForecast', () => {
    it('returns hourly and daily arrays', () => {
      const f = mod.getDefaultForecast();
      assert.ok(Array.isArray(f.hourly));
      assert.strictEqual(f.hourly.length, 24);
      assert.ok(Array.isArray(f.daily));
      assert.ok(f.daily.length > 0);
    });

    it('each hourly entry has required fields', () => {
      const h = mod.getDefaultForecast().hourly[0];
      assert.ok('temperature' in h);
      assert.ok('humidity' in h);
      assert.ok('windSpeed' in h);
      assert.ok('condition' in h);
    });
  });

  describe('getDefaultWeather', () => {
    it('contains both current and forecast', () => {
      const w = mod.getDefaultWeather();
      assert.ok(w.current);
      assert.ok(w.forecast);
      assert.strictEqual(w.current.temperature, 5);
      assert.ok(Array.isArray(w.forecast.hourly));
    });
  });

  describe('updateWeatherData', () => {
    it('returns default weather without API key', async () => {
      const data = await mod.updateWeatherData();
      assert.ok(data.current);
      assert.ok(data.forecast);
      assert.strictEqual(data.current.temperature, 5);
    });

    it('populates the cache', async () => {
      await mod.updateWeatherData();
      assert.notStrictEqual(mod.cache.current, null);
      assert.notStrictEqual(mod.cache.forecast, null);
      assert.notStrictEqual(mod.cache.lastUpdate, null);
    });
  });

  describe('getCurrentWeather', () => {
    it('returns cached data if fresh', async () => {
      await mod.updateWeatherData();
      const w = await mod.getCurrentWeather();
      assert.strictEqual(w.temperature, 5);
    });

    it('updates data when cache is stale', async () => {
      mod.cache.current = { temperature: 99 };
      mod.cache.lastUpdate = Date.now() - (mod.cacheDuration + 1000);
      const w = await mod.getCurrentWeather();
      assert.strictEqual(w.temperature, 5); // refreshed to default
    });
  });

  describe('getForecast', () => {
    it('returns forecast with hourly array', async () => {
      const f = await mod.getForecast();
      assert.ok(Array.isArray(f.hourly));
      assert.strictEqual(f.hourly.length, 24);
    });
  });

  describe('parseCurrentWeather', () => {
    it('extracts fields from API-like data', () => {
      const raw = {
        main: { temp: 12, feels_like: 10, humidity: 60, pressure: 1010 },
        wind: { speed: 5, deg: 270 },
        clouds: { all: 80 },
        visibility: 8000,
        weather: [{ main: 'Rain', description: 'light rain', icon: '10d' }],
        sys: { sunrise: Math.floor(Date.now() / 1000), sunset: Math.floor(Date.now() / 1000) + 36000 }
      };
      const parsed = mod.parseCurrentWeather(raw);
      assert.strictEqual(parsed.temperature, 12);
      assert.strictEqual(parsed.humidity, 60);
      assert.strictEqual(parsed.windSpeed, 5);
      assert.strictEqual(parsed.condition, 'Rain');
    });

    it('uses defaults for missing fields', () => {
      const parsed = mod.parseCurrentWeather({});
      assert.strictEqual(parsed.temperature, 0);
      assert.strictEqual(parsed.humidity, 0);
      assert.strictEqual(parsed.condition, 'Clear');
    });
  });

  describe('getHeatingRecommendation', () => {
    it('returns a recommendation object', async () => {
      const rec = await mod.getHeatingRecommendation();
      assert.ok('action' in rec);
      assert.ok('reason' in rec);
      assert.ok('targetTemp' in rec);
      assert.ok('priority' in rec);
    });

    it('recommends maintain or increase for default 5°C weather', async () => {
      const rec = await mod.getHeatingRecommendation();
      assert.ok(['maintain', 'increase', 'preheat'].includes(rec.action));
    });
  });

  describe('getLightingRecommendation', () => {
    it('returns a recommendation with brightness', async () => {
      const rec = await mod.getLightingRecommendation();
      assert.ok('action' in rec);
      assert.ok('brightness' in rec);
      assert.ok(typeof rec.brightness === 'number');
    });
  });

  describe('getWeatherBasedRecommendations', () => {
    it('returns all recommendation categories', async () => {
      const recs = await mod.getWeatherBasedRecommendations();
      assert.ok('heating' in recs);
      assert.ok('lighting' in recs);
      assert.ok('energy' in recs);
      assert.ok('comfort' in recs);
      assert.ok('alerts' in recs);
      assert.ok('automations' in recs);
    });
  });

  describe('getWeatherIcon', () => {
    it('maps known conditions to emoji', () => {
      assert.strictEqual(mod.getWeatherIcon('Clear'), '☀️');
      assert.strictEqual(mod.getWeatherIcon('Rain'), '🌧️');
      assert.strictEqual(mod.getWeatherIcon('Snow'), '❄️');
    });

    it('returns fallback for unknown condition', () => {
      assert.strictEqual(mod.getWeatherIcon('Tornado'), '🌤️');
    });
  });

  describe('getMostCommonCondition', () => {
    it('returns the most frequent condition', () => {
      const result = mod.getMostCommonCondition(['Rain', 'Clear', 'Rain', 'Clouds']);
      assert.strictEqual(result, 'Rain');
    });

    it('handles a single condition', () => {
      assert.strictEqual(mod.getMostCommonCondition(['Snow']), 'Snow');
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
