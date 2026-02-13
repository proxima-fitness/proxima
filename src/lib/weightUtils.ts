/** 1 lb = 0.453592 kg */
export const LBS_TO_KG = 0.453592;
/** 1 kg = 2.20462 lb */
export const KG_TO_LBS = 2.20462;

/**
 * Format a weight value for display, converting if needed based on user preference.
 * @param weight - The numeric weight value
 * @param isInLbs - Whether to display in pounds (true) or kilograms (false)
 * @param sourceUnit - The unit the weight is stored in ('lbs' or 'kg')
 * @returns Formatted string with 2 decimal places
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
    displayValue = Math.round(displayValue * 4) / 4;
    return Number(displayValue).toFixed(2);
}

/**
 * Return the unit label for the current display preference.
 */
export function getWeightUnit(isInLbs: boolean): "lbs" | "kg" {
    return isInLbs ? "lbs" : "kg";
}
