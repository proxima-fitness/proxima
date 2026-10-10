/**
 * @module program-week-app
 * MCP App week shell — ui:// resource + show_program_week (ADR 0034 / 06).
 * Depends on: @modelcontextprotocol/ext-apps/server, programs-db, program-week-model.
 * Used by: tools/index.ts.
 *
 * Rebuild UI: from a scratch dir with vite + vite-plugin-singlefile, bundle
 * `ui/program-week/` (import App from npm `@modelcontextprotocol/ext-apps/app-with-deps`)
 * into `apps/program-week.html`.
 */

import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from 'npm:@modelcontextprotocol/ext-apps@2.0.3/server'
import type { McpServer } from 'npm:@modelcontextprotocol/server@2.0.0'
import { z } from 'npm:zod@4'

import programWeekHtml from '../apps/program-week.html' with { type: 'text' }
import { readProgram } from './programs-db.ts'
import { buildProgramWeekShell } from './program-week-model.ts'
import { errorResult, jsonResult, runtimeErrorResult } from './result.ts'
import type { ToolContext } from './types.ts'

/** MCP App resource URI for the program week shell. */
export const PROGRAM_WEEK_RESOURCE_URI = 'ui://proxima/program-week'

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
 * Register the week-shell MCP App tool + UI resource.
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
        'Open the MCP App week shell for one Joined Proxima program week ' +
        '(prev/next chrome). Returns structuredContent for the iframe and a JSON text fallback for non-Apps hosts. ' +
        'Does not mutate the Program prescription.',
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

        const shell = buildProgramWeekShell({
          program_id: result.program.id,
          title: result.program.title,
          routines: result.program.routines,
          week_index: args.week_index ?? 0,
        })
        return jsonResult(shell)
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
      description: 'MCP App shell: one Program prescription week with prev/next.',
      mimeType: RESOURCE_MIME_TYPE,
    },
    () => ({
      contents: [
        {
          uri: PROGRAM_WEEK_RESOURCE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: programWeekHtml,
        },
      ],
    }),
  )
}
