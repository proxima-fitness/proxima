/**
 * MCP tools: create/get/replace/delete history Workouts (ADR 0033 / 03).
 */

import type { McpServer } from 'npm:@modelcontextprotocol/server@2.0.0'

import { errorResult, jsonResult, runtimeErrorResult } from './result.ts'
import type { ToolContext } from './types.ts'
import {
  CreateWorkoutInput,
  parseCreateWorkout,
  parseReplaceWorkout,
  ReplaceWorkoutInput,
  WorkoutIdInput,
} from './workout-schema.ts'
import {
  createWorkout,
  deleteWorkout,
  getWorkout,
  replaceWorkout,
} from './workouts-db.ts'

export function registerWorkoutTools(
  server: McpServer,
  { supabase, userClaims }: ToolContext
): void {
  server.registerTool(
    'create_workout',
    {
      description:
        'Create a history-only Workout for the signed-in athlete. First-write-wins on (source, external_id). Never Day complete.',
      inputSchema: CreateWorkoutInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        const parsed = parseCreateWorkout(args)
        if (!parsed.ok) {
          return errorResult(parsed.error)
        }
        const result = await createWorkout(supabase, userClaims.id, parsed.draft)
        if (result.status === 'created' || result.status === 'existing') {
          return jsonResult({ id: result.id })
        }
        if (result.status === 'conflict') {
          return errorResult('Workout already exists')
        }
        return errorResult(result.error)
      } catch (error) {
        return runtimeErrorResult(error)
      }
    }
  )

  server.registerTool(
    'get_workout',
    {
      description: 'Get one history Workout the signed-in athlete owns by id.',
      inputSchema: WorkoutIdInput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        const workout = await getWorkout(supabase, userClaims.id, args.id)
        if (!workout) {
          return errorResult('Workout not found')
        }
        return jsonResult(workout)
      } catch (error) {
        return runtimeErrorResult(error)
      }
    }
  )

  server.registerTool(
    'replace_workout',
    {
      description:
        'Full-replace mutable fields on a history Workout. source, external_id, and routine_id stay.',
      inputSchema: ReplaceWorkoutInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        const { id, ...body } = args
        const parsed = parseReplaceWorkout(body)
        if (!parsed.ok) {
          return errorResult(parsed.error)
        }
        const result = await replaceWorkout(supabase, userClaims.id, id, parsed.draft)
        if (result.status === 'replaced') {
          return jsonResult(result.workout)
        }
        if (result.status === 'not_found') {
          return errorResult('Workout not found')
        }
        return errorResult(result.error)
      } catch (error) {
        return runtimeErrorResult(error)
      }
    }
  )

  server.registerTool(
    'delete_workout',
    {
      description: 'Hard-delete a history Workout the signed-in athlete owns. Cascades exercises/sets.',
      inputSchema: WorkoutIdInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        const result = await deleteWorkout(supabase, userClaims.id, args.id)
        if (result.status === 'deleted') {
          return jsonResult({ deleted: true })
        }
        if (result.status === 'not_found') {
          return errorResult('Workout not found')
        }
        return errorResult(result.error)
      } catch (error) {
        return runtimeErrorResult(error)
      }
    }
  )
}
