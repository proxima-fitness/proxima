// SPDX-License-Identifier: AGPL-3.0-only

// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { mergeConstraintProfiles } from '../merge';
import type { TConstraintProfile } from '../types';

function profile(overrides: Partial<TConstraintProfile> = {}): TConstraintProfile {
    return {
        injuries: [],
        excludedEquipment: [],
        excludedAreas: [],
        preferences: { splitType: '', exerciseVariability: '', progressionSystem: '', deloadWeek: '', peakWeek: '', warmupExercises: '' },
        ...overrides,
    };
}

describe('mergeConstraintProfiles', () => {
    it('returns session profile when persisted is null', () => {
        const session = profile({ injuries: ['bad knee'] });
        expect(mergeConstraintProfiles(null, session)).toEqual(session);
    });

    it('uses persisted arrays only - does not union with session', () => {
        const persisted = profile({ injuries: ['Bad Knee', 'shoulder pain'] });
        const session = profile({ injuries: ['bad knee', 'wrist issue'] });
        const result = mergeConstraintProfiles(persisted, session);
        expect(result.injuries).toEqual(['Bad Knee', 'shoulder pain']);
    });

    it('remove-from-persisted + stale session injury does not reappear', () => {
        const persisted = profile({ injuries: ['shoulder pain'] });
        const session = profile({ injuries: ['bad knee', 'shoulder pain'] });
        const result = mergeConstraintProfiles(persisted, session);
        expect(result.injuries).toEqual(['shoulder pain']);
        expect(result.injuries).not.toContain('bad knee');
    });

    it('persisted empty split beats session non-empty (PPL)', () => {
        const persisted = profile({
            preferences: { splitType: '', exerciseVariability: 'high', progressionSystem: 'linear', deloadWeek: '', peakWeek: '', warmupExercises: '' },
        });
        const session = profile({
            preferences: { splitType: 'PPL', exerciseVariability: '', progressionSystem: '', deloadWeek: '', peakWeek: '', warmupExercises: '' },
        });
        const result = mergeConstraintProfiles(persisted, session);
        expect(result.preferences.splitType).toBe('');
        expect(result.preferences.exerciseVariability).toBe('high');
        expect(result.preferences.progressionSystem).toBe('linear');
    });

    it('persisted empty split beats session Full Body', () => {
        const persisted = profile({
            preferences: { splitType: '', exerciseVariability: '', progressionSystem: '', deloadWeek: '', peakWeek: '', warmupExercises: '' },
        });
        const session = profile({
            preferences: { splitType: 'Full Body', exerciseVariability: '', progressionSystem: '', deloadWeek: '', peakWeek: '', warmupExercises: '' },
        });
        const result = mergeConstraintProfiles(persisted, session);
        expect(result.preferences.splitType).toBe('');
    });

    it('session preferences seed when persisted is null', () => {
        const session = profile({
            preferences: { splitType: 'PPL', exerciseVariability: 'high', progressionSystem: 'DUP', deloadWeek: 'week 4', peakWeek: '', warmupExercises: 'yes' },
        });
        const result = mergeConstraintProfiles(null, session);
        expect(result.preferences.splitType).toBe('PPL');
        expect(result.preferences.exerciseVariability).toBe('high');
        expect(result.preferences.progressionSystem).toBe('DUP');
        expect(result.preferences.deloadWeek).toBe('week 4');
        expect(result.preferences.warmupExercises).toBe('yes');
    });

    it('persisted preferences kept when session is empty', () => {
        const persisted = profile({
            preferences: { splitType: 'PPL', exerciseVariability: '', progressionSystem: 'DUP', deloadWeek: 'week 4', peakWeek: '', warmupExercises: 'yes' },
        });
        const session = profile();
        const result = mergeConstraintProfiles(persisted, session);
        expect(result.preferences.splitType).toBe('PPL');
        expect(result.preferences.progressionSystem).toBe('DUP');
        expect(result.preferences.deloadWeek).toBe('week 4');
        expect(result.preferences.warmupExercises).toBe('yes');
    });

    it('uses persisted for all array fields independently - ignores session arrays', () => {
        const persisted = profile({
            excludedEquipment: ['Band'],
            excludedAreas: ['Legs'],
        });
        const session = profile({
            excludedEquipment: ['Cable'],
            excludedAreas: ['legs', 'Arms'],
        });
        const result = mergeConstraintProfiles(persisted, session);
        expect(result.excludedEquipment).toEqual(['Band']);
        expect(result.excludedAreas).toEqual(['Legs']);
    });

    it('handles both profiles empty', () => {
        const result = mergeConstraintProfiles(profile(), profile());
        expect(result).toEqual(profile());
    });

    it('strips Hevy "none" sentinel from persisted excludedEquipment', () => {
        const persisted = profile({ excludedEquipment: ['Band', 'none'] });
        const result = mergeConstraintProfiles(persisted, profile());
        expect(result.excludedEquipment).toEqual(['Band']);
    });
});
