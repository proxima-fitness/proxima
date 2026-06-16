import { describe, it, expect } from 'vitest';

import { backedUpWorkoutFixture } from '@/api/__tests__/manual/backed-up-workout.fixture';
import {
    AGENT_WORKOUT_HISTORY_MAX,
    clampWorkoutHistoryLimit,
    formatWorkoutHistoryForModel,
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

    describe('formatWorkoutHistoryForModel', () => {
        it('returns compact summary with dates, titles, and set highlights', () => {
            const text = formatWorkoutHistoryForModel({
                workouts: [backedUpWorkoutFixture],
                totalReturned: 1,
                limitApplied: 10,
                hasMore: false,
            });

            expect(text).toContain('1 workout');
            expect(text).toContain('2024-06-10');
            expect(text).toContain('Upper Power');
            expect(text).toContain('Bench Press (Barbell)');
            expect(text).toContain('100kg');
            expect(text).toContain('Overhead Press (Barbell)');
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
