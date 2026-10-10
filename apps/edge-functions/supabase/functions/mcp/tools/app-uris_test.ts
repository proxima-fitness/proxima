/**
 * Slice 12 checklist: tool → App map + composable HTML (no cross-surface chrome).
 * Run: deno test --config deno.json tools/app-uris_test.ts
 */

import { assert, assertEquals, assertFalse } from 'jsr:@std/assert@1'

import { MCP_APP_URI, TOOL_APP_HTML } from './app-uris.ts'

const APPS_DIR = new URL('../apps/', import.meta.url)

Deno.test('09 map: read_program → overview; mutate/build → week builder', () => {
  assertEquals(TOOL_APP_HTML.read_program, 'programOverview')
  assertEquals(TOOL_APP_HTML.show_program_week, 'programWeek')
  assertEquals(TOOL_APP_HTML.build_program, 'programWeek')
  assertEquals(TOOL_APP_HTML.mutate_program, 'programWeek')
  assertEquals(TOOL_APP_HTML.accept_program_mutation, 'programWeek')
  assertEquals(TOOL_APP_HTML.list_workouts, 'workoutBrowse')
  assertEquals(TOOL_APP_HTML.get_profile_statistics, 'profileStatistics')
  assertEquals(TOOL_APP_HTML.get_profile_calendar, 'profileCalendar')
  assertEquals(TOOL_APP_HTML.list_body_measurements, 'bodyMeasurements')
  assertEquals(TOOL_APP_HTML.get_blind_spot_analysis, 'blindSpot')
})

Deno.test('list_programs and get_latest_body_measurement have no App mapping', () => {
  assertFalse('list_programs' in TOOL_APP_HTML)
  assertFalse('get_latest_body_measurement' in TOOL_APP_HTML)
})

Deno.test('each mapped surface has a built HTML file under apps/', async () => {
  const files: Record<keyof typeof MCP_APP_URI, string> = {
    programWeek: 'program-week.html',
    programOverview: 'program-overview.html',
    profileStatistics: 'profile-statistics.html',
    profileCalendar: 'profile-calendar.html',
    workoutBrowse: 'workout-browse.html',
    bodyMeasurements: 'body-measurements.html',
    blindSpot: 'blind-spot.html',
  }
  for (const [key, file] of Object.entries(files)) {
    const text = await Deno.readTextFile(new URL(file, APPS_DIR))
    assert(text.includes('Proxima'), `${file} should brand Proxima`)
    assertEquals(MCP_APP_URI[key as keyof typeof MCP_APP_URI].startsWith('ui://proxima/'), true)
  }
})

Deno.test('calendar App HTML stamps only calendar surface marker', async () => {
  const calendar = await Deno.readTextFile(
    new URL('profile-calendar.html', APPS_DIR),
  )
  // Build injects SURFACE; markers are the runtime chrome identity (C10/C15).
  assert(calendar.includes('data-proxima-surface="calendar"'))
  assertFalse(calendar.includes('data-proxima-surface="statistics"'))
  assertFalse(calendar.includes('data-proxima-surface="overview"'))
  assertFalse(calendar.includes('data-proxima-surface="blind-spot"'))
  assert(calendar.includes('"calendar"'))
})

Deno.test('blind-spot App HTML stamps only blind-spot surface marker', async () => {
  const blind = await Deno.readTextFile(new URL('blind-spot.html', APPS_DIR))
  assert(blind.includes('data-proxima-surface="blind-spot"'))
  assertFalse(blind.includes('data-proxima-surface="calendar"'))
  assertFalse(blind.includes('data-proxima-surface="statistics"'))
  assertFalse(blind.includes('data-proxima-surface="overview"'))
})
