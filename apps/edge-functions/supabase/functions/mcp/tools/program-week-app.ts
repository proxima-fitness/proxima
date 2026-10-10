/**
 * @module program-week-app
 * MCP App week builder — ui:// resource + show_program_week (ADR 0034 / 06–07).
 * Depends on: @modelcontextprotocol/ext-apps/server, programs-db, mutate-db,
 * program-week-model.
 * Used by: tools/index.ts.
 *
 * Rebuild UI: from `ui/program-week/`, `node build.mjs` → `apps/program-week.html`.
 */

import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from 'npm:@modelcontextprotocol/ext-apps@2.0.3/server'
import type { McpServer } from 'npm:@modelcontextprotocol/server@2.0.0'
import { z } from 'npm:zod@4'

import { peekPendingProposal } from './mutate-db.ts'
import { readProgram } from './programs-db.ts'
import { buildProgramWeekBuilder } from './program-week-model.ts'
import { errorResult, jsonResult, runtimeErrorResult } from './result.ts'
import type { ToolContext } from './types.ts'

/** MCP App resource URI for the program week builder. */
export const PROGRAM_WEEK_RESOURCE_URI = 'ui://proxima/program-week'

// Edge runtime rejects `import … with { type: 'text' }`; read the built HTML instead.
function loadProgramWeekHtml(): Promise<string> {
  return Deno.readTextFile(
    new URL('../apps/program-week.html', import.meta.url),
  )
}

const ShowProgramWeekInput = z.object({
  program_id: z
    .number()
    .int()
    .positive()
    .describe('Proxima program id. Required — no vault / active default.'),
  week_index: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('0-based week index (`folder_id`). Defaults to 0; clamped to range.'),
})

type TShowProgramWeekInput = z.infer<typeof ShowProgramWeekInput>

/**
 * Register the week-builder MCP App tool + UI resource.
 * Data tools stay usable without this UI (C3 host-optional).
 */
export function registerProgramWeekApp(
  server: McpServer,
  { supabase, userClaims }: ToolContext,
): void {
  registerAppTool(
    server,
    'show_program_week',
    {
      title: 'Show program week',
      description:
        'Open the MCP App week builder for one Joined Proxima program week ' +
        '(prev/next, Accept Mutation proposal, Save prescription). ' +
        'Returns structuredContent with builder_routines for the iframe and a JSON text fallback. ' +
        'Does not mutate the Program prescription by itself.',
      inputSchema: ShowProgramWeekInput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: {
        ui: { resourceUri: PROGRAM_WEEK_RESOURCE_URI },
      },
    },
    async (args: TShowProgramWeekInput) => {
      try {
        const result = await readProgram(
          supabase,
          userClaims.id,
          args.program_id,
        )
        if (result.status === 'not_found') {
          return errorResult('Program not found')
        }
        if (result.status === 'error') {
          return errorResult(result.error)
        }

        const pending = await peekPendingProposal(
          supabase,
          userClaims.id,
          args.program_id,
        )
        const payload = buildProgramWeekBuilder({
          program_id: result.program.id,
          title: result.program.title,
          routines: result.program.routines,
          week_index: args.week_index ?? 0,
          pending_op_count: pending?.length ?? 0,
        })
        return jsonResult(payload)
      } catch (error) {
        return runtimeErrorResult(error)
      }
    },
  )

  registerAppResource(
    server,
    'Proxima program week',
    PROGRAM_WEEK_RESOURCE_URI,
    {
      description:
        'MCP App week builder: one Program prescription week, Accept proposal, Save.',
      mimeType: RESOURCE_MIME_TYPE,
    },
    async () => {
      const text = await loadProgramWeekHtml()
      return {
        contents: [
          {
            uri: PROGRAM_WEEK_RESOURCE_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text,
          },
        ],
      }
    },
  )
}
