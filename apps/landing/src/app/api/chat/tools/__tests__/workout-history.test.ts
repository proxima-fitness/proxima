import { describe, it, expect } from 'vitest';

import { backedUpWorkoutFixture } from '@/api/__tests__/manual/backed-up-workout.fixture';
import {
    AGENT_WORKOUT_HISTORY_MAX,
    clampWorkoutHistoryLimit,
    formatWorkoutHistoryForModel,
    workoutHistoryForModel,
} from '../workout-history';

describe('workout-history tool helpers', () => {
    describe('clampWorkoutHistoryLimit', () => {
        it('caps at AGENT_WORKOUT_HISTORY_MAX', () => {
            expect(clampWorkoutHistoryLimit(100)).toBe(AGENT_WORKOUT_HISTORY_MAX);
            expect(clampWorkoutHistoryLimit(30)).toBe(30);
        });

        it('floors invalid values to 1', () => {
            expect(clampWorkoutHistoryLimit(0)).toBe(1);
            expect(clampWorkoutHistoryLimit(-5)).toBe(1);
        });
    });

    describe('workoutHistoryForModel', () => {
        it('includes all sets, canonical IDs, notes, and superset_id', () => {
            const payload = workoutHistoryForModel([backedUpWorkoutFixture]);
            const bench = payload[0].exercises.find((e) => e.title.includes('Bench'));
            const ohp = payload[0].exercises.find((e) => e.title.includes('Overhead'));

            expect(payload[0].title).toBe('Upper Power');
            expect(payload[0].description).toBe('Heavy singles focus');
            expect(bench?.canonical_exercise_id).toBeTruthy();
            expect(bench?.superset_id).toBe(0);
            expect(bench?.sets).toHaveLength(2);
            expect(bench?.sets[0]).toMatchObject({ set_type: 'warmup', weight_kg: 60, reps: 10 });
            expect(bench?.sets[1]).toMatchObject({ set_type: 'normal', weight_kg: 100, reps: 5, rpe: 8 });

            expect(ohp?.notes).toBe('felt heavy');
            expect(ohp?.sets[0]).toMatchObject({
                weight_kg: 55,
                reps: 8,
                rpe: 7.5,
                rep_range: { start: 6, end: 8 },
            });
        });
    });

    describe('formatWorkoutHistoryForModel', () => {
        it('returns structured JSON with all set data for the agent', () => {
            const text = formatWorkoutHistoryForModel({
                workouts: [backedUpWorkoutFixture],
                totalReturned: 1,
                limitApplied: 10,
                hasMore: false,
            });

            expect(text).toContain('1 workout');
            expect(text).toContain('Upper Power');
            expect(text).toContain('Bench Press (Barbell)');

            const jsonStart = text.indexOf('[');
            expect(jsonStart).toBeGreaterThan(-1);
            const parsed = JSON.parse(text.slice(jsonStart)) as ReturnType<typeof workoutHistoryForModel>;
            expect(parsed[0].exercises[0].sets).toHaveLength(2);
            expect(parsed[0].exercises[0].sets[0].weight_kg).toBe(60);
            expect(parsed[0].exercises[0].sets[1].weight_kg).toBe(100);
        });

        it('handles empty results', () => {
            const text = formatWorkoutHistoryForModel({
                workouts: [],
                totalReturned: 0,
                limitApplied: 15,
                since: '2024-05-01T00:00:00.000Z',
                hasMore: false,
            });

            expect(text).toContain('No backed-up workouts found');
            expect(text).toContain('since 2024-05-01');
        });

        it('formats errors', () => {
            const text = formatWorkoutHistoryForModel({
                error: 'Sync error',
                message: 'Rate limited',
            });

            expect(text).toBe('Error: Rate limited');
        });
    });
});
