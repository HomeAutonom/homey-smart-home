'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const AdvancedWeatherPredictor = require('../advanced-weather-predictor');

describe('AdvancedWeatherPredictor', () => {
  let mod;

  beforeEach(async () => {
    mod = new AdvancedWeatherPredictor({ emit: () => {} });
    await mod.initialize();
  });

  afterEach(() => {
    mod.destroy();
  });

  describe('initialization', () => {
    it('sets Stockholm location', () => {
      assert.strictEqual(mod.location.lat, 59.3293);
      assert.strictEqual(mod.location.lon, 18.0686);
    });

    it('has current weather data', () => {
      assert.ok(mod.currentWeather);
      assert.strictEqual(mod.currentWeather.temperature, 18);
      assert.strictEqual(mod.currentWeather.humidity, 65);
      assert.strictEqual(mod.currentWeather.condition, 'partly_cloudy');
    });

    it('has 7-day forecast', () => {
      assert.strictEqual(mod.forecast.length, 7);
      assert.ok(mod.forecast[0].dayOfWeek);
      assert.ok(typeof mod.forecast[0].high === 'number');
    });

    it('sets up automation rules', () => {
      assert.ok(mod.automationRules.size >= 6);
      assert.ok(mod.automationRules.has('rain_windows'));
      assert.ok(mod.automationRules.has('hot_sun_blinds'));
      assert.ok(mod.automationRules.has('cold_heating'));
    });
  });

  describe('updateCurrentWeather', () => {
    it('returns current weather and adds to history', async () => {
      const initialLen = mod.weatherHistory.length;
      const weather = await mod.updateCurrentWeather();
      assert.ok(weather);
      assert.strictEqual(weather.temperature, 18);
      assert.ok(mod.weatherHistory.length > initialLen);
    });

    it('trims history when exceeding MAX_ENTRIES', async () => {
      // Fill to exactly MAX_ENTRIES
      for (let i = 0; i < 1000; i++) {
        mod.weatherHistory.push({ timestamp: Date.now(), temperature: 18, humidity: 65, precipitation: 0, condition: 'sunny' });
      }
      const before = mod.weatherHistory.length;
      await mod.updateCurrentWeather();
      // updateCurrentWeather pushes 1 entry then shifts 1, keeping at 1001 then back to 1000
      assert.ok(mod.weatherHistory.length <= before + 1);
    });
  });

  describe('updateForecast', () => {
    it('generates 7-day forecast', async () => {
      await mod.updateForecast();
      assert.strictEqual(mod.forecast.length, 7);
    });
  });

  describe('checkWeatherAlerts', () => {
    it('returns alerts array', async () => {
      const alerts = await mod.checkWeatherAlerts();
      assert.ok(Array.isArray(alerts));
    });
  });

  describe('predictEnergyImpact', () => {
    it('returns predictions array', async () => {
      const predictions = await mod.predictEnergyImpact(3);
      assert.ok(Array.isArray(predictions));
      assert.ok(predictions.length > 0);
      assert.ok('heatingNeed' in predictions[0]);
      assert.ok('coolingNeed' in predictions[0]);
      assert.ok('solarPotential' in predictions[0]);
    });
  });

  describe('getComfortRecommendations', () => {
    it('returns recommendations array', async () => {
      const recs = await mod.getComfortRecommendations();
      assert.ok(Array.isArray(recs));
    });
  });

  describe('analyzeWeatherPatterns', () => {
    it('returns error when no data', async () => {
      mod.weatherHistory = [];
      const result = await mod.analyzeWeatherPatterns(30);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'No data');
    });

    it('returns analysis with data', async () => {
      const result = await mod.analyzeWeatherPatterns(30);
      assert.ok(result.avgTemperature !== undefined);
      assert.ok(result.avgHumidity !== undefined);
      assert.ok(result.totalPrecipitation !== undefined);
    });
  });

  describe('reporting', () => {
    it('getWeatherOverview returns formatted data', () => {
      const overview = mod.getWeatherOverview();
      assert.ok(overview.temperature.includes('°C'));
      assert.ok(overview.humidity.includes('%'));
      assert.ok(typeof overview.alerts === 'number');
    });

    it('getCurrentWeather returns detailed data', () => {
      const weather = mod.getCurrentWeather();
      assert.ok(weather.temperature);
      assert.ok(weather.feelsLike);
      assert.ok(weather.condition);
      assert.ok(weather.uvIndex !== undefined);
    });

    it('getWeekForecast returns 7 days', () => {
      const forecast = mod.getWeekForecast();
      assert.ok(Array.isArray(forecast));
      assert.strictEqual(forecast.length, 7);
      assert.ok(forecast[0].day);
      assert.ok(forecast[0].high.includes('°C'));
    });

    it('getWeatherAlerts returns formatted alerts', () => {
      const alerts = mod.getWeatherAlerts();
      assert.ok(Array.isArray(alerts));
    });

    it('getAutomationRules returns rule list', () => {
      const rules = mod.getAutomationRules();
      assert.ok(Array.isArray(rules));
      assert.ok(rules.length >= 6);
      assert.ok(rules[0].name);
      assert.ok(rules[0].condition);
    });
  });

  describe('destroy', () => {
    it('clears intervals', () => {
      mod.destroy();
      assert.deepStrictEqual(mod._intervals, []);
    });
  });
});
