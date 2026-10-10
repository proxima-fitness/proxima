// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module @proxima/program-mutation-schemas/hevy-types
 *
 * Package-local Hevy grid shapes so Deno/Node consumers do not need landing ambient globals.
 */

export type THevyRepRange = {
    start: number;
    end: number;
};

export type THevySet = {
    index: number;
    type: string;
    weight_kg: number | null;
    reps: number | null;
    distance_meters: number | null;
    duration_seconds: number | null;
    rpe: number | null;
    custom_metric: number | null;
    rep_range: THevyRepRange | null;
};

export type THevyExercise = {
    index: number;
    title: string;
    notes: string;
    rest_seconds: string | null;
    exercise_template_id: string;
    supersets_id: number | null;
    sets: THevySet[];
    reason?: string;
};
