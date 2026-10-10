// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module account/body-measurements-display
 *
 * Display helpers for Body measurements Edit-profile section.
 * Storage is always metric (kg / cm); UI follows weight-unit preference.
 *
 * Depends on: @/lib/weightUtils, TBodyMeasurementRow
 * Used by: BodyMeasurementsSection
 */

import type { TBodyMeasurementRow } from "@/api/body-measurements-read";
import { formatWeight, getWeightUnit } from "@/lib/weightUtils";

/** Short history list size on Edit profile. */
export const BODY_MEASUREMENTS_SECTION_HISTORY_LIMIT = 5;

const CM_TO_IN = 1 / 2.54;

type TMetricField = {
    key: keyof TBodyMeasurementRow;
    label: string;
    kind: "mass" | "girth" | "percent";
};

/** Ordered fields shown in the latest summary (non-null only). */
export const BODY_MEASUREMENT_DISPLAY_FIELDS: readonly TMetricField[] = [
    { key: "weight_kg", label: "Weight", kind: "mass" },
    { key: "lean_mass_kg", label: "Lean mass", kind: "mass" },
    { key: "fat_percent", label: "Body fat", kind: "percent" },
    { key: "neck_cm", label: "Neck", kind: "girth" },
    { key: "shoulder_cm", label: "Shoulders", kind: "girth" },
    { key: "chest_cm", label: "Chest", kind: "girth" },
    { key: "left_bicep_cm", label: "Left bicep", kind: "girth" },
    { key: "right_bicep_cm", label: "Right bicep", kind: "girth" },
    { key: "left_forearm_cm", label: "Left forearm", kind: "girth" },
    { key: "right_forearm_cm", label: "Right forearm", kind: "girth" },
    { key: "abdomen", label: "Abdomen", kind: "girth" },
    { key: "waist", label: "Waist", kind: "girth" },
    { key: "hips", label: "Hips", kind: "girth" },
    { key: "left_thigh", label: "Left thigh", kind: "girth" },
    { key: "right_thigh", label: "Right thigh", kind: "girth" },
    { key: "left_calf", label: "Left calf", kind: "girth" },
    { key: "right_calf", label: "Right calf", kind: "girth" },
] as const;

function trimDecimal(value: number, digits: number): string {
    return String(parseFloat(value.toFixed(digits)));
}

/** Formats stored kg for display (lbs or kg). */
export function formatBodyMassKg(kg: number, isInLbs: boolean): string {
    return `${formatWeight(kg, isInLbs, "kg")} ${getWeightUnit(isInLbs)}`;
}

/** Formats stored cm girth for display (in or cm). */
export function formatGirthCm(cm: number, isImperial: boolean): string {
    if (!isImperial) {
        return `${trimDecimal(cm, 1)} cm`;
    }
    return `${trimDecimal(cm * CM_TO_IN, 1)} in`;
}

/** Formats fat % for display. */
export function formatFatPercent(percent: number): string {
    return `${trimDecimal(percent, 1)}%`;
}

export type TBodyMeasurementDisplayRow = {
    label: string;
    value: string;
};

/**
 * Builds labeled display rows for non-null metrics on a measurement.
 *
 * @param row - Backup measurement (metric storage)
 * @param isInLbs - User weight preference; also drives girth in vs cm
 */
export function buildBodyMeasurementDisplayRows(
    row: TBodyMeasurementRow,
    isInLbs: boolean,
): TBodyMeasurementDisplayRow[] {
    const rows: TBodyMeasurementDisplayRow[] = [];

    for (const field of BODY_MEASUREMENT_DISPLAY_FIELDS) {
        const raw = row[field.key];
        if (typeof raw !== "number" || Number.isNaN(raw)) continue;

        if (field.kind === "mass") {
            rows.push({ label: field.label, value: formatBodyMassKg(raw, isInLbs) });
        } else if (field.kind === "girth") {
            rows.push({ label: field.label, value: formatGirthCm(raw, isInLbs) });
        } else {
            rows.push({ label: field.label, value: formatFatPercent(raw) });
        }
    }

    return rows;
}

/** One-line history preview: date + weight when present. */
export function formatHistoryPreview(
    row: TBodyMeasurementRow,
    isInLbs: boolean,
): string {
    const dateLabel = formatMeasuredOn(row.measured_on);
    if (row.weight_kg == null) {
        return dateLabel;
    }
    return `${dateLabel} · ${formatBodyMassKg(row.weight_kg, isInLbs)}`;
}

/** Formats `measured_on` (YYYY-MM-DD) for UI. */
export function formatMeasuredOn(measuredOn: string): string {
    const [year, month, day] = measuredOn.split("-").map(Number);
    if (!year || !month || !day) return measuredOn;
    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
    });
}
