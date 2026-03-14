'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const MultiZoneAudioController = require('../multi-zone-audio-controller');

describe('MultiZoneAudioController', () => {
  let mod;

  beforeEach(async () => {
    mod = new MultiZoneAudioController({ emit: () => {} });
    await mod.initialize();
  });

  afterEach(() => {
    mod.destroy();
  });

  describe('initialization', () => {
    it('sets up 7 zones', () => {
      assert.strictEqual(mod.zones.size, 7);
      assert.ok(mod.zones.has('living_room'));
      assert.ok(mod.zones.has('kitchen'));
      assert.ok(mod.zones.has('master_bedroom'));
      assert.ok(mod.zones.has('office'));
    });

    it('zones have correct properties', () => {
      const living = mod.zones.get('living_room');
      assert.strictEqual(living.type, 'stereo');
      assert.strictEqual(living.maxVolume, 80);
      assert.strictEqual(living.playing, false);
      assert.strictEqual(living.currentVolume, 0);
    });

    it('sets up audio sources', () => {
      assert.strictEqual(mod.audioSources.size, 5);
      assert.ok(mod.audioSources.has('spotify_premium'));
      assert.ok(mod.audioSources.has('apple_music'));
      assert.ok(mod.audioSources.has('local_library'));
    });

    it('sets up playlists', () => {
      assert.strictEqual(mod.playlists.size, 4);
      assert.ok(mod.playlists.has('spotify_daily_mix'));
      assert.ok(mod.playlists.has('morning_energy'));
      assert.ok(mod.playlists.has('relaxation'));
    });

    it('sets up audio scenes', () => {
      assert.ok(mod.audioScenes.size >= 5);
      assert.ok(mod.audioScenes.has('morning_routine'));
      assert.ok(mod.audioScenes.has('party_mode'));
      assert.ok(mod.audioScenes.has('work_focus'));
    });
  });

  describe('play', () => {
    it('plays track in zone', async () => {
      const result = await mod.play('living_room', 'spotify_premium', 'track_1', 50);
      assert.strictEqual(result.success, true);
      const zone = mod.zones.get('living_room');
      assert.strictEqual(zone.playing, true);
      assert.ok(zone.currentVolume > 0);
    });

    it('clamps volume to maxVolume', async () => {
      await mod.play('living_room', 'spotify_premium', 'track_1', 100);
      const zone = mod.zones.get('living_room');
      assert.ok(zone.currentVolume <= zone.maxVolume);
    });

    it('fails for unknown zone', async () => {
      const result = await mod.play('nonexistent', 'spotify', 'track', 50);
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('pause / stop', () => {
    it('pauses a playing zone', async () => {
      await mod.play('kitchen', 'spotify_premium', 'track_1', 40);
      const result = await mod.pause('kitchen');
      assert.strictEqual(result.success, true);
      assert.strictEqual(mod.zones.get('kitchen').playing, false);
    });

    it('stops a zone and clears track', async () => {
      await mod.play('kitchen', 'spotify_premium', 'track_1', 40);
      const result = await mod.stop('kitchen');
      assert.strictEqual(result.success, true);
      const zone = mod.zones.get('kitchen');
      assert.strictEqual(zone.playing, false);
      assert.strictEqual(zone.track, null);
    });
  });

  describe('setVolume', () => {
    it('sets volume and clamps to max', async () => {
      const result = await mod.setVolume('emma_bedroom', 100);
      assert.strictEqual(result.success, true);
      assert.ok(result.volume <= 50); // maxVolume = 50
    });

    it('clamps to 0 minimum', async () => {
      const result = await mod.setVolume('living_room', -10);
      assert.strictEqual(result.success, true);
      assert.ok(result.volume >= 0);
    });
  });

  describe('nextTrack / previousTrack', () => {
    it('advances to next track when playlist exists', async () => {
      const playlist = mod.playlists.get('spotify_daily_mix');
      await mod.play('living_room', 'spotify_premium', playlist.tracks[0].id, 50);
      mod.zones.get('living_room').playlist = 'spotify_daily_mix';
      const result = await mod.nextTrack('living_room');
      assert.ok(result);
    });

    it('fails for unknown zone', async () => {
      const result = await mod.nextTrack('nonexistent');
      assert.strictEqual(result.success, false);
    });
  });

  describe('groupZones', () => {
    it('groups multiple zones', async () => {
      await mod.play('living_room', 'spotify_premium', 'track_1', 50);
      const result = await mod.groupZones(['living_room', 'kitchen']);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.groupSize, 2);
    });

    it('fails with fewer than 2 zones', async () => {
      const result = await mod.groupZones(['living_room']);
      assert.strictEqual(result.success, false);
    });
  });

  describe('playEverywhere', () => {
    it('plays in all zones', async () => {
      const result = await mod.playEverywhere('spotify_premium', 'track_1', 40);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.zones, mod.zones.size);
      for (const [, zone] of mod.zones) {
        assert.strictEqual(zone.playing, true);
        assert.ok(zone.currentVolume <= zone.maxVolume);
      }
    });
  });

  describe('pauseAll / stopAll', () => {
    it('pauses all zones', async () => {
      await mod.playEverywhere('spotify_premium', 'track_1', 40);
      const result = await mod.pauseAll();
      assert.strictEqual(result.success, true);
      for (const [, zone] of mod.zones) {
        assert.strictEqual(zone.playing, false);
      }
    });

    it('stops all zones', async () => {
      await mod.playEverywhere('spotify_premium', 'track_1', 40);
      const result = await mod.stopAll();
      assert.strictEqual(result.success, true);
    });
  });

  describe('createPlaylist', () => {
    it('creates a new playlist', async () => {
      const result = await mod.createPlaylist('My Faves', 'spotify_premium', ['t1', 't2']);
      assert.strictEqual(result.success, true);
      assert.ok(result.playlistId.startsWith('playlist_'));
    });

    it('fails for unknown source', async () => {
      const result = await mod.createPlaylist('Test', 'nonexistent_source', ['t1']);
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('activateAudioScene', () => {
    it('activates morning routine scene', async () => {
      const result = await mod.activateAudioScene('morning_routine');
      assert.strictEqual(result.success, true);
      assert.ok(result.zones >= 1);
    });

    it('activates party mode', async () => {
      const result = await mod.activateAudioScene('party_mode');
      assert.strictEqual(result.success, true);
    });

    it('fails for unknown scene', async () => {
      const result = await mod.activateAudioScene('nonexistent_scene');
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('autoVolumeAdjust', () => {
    it('adjusts volume based on time', async () => {
      await mod.play('living_room', 'spotify_premium', 'track_1', 60);
      const morning = new Date();
      morning.setHours(7, 0, 0, 0);
      const result = await mod.autoVolumeAdjust('living_room', morning.getTime());
      assert.strictEqual(result.success, true);
    });

    it('returns failure for non-playing zone', async () => {
      const result = await mod.autoVolumeAdjust('living_room', Date.now());
      assert.strictEqual(result.success, false);
    });
  });

  describe('getRecommendedPlaylist', () => {
    it('returns morning playlist in morning', async () => {
      const morning = new Date();
      morning.setHours(8, 0, 0, 0);
      const playlist = await mod.getRecommendedPlaylist({ time: morning.getTime(), mood: 'normal' });
      assert.ok(playlist);
      assert.ok(playlist.tracks);
    });

    it('returns relaxation in evening', async () => {
      const evening = new Date();
      evening.setHours(19, 0, 0, 0);
      const playlist = await mod.getRecommendedPlaylist({ time: evening.getTime(), mood: 'calm' });
      assert.ok(playlist);
    });
  });

  describe('reporting', () => {
    it('getAudioControllerOverview returns stats', () => {
      const overview = mod.getAudioControllerOverview();
      assert.strictEqual(overview.zones, 7);
      assert.strictEqual(overview.sources, 5);
      assert.strictEqual(overview.playlists, 4);
      assert.ok(overview.scenes >= 5);
    });

    it('getZoneStatus returns all zone states', () => {
      const status = mod.getZoneStatus();
      assert.ok(Array.isArray(status));
      assert.strictEqual(status.length, 7);
      assert.ok(status[0].name);
      assert.ok(status[0].status);
    });

    it('getAudioScenes returns scene list', () => {
      const scenes = mod.getAudioScenes();
      assert.ok(Array.isArray(scenes));
      assert.ok(scenes.length >= 5);
      assert.ok(scenes[0].name);
    });

    it('getPlaybackHistory returns array', () => {
      const history = mod.getPlaybackHistory();
      assert.ok(Array.isArray(history));
    });
  });

  describe('destroy', () => {
    it('clears intervals', () => {
      mod.destroy();
      assert.deepStrictEqual(mod._intervals, []);
    });
  });
});
