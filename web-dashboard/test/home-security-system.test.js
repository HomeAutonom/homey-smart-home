'use strict';

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const HomeSecuritySystem = require('../home-security-system');

// Timer tracking wrapper
let originalSetInterval, originalSetTimeout;
let trackedIntervals = [];
let trackedTimeouts = [];

before(() => {
  originalSetInterval = global.setInterval;
  originalSetTimeout = global.setTimeout;
  global.setInterval = (...args) => {
    const id = originalSetInterval(...args);
    trackedIntervals.push(id);
    return id;
  };
  global.setTimeout = (...args) => {
    const id = originalSetTimeout(...args);
    trackedTimeouts.push(id);
    return id;
  };
});

after(() => {
  global.setInterval = originalSetInterval;
  global.setTimeout = originalSetTimeout;
});

afterEach(() => {
  trackedIntervals.forEach(id => clearInterval(id));
  trackedTimeouts.forEach(id => clearTimeout(id));
  trackedIntervals = [];
  trackedTimeouts = [];
});

describe('HomeSecuritySystem', () => {
  let system;

  beforeEach(async () => {
    system = new HomeSecuritySystem();
    await system.initialize();
  });

  afterEach(() => {
    if (system && system.destroy) system.destroy();
  });

  describe('Constructor and Initialization', () => {
    it('initializes with default disarmed mode', () => {
      assert.strictEqual(system.currentMode, 'disarmed');
    });

    it('has zones map populated', () => {
      assert.ok(system.zones instanceof Map);
      assert.ok(system.zones.size > 0);
    });

    it('has sensors map populated', () => {
      assert.ok(system.sensors instanceof Map);
      assert.ok(system.sensors.size > 0);
    });

    it('has cameras map populated', () => {
      assert.ok(system.cameras instanceof Map);
      assert.ok(system.cameras.size > 0);
    });

    it('has modes map populated', () => {
      assert.ok(system.modes instanceof Map);
      assert.ok(system.modes.size >= 5);
    });

    it('has users map populated', () => {
      assert.ok(system.users instanceof Map);
      assert.ok(system.users.size >= 3);
    });

    it('initializes empty events and alerts arrays', () => {
      assert.ok(Array.isArray(system.events));
      assert.ok(Array.isArray(system.alerts));
    });
  });

  describe('Zones', () => {
    it('has expected zone IDs', () => {
      const expectedZones = ['entry', 'living_room', 'kitchen', 'bedroom', 'hallway', 'basement', 'garage', 'garden'];
      for (const zoneId of expectedZones) {
        assert.ok(system.zones.has(zoneId), `Missing zone: ${zoneId}`);
      }
    });

    it('zones have required properties', () => {
      const zone = system.zones.get('entry');
      assert.ok(zone);
      assert.strictEqual(typeof zone.name, 'string');
      assert.strictEqual(typeof zone.armed, 'boolean');
      assert.strictEqual(typeof zone.triggered, 'boolean');
    });

    it('zones start unarmed in disarmed mode', () => {
      for (const [, zone] of system.zones) {
        assert.strictEqual(zone.armed, false);
      }
    });
  });

  describe('Sensors', () => {
    it('has door sensors', () => {
      const doorSensors = Array.from(system.sensors.values()).filter(s => s.type === 'door');
      assert.ok(doorSensors.length >= 4);
    });

    it('has window sensors', () => {
      const windowSensors = Array.from(system.sensors.values()).filter(s => s.type === 'window');
      assert.ok(windowSensors.length >= 5);
    });

    it('has motion sensors', () => {
      const motionSensors = Array.from(system.sensors.values()).filter(s => s.type === 'motion');
      assert.ok(motionSensors.length >= 7);
    });

    it('sensors have battery level 100 initially', () => {
      for (const [, sensor] of system.sensors) {
        assert.strictEqual(sensor.batteryLevel, 100);
      }
    });

    it('sensors start enabled and not triggered', () => {
      for (const [, sensor] of system.sensors) {
        assert.strictEqual(sensor.enabled, true);
        assert.strictEqual(sensor.triggered, false);
      }
    });
  });

  describe('updateSensorState', () => {
    it('updates existing sensor state', async () => {
      const sensorId = Array.from(system.sensors.keys())[0];
      const result = await system.updateSensorState(sensorId, 'detected');
      assert.ok(result.success);
      assert.ok(result.sensor);
    });

    it('returns error for non-existent sensor', async () => {
      const result = await system.updateSensorState('fake_sensor', 'detected');
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('Cameras', () => {
    it('has expected cameras', () => {
      const expectedCameras = ['cam_front', 'cam_back', 'cam_garage', 'doorbell'];
      for (const camId of expectedCameras) {
        assert.ok(system.cameras.has(camId), `Missing camera: ${camId}`);
      }
    });

    it('cameras are online', () => {
      for (const [, camera] of system.cameras) {
        assert.strictEqual(camera.status, 'online');
      }
    });

    it('cameras have recordings array', () => {
      for (const [, camera] of system.cameras) {
        assert.ok(Array.isArray(camera.recordings));
      }
    });
  });

  describe('startRecording', () => {
    it('starts recording on valid camera', async () => {
      const result = await system.startRecording('cam_front', 30);
      assert.ok(result.success);
      assert.ok(result.recording);
      assert.ok(result.recording.id);
    });

    it('returns error for invalid camera', async () => {
      const result = await system.startRecording('fake_cam', 30);
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('stopRecording', () => {
    it('stops an active recording', async () => {
      const startResult = await system.startRecording('cam_front', 30);
      const recordingId = startResult.recording.id;
      const result = await system.stopRecording('cam_front', recordingId);
      assert.ok(result.success);
    });
  });

  describe('detectMotionOnCamera', () => {
    it('detects motion on valid camera', async () => {
      const result = await system.detectMotionOnCamera('cam_front');
      assert.ok(result.success);
    });

    it('returns error for invalid camera', async () => {
      const result = await system.detectMotionOnCamera('fake_cam');
      assert.strictEqual(result.success, false);
    });
  });

  describe('Security Modes', () => {
    it('has 5 security modes', () => {
      assert.ok(system.modes.size >= 5);
    });

    it('default mode is disarmed', () => {
      assert.strictEqual(system.currentMode, 'disarmed');
    });
  });

  describe('setMode', () => {
    it('sets mode to armed_home', async () => {
      const result = await system.setMode('armed_home', 'user_primary');
      assert.ok(result.success);
      assert.strictEqual(system.currentMode, 'armed_home');
    });

    it('sets mode to armed_away with delay', async () => {
      const result = await system.setMode('armed_away', 'user_primary');
      assert.ok(result.success);
    });

    it('sets mode to armed_night', async () => {
      const result = await system.setMode('armed_night', 'user_primary');
      assert.ok(result.success);
    });

    it('sets mode to vacation', async () => {
      const result = await system.setMode('vacation', 'user_primary');
      assert.ok(result.success);
    });

    it('sets mode back to disarmed', async () => {
      await system.setMode('armed_home', 'user_primary');
      const result = await system.setMode('disarmed', 'user_primary');
      assert.ok(result.success);
      assert.strictEqual(system.currentMode, 'disarmed');
    });

    it('returns error for invalid mode', async () => {
      const result = await system.setMode('invalid_mode', 'user_primary');
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('Alarm Management', () => {
    it('triggers an alarm', async () => {
      const alert = await system.triggerAlarm({
        type: 'intrusion',
        severity: 'high',
        sensor: 'door_front',
        sensorName: 'Ytterdörr',
        zone: 'entry'
      });
      assert.ok(alert);
      assert.ok(alert.id);
      assert.strictEqual(alert.severity, 'high');
      assert.strictEqual(alert.status, 'active');
    });

    it('alert is added to alerts array', async () => {
      const initialLength = system.alerts.length;
      await system.triggerAlarm({
        type: 'intrusion',
        severity: 'low',
        sensor: 'motion_hall',
        sensorName: 'Hallrörelse',
        zone: 'hallway'
      });
      assert.strictEqual(system.alerts.length, initialLength + 1);
    });

    it('zone is marked triggered on alarm', async () => {
      await system.triggerAlarm({
        type: 'intrusion',
        severity: 'medium',
        sensor: 'door_front',
        sensorName: 'Ytterdörr',
        zone: 'entry'
      });
      const zone = system.zones.get('entry');
      assert.strictEqual(zone.triggered, true);
    });
  });

  describe('acknowledgeAlert', () => {
    it('acknowledges existing alert', async () => {
      const alert = await system.triggerAlarm({
        type: 'intrusion',
        severity: 'low',
        sensor: 'motion_hall',
        sensorName: 'Hallrörelse',
        zone: 'hallway'
      });
      const result = await system.acknowledgeAlert(alert.id, 'user_primary');
      assert.ok(result.success);
      assert.strictEqual(result.alert.acknowledged, true);
    });

    it('returns error for non-existent alert', async () => {
      const result = await system.acknowledgeAlert('fake_alert', 'user_primary');
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('resolveAlert', () => {
    it('resolves existing alert', async () => {
      const alert = await system.triggerAlarm({
        type: 'intrusion',
        severity: 'low',
        sensor: 'motion_hall',
        sensorName: 'Hallrörelse',
        zone: 'hallway'
      });
      const result = await system.resolveAlert(alert.id, 'False alarm');
      assert.ok(result.success);
      assert.strictEqual(result.alert.status, 'resolved');
      assert.strictEqual(result.alert.resolution, 'False alarm');
    });

    it('clears zone triggered status on resolve', async () => {
      const alert = await system.triggerAlarm({
        type: 'intrusion',
        severity: 'medium',
        sensor: 'door_front',
        sensorName: 'Ytterdörr',
        zone: 'entry'
      });
      await system.resolveAlert(alert.id, 'Resolved');
      const zone = system.zones.get('entry');
      assert.strictEqual(zone.triggered, false);
    });

    it('returns error for non-existent alert', async () => {
      const result = await system.resolveAlert('fake_alert', 'Resolved');
      assert.strictEqual(result.success, false);
    });
  });

  describe('User Management', () => {
    it('has primary admin user', () => {
      const user = system.users.get('user_primary');
      assert.ok(user);
      assert.strictEqual(user.type, 'admin');
    });

    it('has family user', () => {
      const user = system.users.get('user_family');
      assert.ok(user);
      assert.strictEqual(user.type, 'user');
    });

    it('has guest user', () => {
      const user = system.users.get('user_guest');
      assert.ok(user);
      assert.strictEqual(user.type, 'guest');
    });
  });

  describe('authenticateUser', () => {
    it('authenticates with correct admin PIN', async () => {
      const result = await system.authenticateUser('1234');
      assert.ok(result.success);
      assert.ok(result.user);
      assert.strictEqual(result.user.type, 'admin');
    });

    it('authenticates with correct family PIN', async () => {
      const result = await system.authenticateUser('5678');
      assert.ok(result.success);
      assert.ok(result.user);
    });

    it('fails with incorrect PIN', async () => {
      const result = await system.authenticateUser('0000');
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    it('increments totalAccesses on success', async () => {
      const before = system.users.get('user_primary').totalAccesses;
      await system.authenticateUser('1234');
      assert.strictEqual(system.users.get('user_primary').totalAccesses, before + 1);
    });
  });

  describe('Event Logging', () => {
    it('logEvent adds event to events array', () => {
      const initialLength = system.events.length;
      system.logEvent({ type: 'test_event', data: 'test' });
      assert.strictEqual(system.events.length, initialLength + 1);
    });

    it('events have timestamps and IDs', () => {
      system.logEvent({ type: 'test_event' });
      const event = system.events[system.events.length - 1];
      assert.ok(event.id);
      assert.ok(event.timestamp);
    });

    it('keeps max 1000 events', () => {
      for (let i = 0; i < 1050; i++) {
        system.logEvent({ type: 'bulk_test', index: i });
      }
      assert.ok(system.events.length <= 1000);
    });
  });

  describe('getSecurityStatus', () => {
    it('returns status object with mode', () => {
      const status = system.getSecurityStatus();
      assert.strictEqual(status.mode, 'disarmed');
      assert.ok(status.modeName);
    });

    it('counts cameras', () => {
      const status = system.getSecurityStatus();
      assert.strictEqual(typeof status.cameras.total, 'number');
      assert.strictEqual(typeof status.cameras.online, 'number');
    });

    it('counts sensors', () => {
      const status = system.getSecurityStatus();
      assert.strictEqual(typeof status.sensors.total, 'number');
      assert.strictEqual(typeof status.sensors.enabled, 'number');
    });

    it('counts armed zones', () => {
      const status = system.getSecurityStatus();
      assert.strictEqual(typeof status.armedZones, 'number');
      assert.strictEqual(status.armedZones, 0); // disarmed mode
    });
  });

  describe('getZoneStatus', () => {
    it('returns zone with sensors', () => {
      const status = system.getZoneStatus('entry');
      assert.ok(status);
      assert.ok(status.name);
      assert.ok(Array.isArray(status.sensors));
    });

    it('returns null for non-existent zone', () => {
      const status = system.getZoneStatus('fake_zone');
      assert.strictEqual(status, null);
    });
  });

  describe('getRecentEvents', () => {
    it('returns array of events', () => {
      system.logEvent({ type: 'test_event' });
      const events = system.getRecentEvents(10);
      assert.ok(Array.isArray(events));
      assert.ok(events.length > 0);
    });

    it('events have description field', () => {
      system.logEvent({ type: 'sensor_change', sensorName: 'Test', oldState: 'clear', newState: 'detected' });
      const events = system.getRecentEvents(1);
      assert.ok(events[0].description);
    });
  });

  describe('formatEventDescription', () => {
    it('formats sensor_change events', () => {
      const desc = system.formatEventDescription({ type: 'sensor_change', sensorName: 'Door', oldState: 'closed', newState: 'open' });
      assert.ok(desc.includes('Door'));
    });

    it('formats mode_change events', () => {
      const desc = system.formatEventDescription({ type: 'mode_change', mode: 'armed_home' });
      assert.ok(desc.includes('armed_home'));
    });

    it('formats alarm_triggered events', () => {
      const desc = system.formatEventDescription({ type: 'alarm_triggered', sensorName: 'Door', severity: 'high' });
      assert.ok(desc.includes('Door'));
    });

    it('formats unknown event types as JSON', () => {
      const desc = system.formatEventDescription({ type: 'unknown_type', foo: 'bar' });
      assert.strictEqual(typeof desc, 'string');
    });
  });

  describe('getSecurityReport', () => {
    it('returns report with period info', () => {
      const report = system.getSecurityReport(7);
      assert.ok(report);
      assert.strictEqual(report.period, '7 days');
      assert.strictEqual(typeof report.totalEvents, 'number');
      assert.strictEqual(typeof report.totalAlerts, 'number');
    });

    it('contains alertsBySeverity breakdown', () => {
      const report = system.getSecurityReport(7);
      assert.ok(report.alertsBySeverity);
      assert.strictEqual(typeof report.alertsBySeverity.critical, 'number');
      assert.strictEqual(typeof report.alertsBySeverity.high, 'number');
    });

    it('has averageAlertsPerDay', () => {
      const report = system.getSecurityReport(7);
      assert.ok(report.averageAlertsPerDay !== undefined);
    });
  });

  describe('destroy', () => {
    it('clears intervals and timeouts', () => {
      system.destroy();
      assert.deepStrictEqual(system._intervals, []);
      assert.deepStrictEqual(system._timeouts, []);
    });
  });
});
