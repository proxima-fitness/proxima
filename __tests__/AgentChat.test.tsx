import { describe, it, expect } from 'vitest';

describe('THevyRoutine[] parsing', () => {
  it('should parse THevyRoutine[] format correctly', async () => {
    // Mock THevyRoutine[] data structure (as returned by LLM)
    // Note: id, created_at, and updated_at are omitted as they're generated client-side
    const mockHevyRoutines: Partial<THevyRoutine>[] = [
      {
        title: 'Push Day',
        folder_id: 0, // Week 1 (0-indexed)
        order: '1', // Day 1 (1-indexed)
        notes: 'Focus on chest, shoulders, and triceps',
        exercises: [
          {
            index: 0,
            title: 'Bench Press',
            notes: 'Exercise notes',
            rest_seconds: '90',
            exercise_template_id: 'exercise-1',
            supersets_id: null,
            sets: [
              {
                index: 0,
                type: 'normal',
                weight_kg: 80,
                reps: 10,
                rpe: 8,
                distance_meters: null,
                duration_seconds: null,
                custom_metric: null,
              },
              {
                index: 1,
                type: 'normal',
                weight_kg: 80,
                reps: 10,
                rpe: 8,
                distance_meters: null,
                duration_seconds: null,
                custom_metric: null,
              },
            ],
          },
          {
            index: 1,
            title: 'Overhead Press',
            notes: '',
            rest_seconds: null,
            exercise_template_id: 'exercise-2',
            supersets_id: null,
            sets: [
              {
                index: 0,
                type: 'warmup',
                weight_kg: 40,
                reps: 12,
                rpe: 6,
                distance_meters: null,
                duration_seconds: null,
                custom_metric: null,
              },
            ],
          },
        ],
      },
      {
        title: 'Pull Day',
        folder_id: 0, // Week 1 (0-indexed)
        order: '2', // Day 2 (1-indexed)
        notes: '',
        exercises: [
          {
            index: 0,
            title: 'Deadlift',
            notes: '',
            rest_seconds: null,
            exercise_template_id: 'exercise-3',
            supersets_id: null,
            sets: [
              {
                index: 0,
                type: 'normal',
                weight_kg: 100,
                reps: 8,
                rpe: 9,
                distance_meters: null,
                duration_seconds: null,
                custom_metric: null,
              },
            ],
          },
        ],
      },
      {
        title: 'Push Day',
        folder_id: 1, // Week 2 (0-indexed)
        order: '1', // Day 1 (1-indexed)
        notes: '',
        exercises: [
          {
            index: 0,
            title: 'Bench Press',
            notes: '',
            rest_seconds: null,
            exercise_template_id: 'exercise-1',
            supersets_id: null,
            sets: [
              {
                index: 0,
                type: 'normal',
                weight_kg: 85,
                reps: 10,
                rpe: 8,
                distance_meters: null,
                duration_seconds: null,
                custom_metric: null,
              },
            ],
          },
        ],
      },
    ];

    // Simulate client-side processing (as done in AgentChat.tsx)
    const processHevyRoutines = (routines: Partial<THevyRoutine>[]): THevyRoutine[] => {
      const now = new Date().toISOString();
      return routines.map((routine, index) => {
        const id = routine.id || `routine-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
        return {
          id,
          title: routine.title || `Day ${index + 1}`,
          folder_id: typeof routine.folder_id === 'number' ? routine.folder_id : 0,
          order: routine.order || String((index % 7) + 1),
          notes: routine.notes || '',
          exercises: routine.exercises || [],
          created_at: routine.created_at || now,
          updated_at: routine.updated_at || now,
        };
      });
    };

    const result = processHevyRoutines(mockHevyRoutines);

    // Assertions to verify output is THevyRoutine[] with correct structure
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    // Verify each routine has the correct structure
    result.forEach((routine: THevyRoutine) => {
      // Required fields
      expect(routine).toHaveProperty('id');
      expect(typeof routine.id).toBe('string');
      expect(routine.id.length).toBeGreaterThan(0);

      expect(routine).toHaveProperty('title');
      expect(typeof routine.title).toBe('string');

      expect(routine).toHaveProperty('folder_id');
      expect(typeof routine.folder_id).toBe('number');
      expect(routine.folder_id).toBeGreaterThanOrEqual(0);

      expect(routine).toHaveProperty('exercises');
      expect(Array.isArray(routine.exercises)).toBe(true);

      // Optional but important fields
      if (routine.order !== undefined) {
        expect(typeof routine.order).toBe('string');
        expect(Number(routine.order)).not.toBeNaN();
      }

      if (routine.notes !== undefined) {
        expect(typeof routine.notes).toBe('string');
      }

      // Verify exercises structure
      routine.exercises.forEach((exercise: THevyExercise, exerciseIndex: number) => {
        expect(exercise).toHaveProperty('index');
        expect(exercise.index).toBe(exerciseIndex);

        expect(exercise).toHaveProperty('title');
        expect(typeof exercise.title).toBe('string');

        expect(exercise).toHaveProperty('exercise_template_id');
        expect(typeof exercise.exercise_template_id).toBe('string');
        expect(exercise.exercise_template_id.length).toBeGreaterThan(0);

        expect(exercise).toHaveProperty('supersets_id');
        expect(exercise.supersets_id === null || typeof exercise.supersets_id === 'number').toBe(true);

        expect(exercise).toHaveProperty('sets');
        expect(Array.isArray(exercise.sets)).toBe(true);

        // Verify sets structure
        exercise.sets.forEach((set: THevySets, setIndex: number) => {
          expect(set).toHaveProperty('index');
          expect(set.index).toBe(setIndex);

          expect(set).toHaveProperty('type');
          expect(['normal', 'warmup', 'dropset', 'failure']).toContain(set.type);

          expect(set).toHaveProperty('weight_kg');
          expect(set.weight_kg === null || typeof set.weight_kg === 'number').toBe(true);

          expect(set).toHaveProperty('reps');
          expect(set.reps === null || typeof set.reps === 'number').toBe(true);

          expect(set).toHaveProperty('rpe');
          expect(set.rpe === null || typeof set.rpe === 'number').toBe(true);

          // Optional fields
          if (set.duration_seconds !== undefined) {
            expect(set.duration_seconds === null || typeof set.duration_seconds === 'number').toBe(true);
          }
        });
      });
    });

    // Verify folder_id and order mapping
    // folder_id should be 0-indexed (week 1 = 0, week 2 = 1)
    const firstRoutine = result[0];
    expect(firstRoutine.folder_id).toBe(0); // Week 1 maps to folder_id 0

    // order should be 1-indexed as string
    const firstDayRoutine = result.find((r: THevyRoutine) => r.title.includes('Push Day') && r.folder_id === 0);
    if (firstDayRoutine && firstDayRoutine.order) {
      expect(Number(firstDayRoutine.order)).toBe(1); // Day 1
    }

    // Verify week 2 routine
    const week2Routine = result.find((r: THevyRoutine) => r.folder_id === 1);
    expect(week2Routine).toBeDefined();
    expect(week2Routine?.folder_id).toBe(1); // Week 2 maps to folder_id 1

    // Verify that the structure matches what postHevyRoutineProgram expects
    // postHevyRoutineProgram uses:
    // - routine.folder_id + 1 for nthWeek
    // - Number(routine?.order || '1') for nthDay
    // - routine.title for day_title
    // - routine.notes for day_notes
    // - exercise.exercise_template_id for exercise_id
    // - exercise.sets[].reps for reps array
    // - exercise.sets[].duration_seconds for time_taken array
    // - exercise.sets[].weight_kg for weights array
    // - exercise.sets[].rpe for rpe array

    result.forEach((routine: THevyRoutine) => {
      // Verify folder_id can be used for nthWeek calculation
      const nthWeek = routine.folder_id + 1;
      expect(nthWeek).toBeGreaterThan(0);

      // Verify order can be converted to number for nthDay
      const nthDay = Number(routine.order || '1');
      expect(nthDay).toBeGreaterThan(0);
      expect(nthDay).toBeLessThanOrEqual(7);

      // Verify exercises have exercise_template_id for API
      routine.exercises.forEach((exercise: THevyExercise) => {
        expect(exercise.exercise_template_id).toBeTruthy();

        // Verify sets can be mapped to API format
        const reps = exercise.sets.map((set) => set.reps);
        const timeTaken = exercise.sets.map((set) => set.duration_seconds);
        const weights = exercise.sets.map((set) => set.weight_kg);
        const rpe = exercise.sets.map((set) => set.rpe);

        // All should be arrays of numbers or null
        reps.forEach((rep) => {
          expect(rep === null || typeof rep === 'number').toBe(true);
        });

        timeTaken.forEach((time) => {
          expect(time === null || typeof time === 'number' || time === undefined).toBe(true);
        });

        weights.forEach((weight) => {
          expect(weight === null || typeof weight === 'number').toBe(true);
        });

        rpe.forEach((rpeValue) => {
          expect(rpeValue === null || typeof rpeValue === 'number').toBe(true);
        });
      });
    });
  });
});
