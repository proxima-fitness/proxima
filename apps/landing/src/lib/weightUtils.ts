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
 * @returns Weight string in the target unit; omits `.00` for whole numbers, keeps fractional decimals
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
    return String(parseFloat(displayValue.toFixed(2)));
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

/**
 * Parse a user-entered display weight back to kg for storage.
 *
 * Mirrors {@link formatWeight}: rounds to the nearest quarter-unit in the
 * user's display unit, then converts lbs → kg when `isInLbs` is true.
 *
 * @param displayValue - Raw input string in the user's preferred unit
 * @param isInLbs - Whether the input is expressed in pounds
 * @returns Weight in kg, or `null` when blank or non-positive
 */
export function parseWeight(displayValue: string, isInLbs: boolean): number | null {
    const trimmed = displayValue.trim();
    if (trimmed === "") return null;
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed) || parsed <= 0) return null;
    const roundedDisplay = Math.round(parsed * 4) / 4;
    return isInLbs ? roundedDisplay * LBS_TO_KG : roundedDisplay;
}

/**
 * Round a stored kg weight to N decimal places in the user's display unit,
 * then convert back to kg for storage.
 *
 * Use when the user asks to clean up decimals in the unit they see (e.g. whole
 * lbs): rounding in kg space leaves fractional lbs on screen (60 kg → 132.25 lbs).
 *
 * @param weightKg - Stored weight in kilograms
 * @param isInLbs - Whether the user's UI shows pounds
 * @param decimals - Decimal places to keep in the display unit (0 = whole units)
 * @returns Weight in kg that formats to the rounded display value
 */
export function roundWeightKgToDisplayDecimals(
    weightKg: number,
    isInLbs: boolean,
    decimals: number,
): number {
    const factor = 10 ** Math.max(0, Math.floor(decimals));
    const display = isInLbs ? weightKg * KG_TO_LBS : weightKg;
    const roundedDisplay = Math.round(display * factor) / factor;
    return isInLbs ? roundedDisplay * LBS_TO_KG : roundedDisplay;
}

/**
 * Snap a stored kg weight to the nearest quarter-**lb** so Hevy/UI don't show
 * float junk (95.25 kg → 209.99 lbs). No-op when the user is in kg mode —
 * storage already matches what they specified; only lbs display needs the
 * round-trip through a clean plate step (`.00` / `.25` / `.50` / `.75`).
 *
 * @param weightKg - Stored weight in kilograms
 * @param isInLbs - Whether the user's UI / Hevy account shows pounds
 * @returns Weight in kg derived from a clean lb quarter, or `weightKg` unchanged
 */
export function snapWeightKgToDisplayQuarter(
    weightKg: number,
    isInLbs: boolean,
): number {
    if (!isInLbs) {
        return weightKg;
    }
    const displayLbs = weightKg * KG_TO_LBS;
    const roundedLbs = Math.round(displayLbs * 4) / 4;
    return roundedLbs * LBS_TO_KG;
}
