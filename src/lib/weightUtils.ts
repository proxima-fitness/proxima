/**
 * @module weightUtils
 *
 * Unit-conversion and formatting helpers for weight values displayed
 * throughout the training UI. All display weights are rounded to the
 * nearest quarter-unit for practical plate-loading relevance.
 *
 * Depends on: (none)
 * Used by: Exercise cards, workout summaries, program-builder components
 */

/** 1 lb = 0.453592 kg */
export const LBS_TO_KG = 0.453592;
/** 1 kg = 2.20462 lb */
export const KG_TO_LBS = 2.20462;

/**
 * Convert and format a weight value for display, respecting user preference.
 *
 * The result is rounded to the nearest 0.25 (quarter-unit) so that values
 * map to real-world plate combinations.
 *
 * @param weight - Raw numeric weight in `sourceUnit`
 * @param isInLbs - Whether the user wants to see pounds (`true`) or kilograms
 * @param sourceUnit - The unit the stored weight is expressed in
 * @returns Weight string with exactly 2 decimal places in the target unit
 */
export function formatWeight(
    weight: number,
    isInLbs: boolean,
    sourceUnit: "lbs" | "kg"
): string {
    let displayValue: number;
    if (isInLbs) {
        displayValue = sourceUnit === "kg" ? weight * KG_TO_LBS : weight;
    } else {
        displayValue = sourceUnit === "lbs" ? weight * LBS_TO_KG : weight;
    }
    // Round to nearest quarter-unit for practical plate loading
    displayValue = Math.round(displayValue * 4) / 4;
    return Number(displayValue).toFixed(2);
}

/**
 * Return the display label for the user's current weight-unit preference.
 *
 * @param isInLbs - Whether the user prefers pounds
 * @returns `"lbs"` or `"kg"`
 */
export function getWeightUnit(isInLbs: boolean): "lbs" | "kg" {
    return isInLbs ? "lbs" : "kg";
}
