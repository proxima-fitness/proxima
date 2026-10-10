/**
 * Zod contracts for Proxima MCP program list/read tools (ADR 0034 / 01).
 */

import { z } from 'npm:zod@4'

/** No args — list uses Join membership only. */
export const ListProgramsInput = z.object({})

export const ProgramIdInput = z.object({
  program_id: z
    .number()
    .int()
    .positive()
    .describe('Proxima program id. Required — no vault / active default.'),
})

export type TProgramIdInput = z.infer<typeof ProgramIdInput>
