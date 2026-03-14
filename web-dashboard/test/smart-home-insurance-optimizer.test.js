'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const SmartHomeInsuranceOptimizer = require('../smart-home-insurance-optimizer');

describe('SmartHomeInsuranceOptimizer', () => {
  let optimizer;

  beforeEach(async () => {
    optimizer = new SmartHomeInsuranceOptimizer();
    await optimizer.initialize();
  });

  afterEach(() => {
    if (optimizer && typeof optimizer.destroy === 'function') {
      optimizer.destroy();
    }
  });

  describe('initialization', () => {
    it('should initialize with default policies', () => {
      assert.ok(optimizer.insurancePolicies.size >= 3);
    });

    it('should have home_insurance policy with correct premium', () => {
      const home = optimizer.insurancePolicies.get('home_insurance');
      assert.ok(home);
      assert.strictEqual(home.premium, 3500);
      assert.strictEqual(home.deductible, 1500);
    });

    it('should have electronics_insurance policy', () => {
      const elec = optimizer.insurancePolicies.get('electronics_insurance');
      assert.ok(elec);
      assert.strictEqual(elec.premium, 1200);
    });

    it('should have vehicle_insurance policy', () => {
      const vehicle = optimizer.insurancePolicies.get('vehicle_insurance');
      assert.ok(vehicle);
      assert.strictEqual(vehicle.premium, 5400);
    });

    it('should have risk factors initialized', () => {
      assert.ok(optimizer.riskFactors.size >= 5);
    });

    it('should have safety measures initialized', () => {
      assert.ok(optimizer.safetyMeasures.size >= 6);
    });
  });

  describe('calculateTotalPremiums', () => {
    it('should return annual and monthly premiums', async () => {
      const result = await optimizer.calculateTotalPremiums();
      assert.ok(result);
      assert.ok(typeof result.annual === 'number');
      assert.ok(typeof result.monthly === 'string'); // toFixed(0) returns string
      assert.ok(result.annual > 0);
      assert.ok(Number(result.monthly) > 0);
    });

    it('should have monthly derived from annual / 12', async () => {
      const result = await optimizer.calculateTotalPremiums();
      const expected = (result.annual / 12).toFixed(0);
      assert.strictEqual(result.monthly, expected);
    });

    it('should include policies count', async () => {
      const result = await optimizer.calculateTotalPremiums();
      assert.ok(typeof result.policies === 'number');
      assert.ok(result.policies >= 3);
    });
  });

  describe('calculateOverallRisk', () => {
    it('should return overall risk score and level', async () => {
      const result = await optimizer.calculateOverallRisk();
      assert.ok(result);
      assert.ok(typeof result.overallScore === 'string');
      assert.ok(typeof result.riskLevel === 'string');
      assert.ok(['low', 'medium', 'high'].includes(result.riskLevel));
    });

    it('should include totalFactors count', async () => {
      const result = await optimizer.calculateOverallRisk();
      assert.ok(typeof result.totalFactors === 'number');
      assert.ok(result.totalFactors >= 5);
    });

    it('should include highRisks array', async () => {
      const result = await optimizer.calculateOverallRisk();
      assert.ok(Array.isArray(result.highRisks));
    });
  });

  describe('calculatePotentialDiscounts', () => {
    it('should return discount info', async () => {
      const result = await optimizer.calculatePotentialDiscounts();
      assert.ok(result);
      assert.ok(typeof result.totalDiscount === 'string');
      assert.ok(result.totalDiscount.includes('%'));
    });

    it('should return annual savings string', async () => {
      const result = await optimizer.calculatePotentialDiscounts();
      assert.ok(typeof result.annualSavings === 'string');
      assert.ok(result.annualSavings.includes('SEK'));
    });

    it('should include active discounts list', async () => {
      const result = await optimizer.calculatePotentialDiscounts();
      assert.ok(Array.isArray(result.activeDiscounts));
    });

    it('should cap total discount at 30%', async () => {
      const result = await optimizer.calculatePotentialDiscounts();
      const pct = parseInt(result.totalDiscount);
      assert.ok(pct <= 30, `Expected <=30% but got ${pct}%`);
    });
  });

  describe('fileClaim', () => {
    it('should file a claim on existing policy', async () => {
      const result = await optimizer.fileClaim('home_insurance', {
        type: 'water_damage',
        estimatedAmount: 5000,
        description: 'Pipe burst'
      });
      assert.ok(result.success);
      assert.ok(result.claim);
      assert.ok(result.claim.id);
    });

    it('should fail on non-existent policy', async () => {
      const result = await optimizer.fileClaim('nonexistent', { type: 'test' });
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('updateClaimStatus', () => {
    it('should update claim status to approved', async () => {
      const filed = await optimizer.fileClaim('home_insurance', {
        type: 'fire',
        estimatedAmount: 10000,
        description: 'Kitchen fire'
      });
      const result = await optimizer.updateClaimStatus(filed.claim.id, 'approved', 8000);
      assert.ok(result.success);
    });

    it('should calculate payout with deductible for approved claims', async () => {
      const filed = await optimizer.fileClaim('home_insurance', {
        type: 'fire',
        estimatedAmount: 10000,
        description: 'Fire damage'
      });
      const result = await optimizer.updateClaimStatus(filed.claim.id, 'approved', 8000);
      assert.ok(result.success);
      assert.ok(result.claim);
      assert.ok(result.claim.payoutAmount !== undefined);
    });

    it('should fail on non-existent claim', async () => {
      const result = await optimizer.updateClaimStatus('fake_claim', 'approved', 5000);
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('analyzeCoverage', () => {
    it('should return coverage analysis object', async () => {
      const result = await optimizer.analyzeCoverage();
      assert.ok(result);
      assert.ok(typeof result === 'object');
    });
  });

  describe('generateRecommendations', () => {
    it('should populate recommendations', async () => {
      await optimizer.generateRecommendations();
      assert.ok(Array.isArray(optimizer.recommendations));
    });
  });

  describe('reporting', () => {
    it('should return insurance overview object', () => {
      const overview = optimizer.getInsuranceOverview();
      assert.ok(overview);
      assert.ok(typeof overview === 'object');
      assert.ok(overview.policies !== undefined);
    });

    it('should return policies list as array', () => {
      const result = optimizer.getPoliciesList();
      assert.ok(Array.isArray(result));
      assert.ok(result.length >= 3);
    });

    it('should return risk report as array', () => {
      const result = optimizer.getRiskReport();
      assert.ok(Array.isArray(result));
      assert.ok(result.length >= 5);
    });

    it('should include risk score in report entries', () => {
      const result = optimizer.getRiskReport();
      const first = result[0];
      assert.ok(first.score !== undefined);
      assert.ok(first.risk !== undefined);
    });

    it('should return safety measures as array', () => {
      const result = optimizer.getSafetyMeasures();
      assert.ok(Array.isArray(result));
      assert.ok(result.length >= 6);
    });

    it('should return claim history as array', () => {
      const result = optimizer.getClaimHistory();
      assert.ok(Array.isArray(result));
    });
  });

  describe('startMonitoring', () => {
    it('should start without errors', () => {
      // Already called in initialize, but calling again should not throw
      assert.doesNotThrow(() => optimizer.startMonitoring());
    });
  });

  describe('destroy', () => {
    it('should clean up intervals', () => {
      assert.doesNotThrow(() => optimizer.destroy());
    });

    it('should handle double destroy', () => {
      optimizer.destroy();
      assert.doesNotThrow(() => optimizer.destroy());
    });
  });
});
