'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const SceneSuggester = require('../scene-suggester');

describe('SceneSuggester', () => {
  let mod;
  const mockApp = {};
  const mockIntelligence = {};

  beforeEach(() => {
    mod = new SceneSuggester(mockApp, mockIntelligence);
  });

  afterEach(() => {
    mod.destroy();
  });

  describe('constructor', () => {
    it('initializes _intervals as empty array', () => {
      assert.ok(Array.isArray(mod._intervals));
      assert.strictEqual(mod._intervals.length, 0);
    });

    it('initializes empty existingScenes map', () => {
      assert.ok(mod.existingScenes instanceof Map);
      assert.strictEqual(mod.existingScenes.size, 0);
    });

    it('initializes empty suggestions array', () => {
      assert.ok(Array.isArray(mod.suggestions));
      assert.strictEqual(mod.suggestions.length, 0);
    });

    it('initializes empty implementedSuggestions set', () => {
      assert.ok(mod.implementedSuggestions instanceof Set);
      assert.strictEqual(mod.implementedSuggestions.size, 0);
    });

    it('initializes empty userFeedback map', () => {
      assert.ok(mod.userFeedback instanceof Map);
      assert.strictEqual(mod.userFeedback.size, 0);
    });
  });

  describe('initialize', () => {
    it('loads existing scenes', async () => {
      await mod.initialize();
      assert.strictEqual(mod.existingScenes.size, 4);
    });

    it('loads scene_morning with correct data', async () => {
      await mod.initialize();
      const morning = mod.existingScenes.get('scene_morning');
      assert.ok(morning);
      assert.strictEqual(morning.name, 'Morgon');
      assert.strictEqual(morning.triggers[0].value, '06:30');
      assert.strictEqual(morning.usage, 156);
    });

    it('loads scene_evening', async () => {
      await mod.initialize();
      const evening = mod.existingScenes.get('scene_evening');
      assert.ok(evening);
      assert.strictEqual(evening.name, 'Kväll');
      assert.strictEqual(evening.triggers[0].value, '20:00');
      assert.strictEqual(evening.usage, 148);
    });

    it('loads scene_movie with manual trigger', async () => {
      await mod.initialize();
      const movie = mod.existingScenes.get('scene_movie');
      assert.ok(movie);
      assert.strictEqual(movie.name, 'Film');
      assert.strictEqual(movie.triggers[0].type, 'manual');
      assert.strictEqual(movie.usage, 45);
    });

    it('loads scene_away', async () => {
      await mod.initialize();
      const away = mod.existingScenes.get('scene_away');
      assert.ok(away);
      assert.strictEqual(away.name, 'Borta');
      assert.strictEqual(away.usage, 67);
    });

    it('starts suggestion engine intervals', async () => {
      await mod.initialize();
      assert.ok(mod._intervals.length > 0);
    });

    it('has suggestions array available', async () => {
      await mod.initialize();
      assert.ok(Array.isArray(mod.suggestions));
    });
  });

  describe('generateSuggestions', () => {
    it('returns array of suggestions', async () => {
      await mod.initialize();
      const result = await mod.generateSuggestions();
      assert.ok(Array.isArray(result));
    });

    it('filters suggestions below confidence 0.6', async () => {
      await mod.initialize();
      const suggestions = await mod.generateSuggestions();
      for (const s of suggestions) {
        assert.ok(s.confidence > 0.6, `confidence ${s.confidence} not > 0.6`);
      }
    });

    it('suggestions have required fields', async () => {
      await mod.initialize();
      const suggestions = await mod.generateSuggestions();
      assert.ok(suggestions.length > 0);
      const s = suggestions[0];
      assert.ok(s.id);
      assert.ok(s.type);
      assert.ok(typeof s.confidence === 'number');
    });
  });

  describe('implementSuggestion', () => {
    it('returns success for valid suggestion', async () => {
      await mod.initialize();
      const suggestions = await mod.generateSuggestions();
      assert.ok(suggestions.length > 0);
      const result = await mod.implementSuggestion(suggestions[0].id);
      assert.strictEqual(result.success, true);
      assert.ok(result.scene);
      assert.ok(result.scene.id);
      assert.ok(result.scene.name);
    });

    it('returns error for non-existent suggestion', async () => {
      await mod.initialize();
      const result = await mod.implementSuggestion('nonexistent_id');
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Suggestion not found');
    });

    it('adds to implementedSuggestions set', async () => {
      await mod.initialize();
      const suggestions = await mod.generateSuggestions();
      assert.ok(suggestions.length > 0);
      await mod.implementSuggestion(suggestions[0].id);
      assert.ok(mod.implementedSuggestions.size > 0);
    });
  });

  describe('rateSuggestion', () => {
    it('returns success when rating a suggestion', async () => {
      await mod.initialize();
      const suggestions = await mod.generateSuggestions();
      assert.ok(suggestions.length > 0);
      const result = await mod.rateSuggestion(suggestions[0].id, 'liked');
      assert.strictEqual(result.success, true);
    });

    it('stores feedback in userFeedback map', async () => {
      await mod.initialize();
      const suggestions = await mod.generateSuggestions();
      await mod.rateSuggestion(suggestions[0].id, 'liked');
      assert.ok(mod.userFeedback.has(suggestions[0].id));
    });

    it('removes suggestion when rated as rejected', async () => {
      await mod.initialize();
      const suggestions = await mod.generateSuggestions();
      const countBefore = mod.suggestions.length;
      const id = suggestions[0].id;
      await mod.rateSuggestion(id, 'rejected');
      assert.ok(mod.suggestions.length < countBefore);
      const found = mod.suggestions.find(s => s.id === id);
      assert.strictEqual(found, undefined);
    });
  });

  describe('customizeSuggestion', () => {
    it('returns success for valid suggestion', async () => {
      await mod.initialize();
      const suggestions = await mod.generateSuggestions();
      assert.ok(suggestions.length > 0);
      const result = await mod.customizeSuggestion(suggestions[0].id, { name: 'Custom Scene' });
      assert.strictEqual(result.success, true);
      assert.ok(result.suggestion);
    });

    it('returns error for non-existent suggestion', async () => {
      await mod.initialize();
      const result = await mod.customizeSuggestion('nonexistent', { name: 'Test' });
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Suggestion not found');
    });
  });

  describe('getSuggestionStats', () => {
    it('returns stats object with required fields', async () => {
      await mod.initialize();
      const stats = mod.getSuggestionStats();
      assert.ok(typeof stats.total_generated === 'number');
      assert.ok(typeof stats.implemented === 'number');
      assert.ok(stats.by_type);
      assert.ok(stats.feedback);
    });

    it('tracks implemented count after implementing', async () => {
      await mod.initialize();
      const suggestions = await mod.generateSuggestions();
      await mod.implementSuggestion(suggestions[0].id);
      const stats = mod.getSuggestionStats();
      assert.ok(stats.implemented > 0);
    });

    it('tracks feedback counts', async () => {
      await mod.initialize();
      const suggestions = await mod.generateSuggestions();
      await mod.rateSuggestion(suggestions[0].id, 'liked');
      const stats = mod.getSuggestionStats();
      assert.strictEqual(stats.feedback.liked, 1);
    });
  });

  describe('getTopSuggestions', () => {
    it('returns limited number of suggestions', async () => {
      await mod.initialize();
      const top = await mod.getTopSuggestions(3);
      assert.ok(Array.isArray(top));
      assert.ok(top.length <= 3);
    });

    it('defaults to 5 suggestions', async () => {
      await mod.initialize();
      const top = await mod.getTopSuggestions();
      assert.ok(top.length <= 5);
    });
  });

  describe('getImplementedScenes', () => {
    it('returns empty array initially', async () => {
      await mod.initialize();
      const scenes = mod.getImplementedScenes();
      assert.ok(Array.isArray(scenes));
      assert.strictEqual(scenes.length, 0);
    });

    it('returns implemented scenes after implementation', async () => {
      await mod.initialize();
      const suggestions = await mod.generateSuggestions();
      await mod.implementSuggestion(suggestions[0].id);
      const scenes = mod.getImplementedScenes();
      assert.ok(scenes.length > 0);
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
