'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const SmartMealPlannerRecipeManager = require('../smart-meal-planner-recipe-manager');

describe('SmartMealPlannerRecipeManager', () => {
  let planner;
  const mockApp = { log: () => {}, emit: () => {} };

  beforeEach(async () => {
    planner = new SmartMealPlannerRecipeManager(mockApp);
    await planner.initialize();
  });

  afterEach(() => {
    if (planner && planner.destroy) planner.destroy();
  });

  describe('initialization', () => {
    it('loads recipes', () => {
      assert.ok(planner.recipes instanceof Map);
      assert.strictEqual(planner.recipes.size, 6);
    });

    it('loads dietary profiles', () => {
      assert.ok(planner.dietaryProfiles instanceof Map);
      assert.strictEqual(planner.dietaryProfiles.size, 4);
    });

    it('loads inventory items', () => {
      assert.ok(planner.inventory instanceof Map);
      assert.strictEqual(planner.inventory.size, 5);
    });

    it('sets up nutrition goals', () => {
      assert.ok(planner.nutritionGoals instanceof Map);
      assert.ok(planner.nutritionGoals.has('family_daily'));
    });

    it('generates a weekly plan', () => {
      assert.ok(planner.mealPlans instanceof Map);
      assert.ok(planner.mealPlans.size > 0);
    });
  });

  describe('searchRecipes', () => {
    it('finds recipes by query', async () => {
      const results = await planner.searchRecipes('köttbullar');
      assert.ok(Array.isArray(results));
      assert.ok(results.length > 0);
    });

    it('returns empty array for no match', async () => {
      const results = await planner.searchRecipes('xyznonexistent');
      assert.ok(Array.isArray(results));
      assert.strictEqual(results.length, 0);
    });
  });

  describe('generateWeeklyPlan', () => {
    it('generates a plan with meals', async () => {
      const plan = await planner.generateWeeklyPlan();
      assert.ok(plan.id);
      assert.ok(plan.startDate);
      assert.ok(plan.endDate);
      assert.ok(Array.isArray(plan.meals));
      assert.ok(plan.meals.length > 0);
    });

    it('meal entries have expected properties', async () => {
      const plan = await planner.generateWeeklyPlan();
      const meal = plan.meals[0];
      assert.ok('day' in meal);
      assert.ok('date' in meal);
      assert.ok('recipeId' in meal);
      assert.ok('recipeName' in meal);
      assert.ok('servings' in meal);
    });
  });

  describe('generateShoppingList', () => {
    it('generates list for existing plan', async () => {
      const plan = await planner.generateWeeklyPlan();
      const list = await planner.generateShoppingList(plan.id);
      assert.ok(Array.isArray(list));
      if (list.length > 0) {
        assert.ok('name' in list[0]);
        assert.ok('amount' in list[0]);
        assert.ok('category' in list[0]);
      }
    });

    it('returns error for non-existent plan', async () => {
      const result = await planner.generateShoppingList('fake_plan');
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('categorizeIngredient', () => {
    it('categorizes known ingredients', () => {
      const cat = planner.categorizeIngredient('mjölk');
      assert.strictEqual(typeof cat, 'string');
    });

    it('returns Övrigt for unknown items', () => {
      const cat = planner.categorizeIngredient('unknownxyz');
      assert.strictEqual(cat, 'Övrigt');
    });
  });

  describe('inventory management', () => {
    it('adds to inventory', async () => {
      await planner.addToInventory('smör', 500, 'g');
      assert.ok(planner.inventory.has('smör'));
    });

    it('checks expiring items', async () => {
      const items = await planner.checkExpiringItems();
      assert.ok(Array.isArray(items));
    });
  });

  describe('recommendRecipe', () => {
    it('recommends a recipe for known user', async () => {
      const recipe = await planner.recommendRecipe('anna');
      // Could be null or a recipe object
      assert.ok(recipe === null || typeof recipe === 'object');
    });
  });

  describe('trackMeal', () => {
    it('tracks a meal with valid recipe', async () => {
      const result = await planner.trackMeal('recipe_1', 4);
      assert.strictEqual(result.success, true);
    });

    it('fails for unknown recipe', async () => {
      const result = await planner.trackMeal('fake_recipe', 2);
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('getNutritionSummary', () => {
    it('returns nutrition summary', async () => {
      await planner.trackMeal('recipe_1', 4);
      const summary = await planner.getNutritionSummary(7);
      assert.ok('totalCalories' in summary);
      assert.ok('totalProtein' in summary);
      assert.ok('meals' in summary);
    });
  });

  describe('getMealPlannerOverview', () => {
    it('returns overview object', () => {
      const overview = planner.getMealPlannerOverview();
      assert.ok('recipes' in overview);
      assert.ok('currentPlan' in overview);
      assert.ok('shoppingList' in overview);
      assert.ok('inventory' in overview);
      assert.ok('dietaryProfiles' in overview);
    });
  });

  describe('getCurrentWeekPlan', () => {
    it('returns array of meals', () => {
      const plan = planner.getCurrentWeekPlan();
      assert.ok(Array.isArray(plan));
    });
  });

  describe('getShoppingList', () => {
    it('returns formatted shopping list', () => {
      const list = planner.getShoppingList();
      assert.ok(Array.isArray(list));
    });
  });

  describe('getTopRecipes', () => {
    it('returns top recipes', () => {
      const top = planner.getTopRecipes(3);
      assert.ok(Array.isArray(top));
    });
  });

  describe('getExpiringItems', () => {
    it('returns expiring items', async () => {
      const items = await planner.getExpiringItems();
      assert.ok(Array.isArray(items));
    });
  });

  describe('destroy', () => {
    it('clears intervals', () => {
      planner.destroy();
      assert.deepStrictEqual(planner._intervals, []);
    });
  });
});
