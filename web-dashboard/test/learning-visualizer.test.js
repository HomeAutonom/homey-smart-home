'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const LearningVisualizer = require('../learning-visualizer');

describe('LearningVisualizer', () => {
  let mod;

  beforeEach(async () => {
    mod = new LearningVisualizer();
    const mockEngine = { predict: () => ({}), getPatterns: () => [] };
    const mockAnalytics = { trackEvent: () => {}, getMetrics: () => ({}) };
    await mod.initialize(mockEngine, mockAnalytics);
  });

  afterEach(() => {
    mod.destroy();
  });

  describe('constructor', () => {
    it('initializes with empty learning data', () => {
      const fresh = new LearningVisualizer();
      assert.ok(fresh.learningData);
      assert.ok(Array.isArray(fresh._intervals));
      fresh.destroy();
    });
  });

  describe('collectLearningData', () => {
    it('populates learningData with all categories', async () => {
      const result = await mod.collectLearningData();
      assert.ok(result.patterns);
      assert.ok(result.predictions);
      assert.ok(result.recommendations);
      assert.ok(result.accuracy);
      assert.ok(result.adaptations);
      assert.ok(result.lastUpdate);
    });
  });

  describe('collectPatternData', () => {
    it('returns pattern categories with detections', async () => {
      const data = await mod.collectPatternData();
      assert.strictEqual(data.temporal.detected, 45);
      assert.strictEqual(data.temporal.confidence, 0.87);
      assert.strictEqual(data.device.detected, 67);
      assert.strictEqual(data.energy.detected, 34);
      assert.strictEqual(data.scene.detected, 28);
    });
  });

  describe('collectPredictionData', () => {
    it('returns accuracy and prediction lists', async () => {
      const data = await mod.collectPredictionData();
      assert.strictEqual(data.accuracy.overall, 0.84);
      assert.strictEqual(data.accuracy.byType.device, 0.87);
      assert.ok(Array.isArray(data.recent));
      assert.ok(Array.isArray(data.upcoming));
      assert.strictEqual(data.recent.length, 3);
      assert.strictEqual(data.upcoming.length, 2);
    });
  });

  describe('collectRecommendationData', () => {
    it('returns recommendation stats', async () => {
      const data = await mod.collectRecommendationData();
      assert.strictEqual(data.generated, 156);
      assert.strictEqual(data.applied, 89);
      assert.strictEqual(data.success_rate, 0.74);
      assert.ok(data.categories.energy);
      assert.ok(data.categories.comfort);
      assert.ok(data.categories.security);
      assert.ok(data.categories.automation);
    });
  });

  describe('collectAccuracyData', () => {
    it('returns history array with trend', async () => {
      const data = await mod.collectAccuracyData();
      assert.ok(Array.isArray(data.history));
      assert.strictEqual(data.history.length, 31);
      assert.ok(['improving', 'declining', 'stable'].includes(data.trend));
    });
  });

  describe('collectAdaptationData', () => {
    it('returns adaptation counts and categories', async () => {
      const data = await mod.collectAdaptationData();
      assert.strictEqual(data.total_adaptations, 234);
      assert.strictEqual(data.last_7_days, 45);
      assert.ok(data.categories.pattern_update);
      assert.ok(Array.isArray(data.recent));
    });
  });

  describe('getPatternVisualization', () => {
    it('returns chart data for pattern types', async () => {
      await mod.collectLearningData();
      const viz = await mod.getPatternVisualization();
      assert.strictEqual(viz.temporal.chartType, 'timeline');
      assert.ok(Array.isArray(viz.temporal.data));
      assert.strictEqual(viz.device.chartType, 'bar');
      assert.ok(Array.isArray(viz.device.data));
      assert.strictEqual(viz.energy.chartType, 'line');
    });
  });

  describe('getAccuracyTrends', () => {
    it('returns multi-line chart datasets', async () => {
      await mod.collectLearningData();
      const trends = await mod.getAccuracyTrends();
      assert.strictEqual(trends.chartType, 'multi-line');
      assert.ok(Array.isArray(trends.datasets));
      assert.strictEqual(trends.datasets.length, 4);
    });
  });

  describe('getPredictionHeatmap', () => {
    it('returns 7-day x 24-hour heatmap', async () => {
      await mod.collectLearningData();
      const heatmap = await mod.getPredictionHeatmap();
      assert.strictEqual(heatmap.chartType, 'heatmap');
      assert.ok(Array.isArray(heatmap.data));
      assert.strictEqual(heatmap.data.length, 7);
      assert.strictEqual(heatmap.data[0].hours.length, 24);
    });
  });

  describe('getLearningProgress', () => {
    it('returns 90-day progress datasets', async () => {
      await mod.collectLearningData();
      const progress = await mod.getLearningProgress();
      assert.strictEqual(progress.chartType, 'area');
      assert.ok(Array.isArray(progress.datasets));
      assert.strictEqual(progress.datasets.length, 2);
      assert.strictEqual(progress.datasets[0].data.length, 91);
    });
  });

  describe('getRecommendationImpact', () => {
    it('returns pie chart data from categories', async () => {
      await mod.collectLearningData();
      const impact = await mod.getRecommendationImpact();
      assert.strictEqual(impact.chartType, 'pie');
      assert.ok(Array.isArray(impact.data));
      assert.strictEqual(impact.data.length, 4);
      assert.strictEqual(impact.data[0].category, 'Energi');
    });
  });

  describe('getLearningInsights', () => {
    it('returns array of insight objects', async () => {
      await mod.collectLearningData();
      const insights = await mod.getLearningInsights();
      assert.ok(Array.isArray(insights));
      for (const insight of insights) {
        assert.ok(insight.type);
        assert.ok(insight.message);
        assert.ok(insight.title);
        assert.ok(insight.icon);
      }
    });
  });

  describe('getModelHealth', () => {
    it('returns health status with score and metrics', async () => {
      await mod.collectLearningData();
      const health = await mod.getModelHealth();
      assert.strictEqual(health.overall, 'healthy');
      assert.ok(typeof health.score === 'number');
      assert.ok(health.metrics);
      assert.ok(health.metrics.accuracy);
      assert.ok(health.metrics.coverage);
      assert.ok(health.metrics.freshness);
    });
  });

  describe('getDashboardData', () => {
    it('returns aggregated dashboard data', async () => {
      await mod.collectLearningData();
      const dashboard = await mod.getDashboardData();
      assert.ok(dashboard.summary);
      assert.ok(typeof dashboard.summary.patterns === 'number');
      assert.ok(dashboard.visualizations);
      assert.ok(Array.isArray(dashboard.insights));
      assert.ok(dashboard.health);
    });
  });

  describe('calculateTrend', () => {
    it('returns improving for ascending data', () => {
      const data = [];
      for (let i = 0; i < 14; i++) {
        data.push({ overall: 0.5 + i * 0.03 });
      }
      const trend = mod.calculateTrend(data);
      assert.strictEqual(trend, 'improving');
    });

    it('returns declining for descending data', () => {
      const data = [];
      for (let i = 0; i < 14; i++) {
        data.push({ overall: 0.9 - i * 0.03 });
      }
      const trend = mod.calculateTrend(data);
      assert.strictEqual(trend, 'declining');
    });

    it('returns stable for flat data', () => {
      const data = [];
      for (let i = 0; i < 14; i++) {
        data.push({ overall: 0.8 });
      }
      const trend = mod.calculateTrend(data);
      assert.strictEqual(trend, 'stable');
    });

    it('returns insufficient_data for too-short data', () => {
      const data = [{ overall: 0.5 }, { overall: 0.6 }, { overall: 0.7 }];
      const trend = mod.calculateTrend(data);
      assert.strictEqual(trend, 'insufficient_data');
    });
  });

  describe('calculateDataFreshness', () => {
    it('returns a number between 0 and 1', () => {
      const freshness = mod.calculateDataFreshness();
      assert.ok(freshness >= 0 && freshness <= 1);
    });
  });

  describe('getDefaultData', () => {
    it('returns empty structure', () => {
      const defaults = mod.getDefaultData();
      assert.ok(defaults);
      assert.ok(typeof defaults === 'object');
    });
  });

  describe('destroy', () => {
    it('clears all intervals', () => {
      mod.destroy();
      assert.strictEqual(mod._intervals.length, 0);
    });
  });
});
