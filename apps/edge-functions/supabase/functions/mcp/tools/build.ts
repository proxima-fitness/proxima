/**
 * MCP tool: build_program — First build lands immediately (ADR 0034 / 03 + 12 builder App).
 */

import type { McpServer } from 'npm:@modelcontextprotocol/server@2.0.0'

import { MCP_APP_URI, appUiMeta } from './app-uris.ts'
import { buildProgram } from './build-db.ts'
import { BuildProgramInput } from './build-schema.ts'
import { errorResult, jsonResult, runtimeErrorResult } from './result.ts'
import type { ToolContext } from './types.ts'

export function registerBuildTools(
  server: McpServer,
  { supabase, userClaims }: ToolContext
): void {
  server.registerTool(
    'build_program',
    {
      description:
        'First build: create a new owned Proxima program from week 1 + required Periodization wave. ' +
        'Code plates week 1 across durationWeeks, stamps the wave, and persists the full Program prescription immediately (not a Mutation proposal). ' +
        'Owner is the signed-in OAuth user; they are Joined automatically. After success, use read_program with the returned program_id. ' +
        'Do not call again to edit — later changes use mutate tools (slice 04). Soft-fail: fix week 1 and/or the wave and retry the full call.',
      inputSchema: BuildProgramInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: appUiMeta(MCP_APP_URI.programWeek),
    },
    async (args) => {
      try {
        const result = await buildProgram(supabase, userClaims.id, args)
        if (result.status === 'ok') {
          return jsonResult({
            program_id: result.program_id,
            title: result.title,
            program_length: result.program_length,
          })
        }
        return errorResult(result.error)
      } catch (error) {
        return runtimeErrorResult(error)
      }
    }
  )
}
