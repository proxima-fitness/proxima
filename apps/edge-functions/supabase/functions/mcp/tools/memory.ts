// SPDX-License-Identifier: AGPL-3.0-only

/**
 * MCP tools: Constraint / Training profile R/W + latest body measurement (ADR 0034 / 02).
 */

import type { McpServer } from 'npm:@modelcontextprotocol/server@2.0.0'

import {
  getConstraintProfile,
  getLatestBodyMeasurement,
  getTrainingProfile,
  updateConstraintProfile,
  updateTrainingProfile,
} from './memory-db.ts'
import {
  EmptyInput,
  UpdateConstraintProfileInput,
  UpdateTrainingProfileInput,
} from './memory-schema.ts'
import { errorResult, jsonResult, runtimeErrorResult } from './result.ts'
import type { ToolContext } from './types.ts'

export function registerMemoryTools(
  server: McpServer,
  { supabase, userClaims }: ToolContext
): void {
  server.registerTool(
    'get_constraint_profile',
    {
      description:
        'Read the signed-in athlete\'s Constraint profile (Agentic memory: injuries, excluded equipment/areas, preferences, raw statements). Returns null when no row.',
      inputSchema: EmptyInput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const profile = await getConstraintProfile(supabase, userClaims.id)
        return jsonResult({ profile })
      } catch (error) {
        return runtimeErrorResult(error)
      }
    }
  )

  server.registerTool(
    'update_constraint_profile',
    {
      description:
        'Patch-persist the Constraint profile (Agentic memory). Add freely; remove/clear only on User-stated change. Empty updates are skipped. Not for Training profile person facts.',
      inputSchema: UpdateConstraintProfileInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        const result = await updateConstraintProfile(
          supabase,
          userClaims.id,
          args
        )
        if (result.status === 'ok') {
          return jsonResult({ profile: result.profile })
        }
        if (result.status === 'skipped') {
          return jsonResult({ skipped: true, reason: result.reason })
        }
        return errorResult(result.error)
      } catch (error) {
        return runtimeErrorResult(error)
      }
    }
  )

  server.registerTool(
    'get_training_profile',
    {
      description:
        'Read the signed-in athlete\'s Training profile (Agentic memory person facts: age, sex, height, experience, physique phase, training focus, activity, session cap). Returns null when no row.',
      inputSchema: EmptyInput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const profile = await getTrainingProfile(supabase, userClaims.id)
        return jsonResult({ profile })
      } catch (error) {
        return runtimeErrorResult(error)
      }
    }
  )

  server.registerTool(
    'update_training_profile',
    {
      description:
        'Patch-persist the Training profile (Agentic memory person facts). Set freely; clear a field with null only on User-stated change. Empty updates are skipped. Not the Mutation constraint gate.',
      inputSchema: UpdateTrainingProfileInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        const result = await updateTrainingProfile(
          supabase,
          userClaims.id,
          args
        )
        if (result.status === 'ok') {
          return jsonResult({ profile: result.profile })
        }
        if (result.status === 'skipped') {
          return jsonResult({ skipped: true, reason: result.reason })
        }
        return errorResult(result.error)
      } catch (error) {
        return runtimeErrorResult(error)
      }
    }
  )

  server.registerTool(
    'get_latest_body_measurement',
    {
      description:
        'Read the newest backed-up Body measurement for the signed-in athlete (metric kg/cm/%). Returns null when none. Not full history.',
      inputSchema: EmptyInput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const measurement = await getLatestBodyMeasurement(
          supabase,
          userClaims.id
        )
        return jsonResult({ measurement })
      } catch (error) {
        return runtimeErrorResult(error)
      }
    }
  )
}
