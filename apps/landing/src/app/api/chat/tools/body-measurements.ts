/**
 * @module chat/tools/body-measurements
 *
 * Agent body measurements tool - schema, limit cap, prompt summary, and
 * structured model output for backed-up Hevy measurements (no live Hevy fetch).
 *
 * Depends on: zod, api/body-measurements-read
 * Used by: chat/tools/tools.ts (getBodyMeasurements), chat/instructions
 */
import type { TBodyMeasurementRow } from '@/api/body-measurements-read';
import { normalizeMeasuredOnBound } from '@proxima/athlete-read';
import { z } from 'zod';

export { normalizeMeasuredOnBound };

/** Hard cap on measurement entries the agent can pull into context per call. */
export const AGENT_BODY_MEASUREMENTS_MAX = 30;

export const getBodyMeasurementsInputSchema = z.object({
    limit: z
        .number()
        .int()
        .min(1)
        .describe(
            `Number of recent body-measurement entries to retrieve (hard cap ${AGENT_BODY_MEASUREMENTS_MAX}). Choose the smallest set that answers the question.`,
        ),
    since: z
        .string()
        .optional()
        .describe(
            'Optional inclusive lower bound on measured_on (YYYY-MM-DD or ISO date). Use for time-bounded questions like "last month".',
        ),
    until: z
        .string()
        .optional()
        .describe(
            'Optional inclusive upper bound on measured_on (YYYY-MM-DD or ISO date).',
        ),
});

export type TGetBodyMeasurementsInput = z.infer<typeof getBodyMeasurementsInputSchema>;

/** Clamps agent-requested limit to the hard cap. */
export function clampBodyMeasurementsLimit(limit: number): number {
    if (!Number.isFinite(limit) || limit < 1) return 1;
    return Math.min(Math.floor(limit), AGENT_BODY_MEASUREMENTS_MAX);
}

type TMeasurementForModel = {
    measured_on: string;
    weight_kg: number | null;
    lean_mass_kg: number | null;
    fat_percent: number | null;
    neck_cm: number | null;
    shoulder_cm: number | null;
    chest_cm: number | null;
    left_bicep_cm: number | null;
    right_bicep_cm: number | null;
    left_forearm_cm: number | null;
    right_forearm_cm: number | null;
    abdomen: number | null;
    waist: number | null;
    hips: number | null;
    left_thigh: number | null;
    right_thigh: number | null;
    left_calf: number | null;
    right_calf: number | null;
};

/** Full measurement JSON for the LLM - metric storage units. */
export function bodyMeasurementsForModel(
    measurements: TBodyMeasurementRow[],
): TMeasurementForModel[] {
    return measurements.map((row) => ({
        measured_on: row.measured_on,
        weight_kg: row.weight_kg,
        lean_mass_kg: row.lean_mass_kg,
        fat_percent: row.fat_percent,
        neck_cm: row.neck_cm,
        shoulder_cm: row.shoulder_cm,
        chest_cm: row.chest_cm,
        left_bicep_cm: row.left_bicep_cm,
        right_bicep_cm: row.right_bicep_cm,
        left_forearm_cm: row.left_forearm_cm,
        right_forearm_cm: row.right_forearm_cm,
        abdomen: row.abdomen,
        waist: row.waist,
        hips: row.hips,
        left_thigh: row.left_thigh,
        right_thigh: row.right_thigh,
        left_calf: row.left_calf,
        right_calf: row.right_calf,
    }));
}

export type TBodyMeasurementsToolOutput =
    | {
          measurements: TBodyMeasurementRow[];
          totalReturned: number;
          limitApplied: number;
          since?: string;
          until?: string;
          hasMore: boolean;
          syncPending?: boolean;
      }
    | {
          error: string;
          message: string;
      };

/** Structured body-measurement history for the LLM after getBodyMeasurements executes. */
export function formatBodyMeasurementsForModel(output: TBodyMeasurementsToolOutput): string {
    if ('error' in output) {
        return `Error: ${output.message || output.error}`;
    }

    const { measurements, totalReturned, limitApplied, since, until, hasMore, syncPending } =
        output;
    if (totalReturned === 0) {
        const sinceNote = since ? ` since ${since.slice(0, 10)}` : '';
        const untilNote = until ? ` until ${until.slice(0, 10)}` : '';
        const syncNote = syncPending ? ' Backup sync may still be in progress.' : '';
        return `No backed-up body measurements found${sinceNote}${untilNote}.${syncNote} If the user recently connected Hevy, history may still be syncing.`;
    }

    const headerParts = [
        `${totalReturned} measurement${totalReturned === 1 ? '' : 's'}`,
    ];
    if (since) headerParts.push(`since ${since.slice(0, 10)}`);
    if (until) headerParts.push(`until ${until.slice(0, 10)}`);
    headerParts.push(`limit ${limitApplied}`);
    if (hasMore) headerParts.push('(more available - increase limit or narrow date window if needed)');
    if (syncPending) headerParts.push('(sync may still be catching up)');

    const payload = bodyMeasurementsForModel(measurements);

    return (
        `${headerParts.join(' · ')}. ` +
        'Entries sorted newest-first. Units are metric storage (kg / cm / %). Summarize trends in plain language; do not dump the full list verbatim.\n\n' +
        JSON.stringify(payload)
    );
}

function metricLine(label: string, value: number | null, unit: string): string | false {
    if (value == null || Number.isNaN(value)) return false;
    if (unit === '%') return `- ${label}: ${value}%`;
    return `- ${label}: ${value} ${unit}`;
}

/**
 * Short latest-measurement summary for the system prompt when backup has a row.
 * Metric storage units (kg / cm / %); date + non-null key metrics only.
 */
export function buildLatestBodyMeasurementBlock(
    measurement: TBodyMeasurementRow | null | undefined,
): string {
    if (!measurement) return '';

    const lines = [
        `- Measured on: ${measurement.measured_on}`,
        metricLine('Weight', measurement.weight_kg, 'kg'),
        metricLine('Lean mass', measurement.lean_mass_kg, 'kg'),
        metricLine('Body fat', measurement.fat_percent, '%'),
        metricLine('Neck', measurement.neck_cm, 'cm'),
        metricLine('Shoulders', measurement.shoulder_cm, 'cm'),
        metricLine('Chest', measurement.chest_cm, 'cm'),
        metricLine('Left bicep', measurement.left_bicep_cm, 'cm'),
        metricLine('Right bicep', measurement.right_bicep_cm, 'cm'),
        metricLine('Left forearm', measurement.left_forearm_cm, 'cm'),
        metricLine('Right forearm', measurement.right_forearm_cm, 'cm'),
        metricLine('Abdomen', measurement.abdomen, 'cm'),
        metricLine('Waist', measurement.waist, 'cm'),
        metricLine('Hips', measurement.hips, 'cm'),
        metricLine('Left thigh', measurement.left_thigh, 'cm'),
        metricLine('Right thigh', measurement.right_thigh, 'cm'),
        metricLine('Left calf', measurement.left_calf, 'cm'),
        metricLine('Right calf', measurement.right_calf, 'cm'),
    ].filter(Boolean).join('\n');

    if (!lines) return '';

    return (
        `## Latest Body Measurement\n` +
        `Most recent synced Hevy check-in from Body measurements backup (not live Hevy). ` +
        `Use for current weight/girth context.\n` +
        `${lines}`
    );
}
