'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const NetworkCybersecurityMonitor = require('../network-cybersecurity-monitor');

describe('NetworkCybersecurityMonitor', () => {
  let monitor;

  beforeEach(async () => {
    monitor = new NetworkCybersecurityMonitor();
    await monitor.initialize();
  });

  afterEach(() => {
    if (monitor && monitor.destroy) monitor.destroy();
  });

  describe('Initialization', () => {
    it('sets up 7 default devices', () => {
      const devices = monitor.getDevicesList();
      assert.strictEqual(devices.length, 7);
    });

    it('sets up 5 default firewall rules', () => {
      const overview = monitor.getSecurityOverview();
      assert.strictEqual(overview.firewallRules, 5);
    });

    it('identifies untrusted devices', () => {
      const overview = monitor.getSecurityOverview();
      assert.ok(typeof overview.untrustedDevices === 'number');
      assert.ok(overview.untrustedDevices >= 1); // guest_phone is untrusted
    });

    it('getSecurityOverview returns all expected fields', () => {
      const overview = monitor.getSecurityOverview();
      assert.ok('devices' in overview);
      assert.ok('activeDevices' in overview);
      assert.ok('untrustedDevices' in overview);
      assert.ok('threats' in overview);
      assert.ok('vulnerabilities' in overview);
      assert.ok('activeAlerts' in overview);
      assert.ok('firewallRules' in overview);
    });
  });

  describe('Device management', () => {
    it('trusts an untrusted device', async () => {
      const result = await monitor.trustDevice('guest_phone');
      assert.strictEqual(result.success, true);
    });

    it('blocks a device', async () => {
      const result = await monitor.blockDevice('guest_phone');
      assert.strictEqual(result.success, true);
    });

    it('getDevicesList returns device objects with expected fields', () => {
      const devices = monitor.getDevicesList();
      assert.ok(Array.isArray(devices));
      const device = devices[0];
      assert.ok('name' in device);
      assert.ok('type' in device);
      assert.ok('ip' in device);
      assert.ok('status' in device);
      assert.ok('trust' in device);
    });
  });

  describe('Network scanning', () => {
    it('scanNetwork returns found and new_devices counts', async () => {
      const result = await monitor.scanNetwork();
      assert.ok(typeof result.found === 'number');
      assert.ok(typeof result.new_devices === 'number');
    });
  });

  describe('Firewall rules', () => {
    it('adds a new firewall rule', async () => {
      const result = await monitor.addFirewallRule({
        name: 'test_rule',
        direction: 'inbound',
        action: 'block',
        ports: [9999]
      });
      assert.strictEqual(result.success, true);
      assert.ok(result.ruleId);
    });

    it('enables a firewall rule', async () => {
      const result = await monitor.enableFirewallRule('block_incoming');
      assert.strictEqual(result.success, true);
    });

    it('disables a firewall rule', async () => {
      const result = await monitor.disableFirewallRule('block_incoming');
      assert.strictEqual(result.success, true);
    });

    it('returns error for non-existent rule', async () => {
      const result = await monitor.enableFirewallRule('rule_nonexistent_xyz');
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('Threat detection', () => {
    it('detectThreats returns an array', async () => {
      const threats = await monitor.detectThreats();
      assert.ok(Array.isArray(threats));
    });

    it('scanVulnerabilities returns an array', async () => {
      const vulns = await monitor.scanVulnerabilities();
      assert.ok(Array.isArray(vulns));
    });

    it('getThreatsSummary has expected structure', () => {
      const summary = monitor.getThreatsSummary();
      assert.ok(typeof summary.total === 'number');
      assert.ok(summary.bySeverity);
      assert.ok(typeof summary.bySeverity.low === 'number');
      assert.ok(typeof summary.bySeverity.medium === 'number');
      assert.ok(typeof summary.bySeverity.high === 'number');
      assert.ok(typeof summary.bySeverity.critical === 'number');
    });
  });

  describe('Security alerts', () => {
    it('creates a security alert', async () => {
      const alert = await monitor.createSecurityAlert('test_alert', {
        source: '192.168.1.99',
        severity: 'medium',
        description: 'Test alert'
      });
      assert.ok(alert);
      assert.ok(alert.id);
      assert.strictEqual(alert.type, 'test_alert');
    });

    it('acknowledges an existing alert', async () => {
      const alert = await monitor.createSecurityAlert('test_ack', {
        source: '10.0.0.1',
        severity: 'low'
      });
      const result = await monitor.acknowledgeAlert(alert.id);
      assert.strictEqual(result.success, true);
    });

    it('returns error when acknowledging non-existent alert', async () => {
      const result = await monitor.acknowledgeAlert('alert_nonexistent_xyz');
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    it('getSecurityAlerts returns formatted alerts', async () => {
      await monitor.createSecurityAlert('test_vis', { severity: 'high' });
      const alerts = monitor.getSecurityAlerts();
      assert.ok(Array.isArray(alerts));
      if (alerts.length > 0) {
        const a = alerts[0];
        assert.ok('time' in a);
        assert.ok('type' in a);
        assert.ok('severity' in a);
        assert.ok('acknowledged' in a);
      }
    });
  });

  describe('Traffic monitoring', () => {
    it('monitorTraffic returns traffic data', async () => {
      const traffic = await monitor.monitorTraffic();
      assert.ok(traffic);
      assert.ok(typeof traffic.totalDownload === 'number');
    });

    it('getTrafficStats returns formatted strings after monitoring', async () => {
      await monitor.monitorTraffic();
      const stats = monitor.getTrafficStats(24);
      // After monitoring, stats should be an object (not error)
      assert.ok(typeof stats === 'object');
      if (stats.totalDownload) {
        assert.ok(typeof stats.totalDownload === 'string');
        assert.ok(typeof stats.totalUpload === 'string');
      }
    });
  });

  describe('Reporting', () => {
    it('getVulnerabilitiesList returns array', () => {
      const vulns = monitor.getVulnerabilitiesList();
      assert.ok(Array.isArray(vulns));
    });

    it('vulnerability entries have expected shape', () => {
      const vulns = monitor.getVulnerabilitiesList();
      if (vulns.length > 0) {
        const v = vulns[0];
        assert.ok('device' in v);
        assert.ok('type' in v);
        assert.ok('severity' in v);
      }
    });
  });

  describe('Cleanup', () => {
    it('destroy clears intervals', () => {
      monitor.destroy();
      assert.deepStrictEqual(monitor._intervals, []);
    });
  });
});
