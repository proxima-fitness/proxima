// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module chat/sanity/periodization-wave
 *
 * Zod for the **Periodization wave** Andy submits on `buildProgram` (ADR 0027 / 02, ADR 0030 / 01,
 * ADR 0032 / 03).
 * Shape lives here; refine needs `durationWeeks` and `blocks` so it runs from
 * `buildProgramInputSchema.superRefine`. Slice 3 compiles this stash. No stamp.
 *
 * Depends on: zod
 * Used by: tools.ts buildProgramInputSchema, types.ts, periodization-wave tests
 */

import { z } from "zod";

/** Mesocycle block shape from `buildProgram`. Kept local so this file does not import `./types`. */
type TWaveBlock = {
    name: string;
    weeks: number[];
    intent: string;
};

/** Block name+intent tokens that require an accessory line on that week. */
const ACCESSORY_WEEK_RE = /\b(deload|unload|taper|peak)\b/i;

const periodizationDeltaSchema = z.object({
    rpeDelta: z.number().int().describe("Integer RPE change from week 1 for this role."),
    setCountDelta: z
        .number()
        .int()
        .describe("Integer working-set count change from week 1 for this role."),
});

const mainRepRangeSchema = z.object({
    start: z.number().int().min(1).describe("Lower bound of the main-lift rep range."),
    end: z.number().int().min(1).describe("Upper bound of the main-lift rep range."),
});

const periodizationWeekSchema = z.object({
    week: z.number().int().min(1).describe("1-based week index."),
    main: periodizationDeltaSchema.describe("Main-lift RPE and set-count deltas from week 1."),
    accessory: periodizationDeltaSchema
        .optional()
        .describe("Accessory deltas. Required only on claimed deload / unload / taper / peak weeks."),
    mainRepRange: mainRepRangeSchema
        .nullable()
        .optional()
        .describe("Absolute main-lift rep range. Only on a Block boundary after week 1."),
});

/** Wave shape without duration/block refine. `buildProgram` adds those. */
export const periodizationWaveSchema = z.object({
    weeks: z
        .array(periodizationWeekSchema)
        .min(1)
        .describe("One row per 1-based week; length must equal durationWeeks."),
});

export type TPeriodizationWave = z.infer<typeof periodizationWaveSchema>;

type TWavePlan = {
    durationWeeks: number;
    blocks: TWaveBlock[];
    periodizationWave: TPeriodizationWave;
};

function blockOwningWeek(blocks: TWaveBlock[], week: number): TWaveBlock | undefined {
    let found: TWaveBlock | undefined;
    for (const block of blocks) {
        if (block.weeks.includes(week)) found = block;
    }
    return found;
}

function weekNeedsAccessory(block: TWaveBlock | undefined): boolean {
    if (!block) return false;
    return ACCESSORY_WEEK_RE.test(`${block.name} ${block.intent}`);
}

function hasAccessoryLine(
    row: TPeriodizationWave["weeks"][number],
): boolean {
    return row.accessory !== undefined;
}

function hasMainRepRange(
    row: TPeriodizationWave["weeks"][number],
): boolean {
    return row.mainRepRange != null;
}

/**
 * First week of each block whose start is after week 1. Later blocks that
 * start on the same week still count as one boundary.
 *
 * @param blocks - `buildProgram` mesocycle blocks
 */
export function blockBoundaryWeeks(blocks: TWaveBlock[]): Set<number> {
    const boundaries = new Set<number>();
    for (const block of blocks) {
        if (block.weeks.length === 0) continue;
        const first = Math.min(...block.weeks);
        if (first > 1) boundaries.add(first);
    }
    return boundaries;
}

/**
 * Adds Zod issues when the wave does not cover 1..N, week 1 is not a zero
 * baseline, a later week leaves mains flat (both deltas 0, no `mainRepRange`;
 * ADR 0032 C4), accessory is missing/extra vs claimed deload/peak weeks, or
 * `mainRepRange` sits off a Block boundary.
 *
 * @param data - Parsed plan fields the wave is checked against
 * @param ctx - Zod superRefine context
 */
export function refinePeriodizationWave(data: TWavePlan, ctx: z.RefinementCtx): void {
    const { durationWeeks, blocks, periodizationWave } = data;
    const rows = periodizationWave.weeks;
    const seen = new Set<number>();
    let identityOk = rows.length === durationWeeks;

    for (const row of rows) {
        if (row.week < 1 || row.week > durationWeeks || seen.has(row.week)) {
            identityOk = false;
        }
        seen.add(row.week);
    }
    if (seen.size !== durationWeeks) identityOk = false;

    if (!identityOk) {
        ctx.addIssue({
            code: "custom",
            message: `periodizationWave.weeks must list weeks 1..${durationWeeks} exactly once`,
            path: ["periodizationWave", "weeks"],
        });
    }

    const boundaries = blockBoundaryWeeks(blocks);

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const path = ["periodizationWave", "weeks", i] as const;

        if (row.week === 1) {
            if (row.main.rpeDelta !== 0 || row.main.setCountDelta !== 0) {
                ctx.addIssue({
                    code: "custom",
                    message: "Week 1 main rpeDelta and setCountDelta must both be 0",
                    path: [...path, "main"],
                });
            }
            if (hasAccessoryLine(row)) {
                ctx.addIssue({
                    code: "custom",
                    message: "Week 1 must not include accessory",
                    path: [...path, "accessory"],
                });
            }
            if (hasMainRepRange(row)) {
                ctx.addIssue({
                    code: "custom",
                    message: "Week 1 must not include mainRepRange",
                    path: [...path, "mainRepRange"],
                });
            }
            continue;
        }

        const needsAccessory = weekNeedsAccessory(blockOwningWeek(blocks, row.week));
        const hasAccessory = hasAccessoryLine(row);
        if (needsAccessory !== hasAccessory) {
            ctx.addIssue({
                code: "custom",
                message: needsAccessory
                    ? `Week ${row.week} accessory is required on a deload / unload / taper / peak week`
                    : `Week ${row.week} accessory is only allowed on a deload / unload / taper / peak week`,
                path: [...path, "accessory"],
            });
        }

        const mainsFlat = row.main.rpeDelta === 0 && row.main.setCountDelta === 0;
        if (mainsFlat && !hasMainRepRange(row)) {
            ctx.addIssue({
                code: "custom",
                message: `Week ${row.week} mains must change from week 1: set a nonzero main rpeDelta or setCountDelta, or a mainRepRange on a Block boundary`,
                path: [...path, "main"],
            });
        }

        if (hasMainRepRange(row) && !boundaries.has(row.week)) {
            ctx.addIssue({
                code: "custom",
                message: `Week ${row.week} mainRepRange is only allowed on a Block boundary`,
                path: [...path, "mainRepRange"],
            });
        }
    }
}
