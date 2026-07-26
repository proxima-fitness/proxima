import { describe, it, expect } from 'vitest';
import { validateAgainstConstraints } from '../validate';
import type { TConstraintProfile } from '../types';

function profile(overrides: Partial<TConstraintProfile> = {}): TConstraintProfile {
    return {
        injuries: [],
        excludedEquipment: [],
        excludedAreas: [],
        preferences: { splitType: '', exerciseVariability: '', progressionSystem: '', deloadWeek: '', peakWeek: '', warmupExercises: '' },
        chatRefinements: [],
        ...overrides,
    };
}

describe('validateAgainstConstraints', () => {
    it('passes when no constraints are set', () => {
        const result = validateAgainstConstraints(profile(), [
            { title: 'Bench Press', equipment: 'Barbell', primary_muscle_group: 'Chest' },
        ]);
        expect(result.valid).toBe(true);
    });

    it('passes an empty exercise list', () => {
        const result = validateAgainstConstraints(profile({ excludedEquipment: ['Band'] }), []);
        expect(result.valid).toBe(true);
    });

    it('flags exercise using excluded equipment', () => {
        const result = validateAgainstConstraints(
            profile({ excludedEquipment: ['Band'] }),
            [{ title: 'Band Pull-Apart', equipment: 'Band', primary_muscle_group: 'Shoulders' }],
        );
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.violations[0].exerciseTitle).toBe('Band Pull-Apart');
            expect(result.violations[0].reason).toContain('excluded equipment');
        }
    });

    it('flags exercise targeting excluded area', () => {
        const result = validateAgainstConstraints(
            profile({ excludedAreas: ['Shoulders'] }),
            [{ title: 'Overhead Press', equipment: 'Barbell', primary_muscle_group: 'Shoulders' }],
        );
        expect(result.valid).toBe(false);
        if (!result.valid) expect(result.violations[0].reason).toContain('excluded area');
    });

    it('flags exercise targeting injured area', () => {
        const result = validateAgainstConstraints(
            profile({ injuries: ['shoulder'] }),
            [{ title: 'Lateral Raise', equipment: 'Dumbbell', primary_muscle_group: 'Shoulders' }],
        );
        expect(result.valid).toBe(false);
        if (!result.valid) expect(result.violations[0].reason).toContain('injured area');
    });

    it('matching is case-insensitive', () => {
        const result = validateAgainstConstraints(
            profile({ excludedEquipment: ['band'] }),
            [{ title: 'Band Pull-Apart', equipment: 'Band', primary_muscle_group: 'Shoulders' }],
        );
        expect(result.valid).toBe(false);
    });

    it('clean exercise list passes even when constraints are set', () => {
        const result = validateAgainstConstraints(
            profile({ excludedEquipment: ['Band'], excludedAreas: ['Shoulders'], injuries: ['knee'] }),
            [{ title: 'Bench Press', equipment: 'Barbell', primary_muscle_group: 'Chest' }],
        );
        expect(result.valid).toBe(true);
    });

    it('collects multiple violations across multiple exercises', () => {
        const result = validateAgainstConstraints(
            profile({ excludedEquipment: ['Band'] }),
            [
                { title: 'Band Pull-Apart', equipment: 'Band', primary_muscle_group: 'Shoulders' },
                { title: 'Resistance Band Row', equipment: 'Band', primary_muscle_group: 'Back' },
            ],
        );
        expect(result.valid).toBe(false);
        if (!result.valid) expect(result.violations).toHaveLength(2);
    });

    it('ignores Hevy "none" equipment sentinel in excludedEquipment', () => {
        const result = validateAgainstConstraints(
            profile({ excludedEquipment: ['none', 'Band'] }),
            [
                { title: "World's Greatest Stretch", equipment: 'none', primary_muscle_group: 'Full Body' },
                { title: 'Band Pull-Apart', equipment: 'Band', primary_muscle_group: 'Shoulders' },
            ],
        );
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.violations).toHaveLength(1);
            expect(result.violations[0].exerciseTitle).toBe('Band Pull-Apart');
        }
    });
});
