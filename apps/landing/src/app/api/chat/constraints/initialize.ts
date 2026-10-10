// SPDX-License-Identifier: AGPL-3.0-only

import { canonicalizeConstraintPreferences } from '@/components/account/constraint-profile-options';
import { sanitizeExcludedEquipment } from '@proxima/mutation-constraint-gate';
import type { TConstraintProfile } from './types';

export { sanitizeExcludedEquipment };

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
    };
}
