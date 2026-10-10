// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module api/mesocycle-blocks
 *
 * Persisted **Mesocycle blocks** on the **Proxima program** (ADR 0032 / 04, C5).
 * `programs.mesocycle_blocks` stores the `blocks` array from the successful
 * **First build** `buildProgram` call as JSON:
 *
 *     [{ "name": "Accumulation", "weeks": [1, 2, 3], "intent": "volume" }, ...]
 *
 * `weeks` are 1-based. Blocks are the claimed phases for product use (UI, Edit
 * path context, debugging). They are not the **Periodization wave** and are not
 * a Jev phase-honor input.
 *
 * Write-once on New-path Save: Edit path and length changes do not rewrite the
 * column, so stored blocks may go stale until a later ADR defines rewrite rules.
 *
 * Server-safe: depends only on zod and `ai` types (no browser client).
 *
 * Depends on: zod, ai (UIMessage type)
 * Used by: BuildProgram (Save), program-builder/api/hevy (insert), program-prescription (read)
 */
import type { UIMessage } from "ai";
import { z } from "zod";

/** One persisted Mesocycle block. Same fields as the `buildProgram` plan block. */
export type TMesocycleBlock = {
    name: string;
    /** 1-based week indices inside the program. */
    weeks: number[];
    intent: string;
};

const mesocycleBlockSchema = z.object({
    name: z.string().min(1),
    weeks: z.array(z.number().int().min(1)).min(1),
    intent: z.string(),
});

const mesocycleBlocksSchema = z.array(mesocycleBlockSchema).min(1);

/**
 * Stored or echoed blocks as `TMesocycleBlock[]`, or null when absent or not
 * the documented shape. Extra keys are dropped so only name/weeks/intent persist.
 *
 * @param raw - `programs.mesocycle_blocks` or a `buildProgram` output `plan.blocks`
 */
export function parseMesocycleBlocks(raw: unknown): TMesocycleBlock[] | null {
    const parsed = mesocycleBlocksSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
}

/**
 * `plan.blocks` from the last successful `tool-buildProgram` in the chat.
 * Soft-fail and **Program stalemate** outputs carry `error` and never count, so
 * a failed attempt cannot persist its blocks. Null when no First build landed.
 *
 * @param messages - Full chat history (not only the current turn: Save can come later)
 */
export function readLandedMesocycleBlocks(messages: UIMessage[]): TMesocycleBlock[] | null {
    let landed: TMesocycleBlock[] | null = null;
    for (const message of messages) {
        if (message.role !== "assistant") continue;
        for (const part of message.parts) {
            if (part.type !== "tool-buildProgram" || !("output" in part)) continue;
            const output = part.output as { routines?: unknown; error?: unknown; plan?: { blocks?: unknown } } | null;
            if (!output || output.error || !Array.isArray(output.routines)) continue;
            landed = parseMesocycleBlocks(output.plan?.blocks);
        }
    }
    return landed;
}
