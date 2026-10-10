/**
 * MCP tools: athlete surface reads — browse, statistics, calendar,
 * body-measurement history, blind spot (ADR 0034 / 11 + 12 resourceUri).
 */

import type { McpServer } from 'npm:@modelcontextprotocol/server@2.0.0'

import { MCP_APP_URI, appUiMeta } from './app-uris.ts'
import {
  getBlindSpotAnalysis,
  getProfileCalendar,
  getProfileStatistics,
  listBodyMeasurements,
  listWorkouts,
} from './athlete-db.ts'
import {
  GetBlindSpotAnalysisInput,
  GetProfileCalendarInput,
  GetProfileStatisticsInput,
  ListBodyMeasurementsInput,
  ListWorkoutsInput,
  type TGetBlindSpotAnalysisInput,
  type TGetProfileCalendarInput,
  type TGetProfileStatisticsInput,
  type TListBodyMeasurementsInput,
  type TListWorkoutsInput,
} from './athlete-schema.ts'
import { jsonResult, runtimeErrorResult } from './result.ts'
import type { ToolContext } from './types.ts'

export function registerAthleteTools(
  server: McpServer,
  { supabase, userClaims }: ToolContext
): void {
  server.registerTool(
    'list_workouts',
    {
      description:
        'Browse backed-up Workout history for the signed-in athlete (Hevy sync backup — not live Hevy). Use for past sessions, weights, and volume questions. Prefer get_profile_statistics for weekly Duration/Reps/Volume charts. Not a program builder.',
      inputSchema: ListWorkoutsInput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: appUiMeta(MCP_APP_URI.workoutBrowse),
    },
    async (args: TListWorkoutsInput) => {
      try {
        const result = await listWorkouts(supabase, userClaims.id, {
          limit: args.limit,
          since: args.since,
          cursorStartedAt: args.cursor_started_at,
          cursorId: args.cursor_id,
          preview: args.preview,
        })
        return jsonResult(result)
      } catch (error) {
        return runtimeErrorResult(error)
      }
    }
  )

  server.registerTool(
    'get_profile_statistics',
    {
      description:
        'Profile statistics: weekly Duration/Reps/Volume (4 or 12 Sunday-start weeks, US ET) plus week streak and avg workouts/week from the athlete\'s backup. Use for "how\'s my volume" — do not open the program builder.',
      inputSchema: GetProfileStatisticsInput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: appUiMeta(MCP_APP_URI.profileStatistics),
    },
    async (args: TGetProfileStatisticsInput) => {
      try {
        const weeks = args.weeks ?? 4
        const stats = await getProfileStatistics(
          supabase,
          userClaims.id,
          weeks
        )
        return jsonResult(stats)
      } catch (error) {
        return runtimeErrorResult(error)
      }
    }
  )

  server.registerTool(
    'get_profile_calendar',
    {
      description:
        'Profile calendar: workouts in a local calendar month (highlights + per-day list) from the athlete\'s backup. Pass year, month, and timezone_offset_minutes from the athlete locale.',
      inputSchema: GetProfileCalendarInput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: appUiMeta(MCP_APP_URI.profileCalendar),
    },
    async (args: TGetProfileCalendarInput) => {
      try {
        const result = await getProfileCalendar(
          supabase,
          userClaims.id,
          args.year,
          args.month,
          args.timezone_offset_minutes
        )
        return jsonResult(result)
      } catch (error) {
        return runtimeErrorResult(error)
      }
    }
  )

  server.registerTool(
    'list_body_measurements',
    {
      description:
        'Body measurements history window (metric kg/cm/%) from the athlete\'s backup, newest-first. Use for trends; get_latest_body_measurement is the cheap single latest row.',
      inputSchema: ListBodyMeasurementsInput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: appUiMeta(MCP_APP_URI.bodyMeasurements),
    },
    async (args: TListBodyMeasurementsInput) => {
      try {
        const result = await listBodyMeasurements(supabase, userClaims.id, {
          limit: args.limit,
          since: args.since,
          until: args.until,
          cursorMeasuredOn: args.cursor_measured_on,
          cursorId: args.cursor_id,
        })
        return jsonResult(result)
      } catch (error) {
        return runtimeErrorResult(error)
      }
    }
  )

  server.registerTool(
    'get_blind_spot_analysis',
    {
      description:
        'Blind spot analysis: stall flags and weight trends per Hevy exercise template from the athlete\'s workout backup (not live Hevy). Ungated full-depth v1.',
      inputSchema: GetBlindSpotAnalysisInput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: appUiMeta(MCP_APP_URI.blindSpot),
    },
    async (args: TGetBlindSpotAnalysisInput) => {
      try {
        const result = await getBlindSpotAnalysis(supabase, userClaims.id, {
          exerciseTemplateIds: args.exercise_template_ids,
        })
        return jsonResult(result)
      } catch (error) {
        return runtimeErrorResult(error)
      }
    }
  )
}
