'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const SmartMirror = require('../smart-mirror-dashboard');

describe('SmartMirrorDashboard', () => {
  let mirror;

  beforeEach(() => {
    mirror = new SmartMirror({});
  });

  afterEach(() => {
    mirror.destroy();
  });

  // ── Constructor ──
  describe('constructor', () => {
    it('initializes data structures', () => {
      assert.ok(mirror.widgets instanceof Map);
      assert.ok(mirror.layouts instanceof Map);
      assert.equal(mirror.currentUser, null);
      assert.ok(mirror.voiceCommands instanceof Map);
      assert.ok(Array.isArray(mirror._intervals));
    });
  });

  // ── Initialize ──
  describe('initialize', () => {
    it('populates widgets, layouts, and voice commands', async () => {
      await mirror.initialize();
      assert.ok(mirror.widgets.size > 0);
      assert.ok(mirror.layouts.size >= 4);
      assert.ok(mirror.voiceCommands.size > 0);
    });
  });

  // ── showWidget / hideWidget ──
  describe('showWidget / hideWidget', () => {
    it('shows a widget', async () => {
      await mirror.initialize();
      const widgetId = Array.from(mirror.widgets.keys())[0];
      const result = await mirror.showWidget(widgetId);
      assert.equal(result.success, true);
      assert.equal(mirror.widgets.get(widgetId).enabled, true);
    });

    it('hides a widget', async () => {
      await mirror.initialize();
      const widgetId = Array.from(mirror.widgets.keys())[0];
      await mirror.showWidget(widgetId);
      const result = await mirror.hideWidget(widgetId);
      assert.equal(result.success, true);
      assert.equal(mirror.widgets.get(widgetId).enabled, false);
    });

    it('returns error for unknown widget', async () => {
      await mirror.initialize();
      const result = await mirror.showWidget('nonexistent');
      assert.equal(result.success, false);
    });
  });

  // ── updateWidget ──
  describe('updateWidget', () => {
    it('merges data into widget', async () => {
      await mirror.initialize();
      const widgetId = Array.from(mirror.widgets.keys())[0];
      const result = await mirror.updateWidget(widgetId, { customField: 'test' });
      assert.equal(result.success, true);
      assert.equal(mirror.widgets.get(widgetId).data.customField, 'test');
    });

    it('returns error for unknown widget', async () => {
      await mirror.initialize();
      const result = await mirror.updateWidget('nonexistent', {});
      assert.equal(result.success, false);
    });
  });

  // ── activateLayout ──
  describe('activateLayout', () => {
    it('activates a layout and enables its widgets', async () => {
      await mirror.initialize();
      const result = await mirror.activateLayout('morning');
      assert.equal(result.success, true);
      assert.ok(result.activeWidgets > 0);
    });

    it('deactivates widgets not in layout', async () => {
      await mirror.initialize();
      // First activate morning with many widgets
      await mirror.activateLayout('morning');
      // Then switch to minimal with very few
      const result = await mirror.activateLayout('minimal');
      assert.equal(result.success, true);
      const activeCount = Array.from(mirror.widgets.values()).filter(w => w.enabled).length;
      assert.ok(activeCount <= 3); // minimal has just time_date + weather
    });

    it('returns error for unknown layout', async () => {
      await mirror.initialize();
      const result = await mirror.activateLayout('nonexistent');
      assert.equal(result.success, false);
    });
  });

  // ── detectUser ──
  describe('detectUser', () => {
    it('detects a user and sets currentUser', async () => {
      await mirror.initialize();
      const result = await mirror.detectUser({});
      assert.equal(result.success, true);
      assert.ok(result.user);
      assert.equal(mirror.currentUser, result.user);
    });
  });

  // ── loadUserPreferences ──
  describe('loadUserPreferences', () => {
    it('loads preferences for a known user', async () => {
      await mirror.initialize();
      const result = await mirror.loadUserPreferences('anna');
      assert.equal(result.success, true);
    });

    it('returns success for unknown user too', async () => {
      await mirror.initialize();
      const result = await mirror.loadUserPreferences('unknown_user');
      assert.equal(result.success, true);
    });
  });

  // ── processVoiceCommand ──
  describe('processVoiceCommand', () => {
    it('recognizes a Swedish command', async () => {
      await mirror.initialize();
      const result = await mirror.processVoiceCommand('visa kalendern');
      assert.equal(result.success, true);
      assert.equal(result.command, 'show_calendar');
    });

    it('recognizes weather command', async () => {
      await mirror.initialize();
      const result = await mirror.processVoiceCommand('hur är vädret');
      assert.equal(result.success, true);
      assert.equal(result.command, 'show_weather');
    });

    it('returns error for unrecognized command', async () => {
      await mirror.initialize();
      const result = await mirror.processVoiceCommand('random unknown input');
      assert.equal(result.success, false);
    });
  });

  // ── Reporting ──
  describe('reporting', () => {
    it('getMirrorOverview returns widget/layout counts', async () => {
      await mirror.initialize();
      const overview = mirror.getMirrorOverview();
      assert.equal(overview.totalWidgets, mirror.widgets.size);
      assert.equal(typeof overview.activeWidgets, 'number');
      assert.equal(overview.layouts, mirror.layouts.size);
      assert.ok(overview.voiceCommands > 0);
    });

    it('getActiveWidgets returns enabled widgets', async () => {
      await mirror.initialize();
      const active = mirror.getActiveWidgets();
      assert.ok(Array.isArray(active));
      for (const w of active) {
        assert.ok(w.id);
        assert.ok(w.type);
      }
    });

    it('getLayoutsList returns layout info', async () => {
      await mirror.initialize();
      const layouts = mirror.getLayoutsList();
      assert.ok(Array.isArray(layouts));
      assert.ok(layouts.length >= 4);
      assert.ok(layouts[0].name);
      assert.ok(layouts[0].description);
    });
  });

  // ── destroy ──
  describe('destroy', () => {
    it('clears intervals', async () => {
      await mirror.initialize();
      mirror.destroy();
      assert.deepEqual(mirror._intervals, []);
    });
  });
});
