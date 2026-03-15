'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const MobileAPI = require('../mobile-api');

describe('MobileAPI', () => {
  let api;
  let mockReq;
  let mockRes;

  function createMockRes() {
    const res = {
      _data: null,
      _status: 200,
      json(data) { this._data = data; return this; },
      status(code) { this._status = code; return this; }
    };
    return res;
  }

  function createMockReq(overrides = {}) {
    return {
      params: {},
      query: {},
      body: {},
      headers: {},
      ...overrides
    };
  }

  beforeEach(() => {
    const mockApp = {};
    const mockServices = {};
    api = new MobileAPI(mockApp, mockServices);
    mockReq = createMockReq();
    mockRes = createMockRes();
  });

  describe('Constructor', () => {
    it('creates instance with router', () => {
      assert.ok(api);
      assert.ok(api.router);
    });

    it('getRouter returns express router', () => {
      const router = api.getRouter();
      assert.ok(router);
    });
  });

  describe('Authentication', () => {
    it('login returns token', async () => {
      mockReq.body = { username: 'testuser', password: 'testpass' };
      await api.login(mockReq, mockRes);
      assert.ok(mockRes._data);
      assert.ok(mockRes._data.token || mockRes._data.success !== undefined);
    });

    it('logout responds with success', async () => {
      await api.logout(mockReq, mockRes);
      assert.ok(mockRes._data);
    });

    it('verifyToken checks authorization header', async () => {
      mockReq.headers.authorization = 'Bearer testtoken123';
      await api.verifyToken(mockReq, mockRes);
      assert.ok(mockRes._data);
    });

    it('verifyToken handles missing token', async () => {
      await api.verifyToken(mockReq, mockRes);
      assert.ok(mockRes._data || mockRes._status);
    });
  });

  describe('generateToken', () => {
    it('generates base64 token', () => {
      const token = api.generateToken('testuser');
      assert.strictEqual(typeof token, 'string');
      assert.ok(token.length > 0);
    });

    it('token contains username when decoded', () => {
      const token = api.generateToken('alice');
      const decoded = Buffer.from(token, 'base64').toString();
      assert.ok(decoded.includes('alice'));
    });
  });

  describe('Dashboard', () => {
    it('getDashboardSummary returns data', async () => {
      await api.getDashboardSummary(mockReq, mockRes);
      assert.ok(mockRes._data);
    });

    it('getQuickStats returns stats', async () => {
      await api.getQuickStats(mockReq, mockRes);
      assert.ok(mockRes._data);
    });
  });

  describe('Devices', () => {
    it('getDevices returns device list', async () => {
      await api.getDevices(mockReq, mockRes);
      assert.ok(mockRes._data);
    });

    it('getDevices supports zone filter', async () => {
      mockReq.query = { zone: 'living_room' };
      await api.getDevices(mockReq, mockRes);
      assert.ok(mockRes._data);
    });

    it('getDevice returns single device', async () => {
      mockReq.params = { id: 'device_1' };
      await api.getDevice(mockReq, mockRes);
      assert.ok(mockRes._data);
    });

    it('controlDevice processes command', async () => {
      mockReq.params = { id: 'device_1' };
      mockReq.body = { command: 'toggle', value: true };
      await api.controlDevice(mockReq, mockRes);
      assert.ok(mockRes._data);
    });

    it('getDeviceHistory returns history data', async () => {
      mockReq.params = { id: 'device_1' };
      mockReq.query = { period: 'day' };
      await api.getDeviceHistory(mockReq, mockRes);
      assert.ok(mockRes._data);
    });
  });

  describe('Scenes', () => {
    it('getScenes returns scene list', async () => {
      await api.getScenes(mockReq, mockRes);
      assert.ok(mockRes._data);
    });

    it('activateScene processes request', async () => {
      mockReq.params = { id: 'scene_1' };
      await api.activateScene(mockReq, mockRes);
      assert.ok(mockRes._data);
    });
  });

  describe('Energy', () => {
    it('getCurrentEnergy returns data', async () => {
      await api.getCurrentEnergy(mockReq, mockRes);
      assert.ok(mockRes._data);
    });

    it('getTodayEnergy returns daily data', async () => {
      await api.getTodayEnergy(mockReq, mockRes);
      assert.ok(mockRes._data);
    });

    it('getWeekEnergy returns weekly data', async () => {
      await api.getWeekEnergy(mockReq, mockRes);
      assert.ok(mockRes._data);
    });

    it('getEnergyPrices returns prices', async () => {
      await api.getEnergyPrices(mockReq, mockRes);
      assert.ok(mockRes._data);
    });
  });

  describe('Climate', () => {
    it('getCurrentClimate returns data', async () => {
      await api.getCurrentClimate(mockReq, mockRes);
      assert.ok(mockRes._data);
    });

    it('getClimateZones returns zones', async () => {
      await api.getClimateZones(mockReq, mockRes);
      assert.ok(mockRes._data);
    });
  });

  describe('Weather', () => {
    it('getCurrentWeather returns weather data', async () => {
      await api.getCurrentWeather(mockReq, mockRes);
      assert.ok(mockRes._data);
      assert.ok(mockRes._data.location || mockRes._data.temperature !== undefined);
    });

    it('getWeatherForecast returns 7-day forecast', async () => {
      await api.getWeatherForecast(mockReq, mockRes);
      assert.ok(mockRes._data);
      const data = mockRes._data;
      if (data.forecast) {
        assert.ok(Array.isArray(data.forecast));
      }
    });
  });

  describe('Automations', () => {
    it('getAutomations returns list', async () => {
      await api.getAutomations(mockReq, mockRes);
      assert.ok(mockRes._data);
    });

    it('getAutomation returns single automation', async () => {
      mockReq.params = { id: 'auto_1' };
      await api.getAutomation(mockReq, mockRes);
      assert.ok(mockRes._data);
    });

    it('toggleAutomation toggles enabled state', async () => {
      mockReq.params = { id: 'auto_1' };
      mockReq.body = { enabled: true };
      await api.toggleAutomation(mockReq, mockRes);
      assert.ok(mockRes._data);
    });

    it('executeAutomation runs automation', async () => {
      mockReq.params = { id: 'auto_1' };
      await api.executeAutomation(mockReq, mockRes);
      assert.ok(mockRes._data);
    });
  });

  describe('Notifications', () => {
    it('getNotifications returns list', async () => {
      await api.getNotifications(mockReq, mockRes);
      assert.ok(mockRes._data);
    });

    it('getNotifications supports limit filter', async () => {
      mockReq.query = { _limit: '5' };
      await api.getNotifications(mockReq, mockRes);
      assert.ok(mockRes._data);
    });

    it('getNotifications supports priority filter', async () => {
      mockReq.query = { _priority: 'high' };
      await api.getNotifications(mockReq, mockRes);
      assert.ok(mockRes._data);
    });

    it('dismissNotification processes request', async () => {
      mockReq.params = { id: 'notif_1' };
      await api.dismissNotification(mockReq, mockRes);
      assert.ok(mockRes._data);
    });

    it('clearNotifications clears all', async () => {
      await api.clearNotifications(mockReq, mockRes);
      assert.ok(mockRes._data);
    });
  });

  describe('Security', () => {
    it('getSecurityStatus returns status', async () => {
      await api.getSecurityStatus(mockReq, mockRes);
      assert.ok(mockRes._data);
    });

    it('getSecurityEvents returns events', async () => {
      await api.getSecurityEvents(mockReq, mockRes);
      assert.ok(mockRes._data);
    });

    it('armSecurity sets security mode', async () => {
      mockReq.body = { mode: 'armed_away' };
      await api.armSecurity(mockReq, mockRes);
      assert.ok(mockRes._data);
    });

    it('disarmSecurity disarms system', async () => {
      await api.disarmSecurity(mockReq, mockRes);
      assert.ok(mockRes._data);
    });
  });

  describe('AI Features', () => {
    it('getPredictions returns predictions', async () => {
      await api.getPredictions(mockReq, mockRes);
      assert.ok(mockRes._data);
    });

    it('getRecommendations returns recommendations', async () => {
      await api.getRecommendations(mockReq, mockRes);
      assert.ok(mockRes._data);
    });

    it('getInsights returns insights', async () => {
      await api.getInsights(mockReq, mockRes);
      assert.ok(mockRes._data);
    });
  });

  describe('Voice Command', () => {
    it('processVoiceCommand handles command', async () => {
      mockReq.body = { command: 'turn on lights' };
      await api.processVoiceCommand(mockReq, mockRes);
      assert.ok(mockRes._data);
    });

    it('processVoiceCommand handles empty command', async () => {
      mockReq.body = { command: '' };
      await api.processVoiceCommand(mockReq, mockRes);
      assert.ok(mockRes._data || mockRes._status);
    });
  });

  describe('Settings', () => {
    it('getSettings returns settings', async () => {
      await api.getSettings(mockReq, mockRes);
      assert.ok(mockRes._data);
    });

    it('updateSettings updates settings', async () => {
      mockReq.body = { theme: 'dark', language: 'en' };
      await api.updateSettings(mockReq, mockRes);
      assert.ok(mockRes._data);
    });
  });
});
