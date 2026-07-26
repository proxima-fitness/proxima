import { canonicalizeConstraintPreferences } from '@/components/account/constraint-profile-options';
import type { TConstraintProfile } from './types';

interface IInitializeParams {
    healthIssues?: string;
    excludeEquipment?: string;
    excludeAreas?: string;
    splitType?: string;
    exerciseVariability?: string;
    progressionSystem?: string;
    deloadWeek?: string;
    peakWeek?: string;
    warmupExercises?: string;
}

/** Split questionnaire/CSV wire strings into constraint tokens (comma-delimited). */
export function splitConstraintCsv(value?: string): string[] {
    if (!value) return [];
    return value.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Hevy uses equipment `"none"` for no-equipment / bodyweight-adjacent templates.
 * That sentinel must never be treated as an exclusion target (blocks warmups/mobility).
 */
export function sanitizeExcludedEquipment(values: string[]): string[] {
    return values.filter((v) => v.trim().toLowerCase() !== 'none');
}

export function initializeConstraintProfile(params: IInitializeParams): TConstraintProfile {
    return {
        injuries: splitConstraintCsv(params.healthIssues),
        excludedEquipment: sanitizeExcludedEquipment(splitConstraintCsv(params.excludeEquipment)),
        excludedAreas: splitConstraintCsv(params.excludeAreas),
        preferences: canonicalizeConstraintPreferences({
            splitType: params.splitType?.trim() ?? '',
            exerciseVariability: params.exerciseVariability?.trim() ?? '',
            progressionSystem: params.progressionSystem?.trim() ?? '',
            deloadWeek: params.deloadWeek?.trim() ?? '',
            peakWeek: params.peakWeek?.trim() ?? '',
            warmupExercises: params.warmupExercises?.trim() ?? '',
        }),
        chatRefinements: [],
    };
}
