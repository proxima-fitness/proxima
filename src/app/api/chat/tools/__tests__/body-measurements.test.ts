import { describe, it, expect } from 'vitest';

import type { TBodyMeasurementRow } from '@/api/body-measurements-read';
import { hevyBodyMeasurementFixture } from '@/api/__tests__/manual/hevy-body-measurement.fixture';
import { HEVY_BODY_MEASUREMENT_SOURCE } from '@/api/body-measurements';
import {
    AGENT_BODY_MEASUREMENTS_MAX,
    bodyMeasurementsForModel,
    buildLatestBodyMeasurementBlock,
    clampBodyMeasurementsLimit,
    formatBodyMeasurementsForModel,
    normalizeMeasuredOnBound,
} from '../body-measurements';

function measurementFixture(
    overrides: Partial<TBodyMeasurementRow> = {},
): TBodyMeasurementRow {
    return {
        id: 'bm-1',
        user_id: 'user-1',
        source: HEVY_BODY_MEASUREMENT_SOURCE,
        external_id: hevyBodyMeasurementFixture.date,
        measured_on: hevyBodyMeasurementFixture.date,
        weight_kg: hevyBodyMeasurementFixture.weight_kg ?? null,
        lean_mass_kg: hevyBodyMeasurementFixture.lean_mass_kg ?? null,
        fat_percent: hevyBodyMeasurementFixture.fat_percent ?? null,
        neck_cm: hevyBodyMeasurementFixture.neck_cm ?? null,
        shoulder_cm: hevyBodyMeasurementFixture.shoulder_cm ?? null,
        chest_cm: hevyBodyMeasurementFixture.chest_cm ?? null,
        left_bicep_cm: hevyBodyMeasurementFixture.left_bicep_cm ?? null,
        right_bicep_cm: hevyBodyMeasurementFixture.right_bicep_cm ?? null,
        left_forearm_cm: hevyBodyMeasurementFixture.left_forearm_cm ?? null,
        right_forearm_cm: hevyBodyMeasurementFixture.right_forearm_cm ?? null,
        abdomen: hevyBodyMeasurementFixture.abdomen ?? null,
        waist: hevyBodyMeasurementFixture.waist ?? null,
        hips: hevyBodyMeasurementFixture.hips ?? null,
        left_thigh: hevyBodyMeasurementFixture.left_thigh ?? null,
        right_thigh: hevyBodyMeasurementFixture.right_thigh ?? null,
        left_calf: hevyBodyMeasurementFixture.left_calf ?? null,
        right_calf: hevyBodyMeasurementFixture.right_calf ?? null,
        created_at: '2024-08-14T00:00:00Z',
        updated_at: '2024-08-14T00:00:00Z',
        ...overrides,
    };
}

describe('body-measurements tool helpers', () => {
    describe('clampBodyMeasurementsLimit', () => {
        it('caps at AGENT_BODY_MEASUREMENTS_MAX', () => {
            expect(clampBodyMeasurementsLimit(100)).toBe(AGENT_BODY_MEASUREMENTS_MAX);
            expect(clampBodyMeasurementsLimit(30)).toBe(30);
        });

        it('floors invalid values to 1', () => {
            expect(clampBodyMeasurementsLimit(0)).toBe(1);
            expect(clampBodyMeasurementsLimit(-5)).toBe(1);
        });
    });

    describe('normalizeMeasuredOnBound', () => {
        it('keeps YYYY-MM-DD and trims ISO to date', () => {
            expect(normalizeMeasuredOnBound('2024-05-01')).toBe('2024-05-01');
            expect(normalizeMeasuredOnBound('2024-05-01T00:00:00.000Z')).toBe('2024-05-01');
        });

        it('returns undefined for empty', () => {
            expect(normalizeMeasuredOnBound(undefined)).toBeUndefined();
            expect(normalizeMeasuredOnBound('  ')).toBeUndefined();
        });
    });

    describe('bodyMeasurementsForModel', () => {
        it('includes metric fields without ids', () => {
            const payload = bodyMeasurementsForModel([measurementFixture()]);
            expect(payload[0]).toMatchObject({
                measured_on: '2024-08-14',
                weight_kg: 80.5,
                lean_mass_kg: 65,
                fat_percent: 18.5,
                waist: 80,
            });
            expect(payload[0]).not.toHaveProperty('id');
            expect(payload[0]).not.toHaveProperty('user_id');
        });
    });

    describe('formatBodyMeasurementsForModel', () => {
        it('returns structured JSON for the agent', () => {
            const text = formatBodyMeasurementsForModel({
                measurements: [measurementFixture()],
                totalReturned: 1,
                limitApplied: 10,
                hasMore: false,
            });

            expect(text).toContain('1 measurement');
            expect(text).toContain('2024-08-14');

            const jsonStart = text.indexOf('[');
            expect(jsonStart).toBeGreaterThan(-1);
            const parsed = JSON.parse(text.slice(jsonStart)) as ReturnType<
                typeof bodyMeasurementsForModel
            >;
            expect(parsed[0].weight_kg).toBe(80.5);
            expect(parsed[0].fat_percent).toBe(18.5);
        });

        it('handles empty results', () => {
            const text = formatBodyMeasurementsForModel({
                measurements: [],
                totalReturned: 0,
                limitApplied: 15,
                since: '2024-05-01',
                hasMore: false,
            });

            expect(text).toContain('No backed-up body measurements found');
            expect(text).toContain('since 2024-05-01');
        });

        it('formats errors', () => {
            const text = formatBodyMeasurementsForModel({
                error: 'Sync error',
                message: 'Rate limited',
            });

            expect(text).toBe('Error: Rate limited');
        });
    });

    describe('buildLatestBodyMeasurementBlock', () => {
        it('returns empty when no measurement', () => {
            expect(buildLatestBodyMeasurementBlock(null)).toBe('');
            expect(buildLatestBodyMeasurementBlock(undefined)).toBe('');
        });

        it('includes date and non-null key metrics', () => {
            const block = buildLatestBodyMeasurementBlock(measurementFixture());
            expect(block).toContain('## Latest Body Measurement');
            expect(block).toContain('Measured on: 2024-08-14');
            expect(block).toContain('Weight: 80.5 kg');
            expect(block).toContain('Body fat: 18.5%');
            expect(block).toContain('Waist: 80 cm');
        });

        it('omits null metrics', () => {
            const block = buildLatestBodyMeasurementBlock(
                measurementFixture({
                    weight_kg: 75,
                    lean_mass_kg: null,
                    fat_percent: null,
                    neck_cm: null,
                    shoulder_cm: null,
                    chest_cm: null,
                    left_bicep_cm: null,
                    right_bicep_cm: null,
                    left_forearm_cm: null,
                    right_forearm_cm: null,
                    abdomen: null,
                    waist: null,
                    hips: null,
                    left_thigh: null,
                    right_thigh: null,
                    left_calf: null,
                    right_calf: null,
                }),
            );
            expect(block).toContain('Weight: 75 kg');
            expect(block).not.toContain('Lean mass');
            expect(block).not.toContain('Waist');
        });
    });
});
