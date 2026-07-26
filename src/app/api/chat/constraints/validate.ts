import { sanitizeExcludedEquipment } from './initialize';
import type { TConstraintProfile } from './types';

export type TConstraintViolation = {
    exerciseTitle: string;
    reason: string;
};

export type TValidationResult =
    | { valid: true }
    | { valid: false; violations: TConstraintViolation[] };

type TExerciseMeta = {
    title: string;
    equipment?: string | null;
    primary_muscle_group?: string | null;
};

function matchesAny(value: string | null | undefined, terms: string[]): boolean {
    if (!value || !terms.length) return false;
    const lower = value.toLowerCase();
    return terms.some(t => lower.includes(t.toLowerCase()));
}

export function validateAgainstConstraints(
    profile: TConstraintProfile,
    exercises: TExerciseMeta[],
): TValidationResult {
    const excludedEquipment = sanitizeExcludedEquipment(profile.excludedEquipment);
    const violations = exercises.flatMap(({ title, equipment, primary_muscle_group }) => [
        matchesAny(equipment, excludedEquipment) && {
            exerciseTitle: title,
            reason: `uses excluded equipment: ${equipment}`,
        },
        matchesAny(primary_muscle_group, profile.excludedAreas) && {
            exerciseTitle: title,
            reason: `targets excluded area: ${primary_muscle_group}`,
        },
        matchesAny(primary_muscle_group, profile.injuries) && {
            exerciseTitle: title,
            reason: `targets injured area: ${primary_muscle_group}`,
        },
    ]).filter((v): v is TConstraintViolation => !!v);

    return violations.length ? { valid: false, violations } : { valid: true };
}
