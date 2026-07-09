// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { mergeConstraintProfiles } from '../merge';
import type { TConstraintProfile } from '../types';

function profile(overrides: Partial<TConstraintProfile> = {}): TConstraintProfile {
    return {
        injuries: [],
        excludedEquipment: [],
        excludedAreas: [],
        preferences: { splitType: '', exerciseVariability: '', progressionSystem: '', deloadWeek: '', peakWeek: '' },
        chatRefinements: [],
        ...overrides,
    };
}

describe('mergeConstraintProfiles', () => {
    it('returns session profile when persisted is null', () => {
        const session = profile({ injuries: ['bad knee'] });
        expect(mergeConstraintProfiles(null, session)).toEqual(session);
    });

    it('unions arrays with case-insensitive dedup', () => {
        const persisted = profile({ injuries: ['Bad Knee', 'shoulder pain'] });
        const session = profile({ injuries: ['bad knee', 'wrist issue'] });
        const result = mergeConstraintProfiles(persisted, session);
        expect(result.injuries).toEqual(['Bad Knee', 'shoulder pain', 'wrist issue']);
    });

    it('session preferences win when non-empty', () => {
        const persisted = profile({
            preferences: { splitType: 'PPL', exerciseVariability: 'high', progressionSystem: 'linear', deloadWeek: '', peakWeek: '' },
        });
        const session = profile({
            preferences: { splitType: 'Upper/Lower', exerciseVariability: '', progressionSystem: '', deloadWeek: '', peakWeek: '' },
        });
        const result = mergeConstraintProfiles(persisted, session);
        expect(result.preferences.splitType).toBe('Upper/Lower');
        expect(result.preferences.exerciseVariability).toBe('high');
        expect(result.preferences.progressionSystem).toBe('linear');
    });

    it('persisted preferences kept when session is empty', () => {
        const persisted = profile({
            preferences: { splitType: 'PPL', exerciseVariability: '', progressionSystem: 'DUP', deloadWeek: 'week 4', peakWeek: '' },
        });
        const session = profile();
        const result = mergeConstraintProfiles(persisted, session);
        expect(result.preferences.splitType).toBe('PPL');
        expect(result.preferences.progressionSystem).toBe('DUP');
        expect(result.preferences.deloadWeek).toBe('week 4');
    });

    it('unions all array fields independently', () => {
        const persisted = profile({
            excludedEquipment: ['Band'],
            excludedAreas: ['Legs'],
            chatRefinements: ['no supersets'],
        });
        const session = profile({
            excludedEquipment: ['Cable'],
            excludedAreas: ['legs', 'Arms'],
            chatRefinements: ['no supersets', 'prefer compounds'],
        });
        const result = mergeConstraintProfiles(persisted, session);
        expect(result.excludedEquipment).toEqual(['Band', 'Cable']);
        expect(result.excludedAreas).toEqual(['Legs', 'Arms']);
        expect(result.chatRefinements).toEqual(['no supersets', 'prefer compounds']);
    });

    it('handles both profiles empty', () => {
        const result = mergeConstraintProfiles(profile(), profile());
        expect(result).toEqual(profile());
    });
});
