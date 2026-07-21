import type { TConstraintProfile } from './types';

/**
 * Merges a persisted constraint profile (from DB) with a session profile
 * (from questionnaire params). Arrays are unioned (deduplicated, case-insensitive).
 * Session preference values win when non-empty, otherwise persisted values are kept.
 */
export function mergeConstraintProfiles(
    persisted: TConstraintProfile | null,
    session: TConstraintProfile,
): TConstraintProfile {
    if (!persisted) return session;

    return {
        injuries: unionStringArrays(persisted.injuries, session.injuries),
        excludedEquipment: unionStringArrays(persisted.excludedEquipment, session.excludedEquipment),
        excludedAreas: unionStringArrays(persisted.excludedAreas, session.excludedAreas),
        preferences: {
            splitType: session.preferences.splitType || persisted.preferences.splitType,
            exerciseVariability: session.preferences.exerciseVariability || persisted.preferences.exerciseVariability,
            progressionSystem: session.preferences.progressionSystem || persisted.preferences.progressionSystem,
            deloadWeek: session.preferences.deloadWeek || persisted.preferences.deloadWeek,
            peakWeek: session.preferences.peakWeek || persisted.preferences.peakWeek,
            warmupExercises: session.preferences.warmupExercises || persisted.preferences.warmupExercises,
        },
        chatRefinements: unionStringArrays(persisted.chatRefinements, session.chatRefinements),
    };
}
/** Case-insensitive union of two string arrays, preserving original casing from the first occurrence. */
function unionStringArrays(a: string[], b: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of [...a, ...b]) {
        const key = item.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            result.push(item);
        }
    }
    return result;
}

