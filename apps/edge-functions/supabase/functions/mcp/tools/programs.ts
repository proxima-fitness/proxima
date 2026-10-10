/**
 * MCP tools: list_programs + read_program (ADR 0034 / 01).
 */

import type { McpServer } from 'npm:@modelcontextprotocol/server@2.0.0'

import { ListProgramsInput, ProgramIdInput } from './program-schema.ts'
import { listPrograms, readProgram } from './programs-db.ts'
import { errorResult, jsonResult, runtimeErrorResult } from './result.ts'
import type { ToolContext } from './types.ts'

export function registerProgramTools(
  server: McpServer,
  { supabase, userClaims }: ToolContext
): void {
  server.registerTool(
    'list_programs',
    {
      description:
        'List Proxima programs on the signed-in athlete\'s Program overview (Join / subscribe). Returns id, title, joined. No vault default — pick an id for read_program.',
      inputSchema: ListProgramsInput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const programs = await listPrograms(supabase, userClaims.id)
        return jsonResult({ programs })
      } catch (error) {
        return runtimeErrorResult(error)
      }
    }
  )

  server.registerTool(
    'read_program',
    {
      description:
        'Read one Joined Proxima program\'s Program prescription as a Hevy-shaped grid (folder_id = 0-based week, order = 1-based day). Requires explicit program_id.',
      inputSchema: ProgramIdInput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        const result = await readProgram(supabase, userClaims.id, args.program_id)
        if (result.status === 'ok') {
          return jsonResult(result.program)
        }
        if (result.status === 'not_found') {
          return errorResult('Program not found')
        }
        return errorResult(result.error)
      } catch (error) {
        return runtimeErrorResult(error)
      }
    }
  )
}
