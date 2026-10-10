// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module app-uris
 * MCP App `ui://` URIs + tool → surface map (ADR 0034 / 09 / 12).
 * Used by: ui-resources.ts, athlete.ts, programs.ts, mutate.ts, build.ts,
 * program-week-app.ts, app-uris_test.ts.
 */

/** Composable MCP App resource URIs (one surface each — C10). */
export const MCP_APP_URI = {
  programWeek: 'ui://proxima/program-week',
  programOverview: 'ui://proxima/program-overview',
  profileStatistics: 'ui://proxima/profile-statistics',
  profileCalendar: 'ui://proxima/profile-calendar',
  workoutBrowse: 'ui://proxima/workout-browse',
  bodyMeasurements: 'ui://proxima/body-measurements',
  blindSpot: 'ui://proxima/blind-spot',
} as const

export type TMcpAppUri = (typeof MCP_APP_URI)[keyof typeof MCP_APP_URI]

/**
 * Tools that open an MCP App (09 map). Omitted tools stay text-only.
 * Values are the HTML basename under `mcp/apps/` (without `.html`).
 */
export const TOOL_APP_HTML: Record<string, keyof typeof MCP_APP_URI> = {
  read_program: 'programOverview',
  build_program: 'programWeek',
  mutate_program: 'programWeek',
  accept_program_mutation: 'programWeek',
  reject_program_mutation: 'programWeek',
  save_program: 'programWeek',
  show_program_week: 'programWeek',
  list_workouts: 'workoutBrowse',
  get_profile_statistics: 'profileStatistics',
  get_profile_calendar: 'profileCalendar',
  list_body_measurements: 'bodyMeasurements',
  get_blind_spot_analysis: 'blindSpot',
}

/**
 * `_meta` for tools with an MCP App.
 * Sets both `ui.resourceUri` and `ui/resourceUri` (ext-apps registerAppTool parity).
 */
export function appUiMeta(uri: TMcpAppUri): {
  ui: { resourceUri: TMcpAppUri }
  'ui/resourceUri': TMcpAppUri
} {
  return {
    ui: { resourceUri: uri },
    'ui/resourceUri': uri,
  }
}
