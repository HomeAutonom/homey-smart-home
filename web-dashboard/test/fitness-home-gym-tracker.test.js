'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const FitnessHomeGymTracker = require('../fitness-home-gym-tracker');

describe('FitnessHomeGymTracker', () => {
  let mod;

  beforeEach(async () => {
    mod = new FitnessHomeGymTracker({ emit: () => {} });
    await mod.initialize();
  });

  afterEach(() => {
    mod.destroy();
  });

  describe('constructor and initialize', () => {
    it('sets up users', () => {
      assert.ok(mod.users instanceof Map);
      assert.ok(mod.users.has('user_anna'));
      assert.ok(mod.users.has('user_erik'));
    });

    it('sets up 7 equipment items', () => {
      assert.ok(mod.equipment instanceof Map);
      assert.strictEqual(mod.equipment.size, 7);
    });

    it('sets up 14 exercises', () => {
      assert.ok(mod.exercises instanceof Map);
      assert.strictEqual(mod.exercises.size, 14);
    });

    it('anna has cardio preference', () => {
      const anna = mod.users.get('user_anna');
      assert.strictEqual(anna.preferences.workoutType, 'cardio');
    });

    it('erik has strength preference', () => {
      const erik = mod.users.get('user_erik');
      assert.strictEqual(erik.preferences.workoutType, 'strength');
    });
  });

  describe('useEquipment and releaseEquipment', () => {
    it('marks equipment as in use', async () => {
      const result = await mod.useEquipment('equipment_treadmill', 'user_anna');
      assert.strictEqual(result.success, true);
      assert.strictEqual(mod.equipment.get('equipment_treadmill').inUse, true);
    });

    it('rejects if equipment already in use', async () => {
      await mod.useEquipment('equipment_treadmill', 'user_anna');
      const result = await mod.useEquipment('equipment_treadmill', 'user_erik');
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    it('returns error for unknown equipment', async () => {
      const result = await mod.useEquipment('nonexistent', 'user_anna');
      assert.strictEqual(result.success, false);
      assert.ok(result.error);
    });

    it('releases equipment', async () => {
      await mod.useEquipment('equipment_treadmill', 'user_anna');
      const result = await mod.releaseEquipment('equipment_treadmill');
      assert.strictEqual(result.success, true);
      assert.strictEqual(mod.equipment.get('equipment_treadmill').inUse, false);
    });
  });

  describe('startWorkout and endWorkout', () => {
    it('starts a cardio workout', async () => {
      const result = await mod.startWorkout('user_anna', 'cardio');
      assert.strictEqual(result.success, true);
      assert.ok(result.workoutId);
    });

    it('starts a strength workout', async () => {
      const result = await mod.startWorkout('user_erik', 'strength');
      assert.strictEqual(result.success, true);
    });

    it('ends a workout with stats', async () => {
      const { workoutId } = await mod.startWorkout('user_anna', 'cardio');
      const result = await mod.endWorkout(workoutId);
      assert.strictEqual(result.success, true);
      assert.ok(result.workout);
      assert.ok(typeof result.workout.duration === 'number');
    });

    it('increments user total workouts', async () => {
      const anna = mod.users.get('user_anna');
      const before = anna.stats.totalWorkouts;
      const { workoutId } = await mod.startWorkout('user_anna', 'cardio');
      await mod.endWorkout(workoutId);
      assert.strictEqual(anna.stats.totalWorkouts, before + 1);
    });
  });

  describe('logExercise', () => {
    it('logs a cardio exercise with calorie calculation', async () => {
      const { workoutId } = await mod.startWorkout('user_anna', 'cardio');
      const result = await mod.logExercise(workoutId, 'ex_run', { duration: 30 });
      assert.strictEqual(result.success, true);
      assert.ok(typeof result.calories === 'number');
      assert.ok(result.calories > 0);
    });

    it('logs a strength exercise with calorie calculation', async () => {
      const { workoutId } = await mod.startWorkout('user_erik', 'strength');
      const result = await mod.logExercise(workoutId, 'ex_squat', { sets: 3, reps: 10, weight: 80 });
      assert.strictEqual(result.success, true);
      assert.ok(typeof result.calories === 'number');
      assert.ok(result.calories > 0);
    });

    it('returns failure for unknown workout', async () => {
      const result = await mod.logExercise('nonexistent', 'ex_run', { duration: 30 });
      assert.strictEqual(result.success, false);
    });
  });

  describe('trackHeartRate', () => {
    it('tracks heart rate and returns zone', async () => {
      const { workoutId } = await mod.startWorkout('user_anna', 'cardio');
      const result = await mod.trackHeartRate(workoutId, 130);
      assert.strictEqual(result.success, true);
      assert.ok(result.zone);
      assert.strictEqual(result.zone.zone, 3);
      assert.strictEqual(result.zone.name, 'Moderate');
    });

    it('returns failure for unknown workout', async () => {
      const result = await mod.trackHeartRate('nonexistent', 130);
      assert.strictEqual(result.success, false);
    });
  });

  describe('getHeartRateZone', () => {
    it('returns zone 1 for very light', () => {
      const zone = mod.getHeartRateZone(80);
      assert.strictEqual(zone.zone, 1);
      assert.strictEqual(zone.name, 'Very Light');
    });

    it('returns zone 2 for light', () => {
      const zone = mod.getHeartRateZone(110);
      assert.strictEqual(zone.zone, 2);
      assert.strictEqual(zone.name, 'Light');
    });

    it('returns zone 3 for moderate', () => {
      const zone = mod.getHeartRateZone(130);
      assert.strictEqual(zone.zone, 3);
    });

    it('returns zone 4 for hard', () => {
      const zone = mod.getHeartRateZone(150);
      assert.strictEqual(zone.zone, 4);
    });

    it('returns zone 5 for maximum', () => {
      const zone = mod.getHeartRateZone(170);
      assert.strictEqual(zone.zone, 5);
      assert.strictEqual(zone.name, 'Maximum');
    });
  });

  describe('getWorkoutProgram', () => {
    it('returns beginner cardio program', () => {
      const program = mod.getWorkoutProgram('cardio', 'beginner');
      assert.ok(Array.isArray(program));
      assert.ok(program.length > 0);
    });

    it('returns intermediate strength program', () => {
      const program = mod.getWorkoutProgram('strength', 'intermediate');
      assert.ok(Array.isArray(program));
      assert.ok(program.length > 0);
    });

    it('returns default for unknown combo', () => {
      const program = mod.getWorkoutProgram('yoga', 'expert');
      assert.ok(Array.isArray(program));
    });
  });

  describe('suggestWorkout', () => {
    it('suggests workout for user', async () => {
      const result = await mod.suggestWorkout('user_anna');
      assert.strictEqual(result.success, true);
      assert.ok(result.type);
      assert.ok(result.duration);
    });

    it('returns failure for unknown user', async () => {
      const result = await mod.suggestWorkout('nonexistent');
      assert.strictEqual(result.success, false);
    });

    it('suggests alternating type after cardio', async () => {
      const { workoutId } = await mod.startWorkout('user_anna', 'cardio');
      await mod.endWorkout(workoutId);
      const suggestion = await mod.suggestWorkout('user_anna');
      assert.strictEqual(suggestion.type, 'strength');
    });
  });

  describe('reporting', () => {
    it('returns fitness overview', () => {
      const overview = mod.getFitnessOverview();
      assert.strictEqual(overview.users, 2);
      assert.strictEqual(overview.equipment, 7);
      assert.ok(typeof overview.totalWorkouts === 'number');
      assert.ok(typeof overview.activeWorkouts === 'number');
    });

    it('returns user stats', () => {
      const stats = mod.getUserStats('user_anna');
      assert.ok(stats);
      assert.strictEqual(stats.name, 'Anna');
      assert.ok(typeof stats.workouts === 'number');
    });

    it('returns null for unknown user stats', () => {
      const stats = mod.getUserStats('nonexistent');
      assert.strictEqual(stats, null);
    });

    it('returns equipment status', () => {
      const status = mod.getEquipmentStatus();
      assert.ok(Array.isArray(status));
      assert.strictEqual(status.length, 7);
      assert.ok(status[0].name);
      assert.ok(status[0].type);
    });

    it('returns recent workouts', async () => {
      const { workoutId } = await mod.startWorkout('user_anna', 'cardio');
      await mod.endWorkout(workoutId);
      const recent = mod.getRecentWorkouts('user_anna');
      assert.ok(Array.isArray(recent));
      assert.ok(recent.length > 0);
    });
  });

  describe('destroy', () => {
    it('clears intervals', () => {
      mod.destroy();
      assert.strictEqual(mod._intervals.length, 0);
    });
  });
});
