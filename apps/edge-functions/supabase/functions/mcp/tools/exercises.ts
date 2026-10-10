// SPDX-License-Identifier: AGPL-3.0-only

/**
 * MCP tools: list_exercises + create_custom_exercise (ADR 0033 / 02).
 */

import type { McpServer } from 'npm:@modelcontextprotocol/server@2.0.0'

import {
  CreateCustomExerciseInput,
  ListExercisesInput,
  parseCreateCustomExercise,
  resolveListPagination,
} from './exercise-schema.ts'
import { createCustomExercise, listExercises } from './exercises-db.ts'
import { errorResult, jsonResult, runtimeErrorResult } from './result.ts'
import type { ToolContext } from './types.ts'

export function registerExerciseTools(
  server: McpServer,
  { supabase, userClaims }: ToolContext
): void {
  server.registerTool(
    'list_exercises',
    {
      description:
        'List Canonical exercises (globals) plus this athlete\'s Custom exercises. Paginated; omits user_id.',
      inputSchema: ListExercisesInput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        const { page, pageSize } = resolveListPagination(args)
        const result = await listExercises(supabase, { page, pageSize })
        return jsonResult(result)
      } catch (error) {
        return runtimeErrorResult(error)
      }
    }
  )

  server.registerTool(
    'create_custom_exercise',
    {
      description:
        'Create a Custom exercise for the signed-in athlete. Duplicate normalized title returns the existing id. Never creates a global.',
      inputSchema: CreateCustomExerciseInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        const parsed = parseCreateCustomExercise(args)
        if (!parsed.ok) {
          return errorResult(parsed.error)
        }
        const id = await createCustomExercise(supabase, userClaims.id, parsed.draft)
        return jsonResult({ id })
      } catch (error) {
        return runtimeErrorResult(error)
      }
    }
  )
}
