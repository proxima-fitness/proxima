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

function splitToArray(value?: string): string[] {
    if (!value) return [];
    return value.split(',').map(s => s.trim()).filter(Boolean);
}

export function initializeConstraintProfile(params: IInitializeParams): TConstraintProfile {
    return {
        injuries: splitToArray(params.healthIssues),
        excludedEquipment: splitToArray(params.excludeEquipment),
        excludedAreas: splitToArray(params.excludeAreas),
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
