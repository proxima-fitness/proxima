/**
 * MCP tools: mutate_program / accept_program_mutation / reject_program_mutation /
 * save_program (ADR 0034 / 04 + 12 builder App).
 */

import type { McpServer } from 'npm:@modelcontextprotocol/server@2.0.0'

import { MCP_APP_URI, appUiMeta } from './app-uris.ts'
import {
  acceptProgramMutation,
  proposeProgramMutation,
  rejectProgramMutation,
  saveProgram,
} from './mutate-db.ts'
import {
  AcceptProgramMutationInput,
  MutateProgramInput,
  RejectProgramMutationInput,
  SaveProgramInput,
  type TAcceptProgramMutationInput,
  type TMutateProgramInput,
  type TRejectProgramMutationInput,
  type TSaveProgramInput,
} from './mutate-schema.ts'
import { errorResult, jsonResult, runtimeErrorResult } from './result.ts'
import type { ToolContext } from './types.ts'

export function registerMutateTools(
  server: McpServer,
  { supabase, userClaims }: ToolContext,
): void {
  server.registerTool(
    'mutate_program',
    {
      description:
        'Stage a Mutation proposal for an owned Proxima program (Program mutation batch). ' +
        'Fail-all: if any op is invalid or the Mutation constraint gate rejects, nothing is proposed. ' +
        'Does **not** write the Program prescription. Replaces any pending proposal for that program_id. ' +
        'Pending is allowed with the MCP App closed. Next: accept_program_mutation (needs builder state) then save_program. ' +
        'Ops: insert_exercise, edit_exercise, swap_exercise_template, delete_exercise, update_set, ' +
        'edit_day_title, add_day_notes, add_exercise_notes, delete_day, add_day, delete_week, ' +
        'create_superset, remove_from_superset. folderIds = 0-based week array; dayOrder = 1-based day.',
      inputSchema: MutateProgramInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: appUiMeta(MCP_APP_URI.programWeek),
    },
    async (args: TMutateProgramInput) => {
      try {
        const result = await proposeProgramMutation(
          supabase,
          userClaims.id,
          args,
        )
        if (result.status === 'ok') {
          return jsonResult({
            program_id: result.program_id,
            proposal: result.proposal,
            operations: result.operations,
          })
        }
        const detail = result.failures?.length
          ? `${result.error}: ${JSON.stringify(result.failures)}`
          : result.error
        return errorResult(detail)
      } catch (error) {
        return runtimeErrorResult(error)
      }
    },
  )

  server.registerTool(
    'accept_program_mutation',
    {
      description:
        'Accept the pending Mutation proposal into MCP App / builder in-memory state. ' +
        'Requires builder_routines (open the program week UI). Never writes the Program prescription — call save_program after. ' +
        'Fail-all apply; Edit program locks refuse Current week / Week complete. ' +
        'Without builder state returns an error and keeps the prescription unchanged.',
      inputSchema: AcceptProgramMutationInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: appUiMeta(MCP_APP_URI.programWeek),
    },
    async (args: TAcceptProgramMutationInput) => {
      try {
        const result = await acceptProgramMutation(
          supabase,
          userClaims.id,
          args,
        )
        if (result.status === 'ok') {
          return jsonResult({
            program_id: result.program_id,
            builder_routines: result.builder_routines,
          })
        }
        const detail = result.failures?.length
          ? `${result.error}: ${JSON.stringify(result.failures)}`
          : result.error
        return errorResult(detail)
      } catch (error) {
        return runtimeErrorResult(error)
      }
    },
  )

  server.registerTool(
    'reject_program_mutation',
    {
      description:
        'Discard the pending Mutation proposal for a program_id without changing the builder or prescription.',
      inputSchema: RejectProgramMutationInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: appUiMeta(MCP_APP_URI.programWeek),
    },
    async (args: TRejectProgramMutationInput) => {
      try {
        const result = await rejectProgramMutation(
          supabase,
          userClaims.id,
          args,
        )
        return jsonResult(result)
      } catch (error) {
        return runtimeErrorResult(error)
      }
    },
  )

  server.registerTool(
    'save_program',
    {
      description:
        'Edit program Save: persist builder_routines to the Program prescription (owner only). ' +
        'Refuses changes to Current week / Week complete slots (Edit program locks). ' +
        'Does not Week Export or Sync (ADR 0036). After success, read_program reflects the edit.',
      inputSchema: SaveProgramInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
      _meta: appUiMeta(MCP_APP_URI.programWeek),
    },
    async (args: TSaveProgramInput) => {
      try {
        const result = await saveProgram(supabase, userClaims.id, args)
        if (result.status === 'ok') {
          return jsonResult({ program_id: result.program_id, saved: true })
        }
        return errorResult(result.error)
      } catch (error) {
        return runtimeErrorResult(error)
      }
    },
  )
}
