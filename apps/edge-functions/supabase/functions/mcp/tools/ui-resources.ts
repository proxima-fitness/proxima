/**
 * @module ui-resources
 * Register composable MCP App HTML resources (ADR 0034 / 12).
 * Depends on: @modelcontextprotocol/ext-apps/server, app-uris.
 * Used by: tools/index.ts.
 *
 * Rebuild athlete Apps: from `ui/athlete/`, `node build.mjs`.
 * Rebuild week builder: from `ui/program-week/`, `node build.mjs`.
 */

import {
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from 'npm:@modelcontextprotocol/ext-apps@2.0.3/server'
import type { McpServer } from 'npm:@modelcontextprotocol/server@2.0.0'

import { MCP_APP_URI } from './app-uris.ts'

type TAppResource = {
  name: string
  uri: string
  description: string
  htmlFile: string
}

const APP_RESOURCES: readonly TAppResource[] = [
  {
    name: 'Proxima program week',
    uri: MCP_APP_URI.programWeek,
    description:
      'MCP App week builder: one Program prescription week, Accept proposal, Save.',
    htmlFile: 'program-week.html',
  },
  {
    name: 'Proxima program overview',
    uri: MCP_APP_URI.programOverview,
    description:
      'MCP App Program overview: glanceable weeks for one Joined program (look-first).',
    htmlFile: 'program-overview.html',
  },
  {
    name: 'Proxima profile statistics',
    uri: MCP_APP_URI.profileStatistics,
    description:
      'MCP App Profile statistics: Duration / Reps / Volume + consistency.',
    htmlFile: 'profile-statistics.html',
  },
  {
    name: 'Proxima profile calendar',
    uri: MCP_APP_URI.profileCalendar,
    description:
      'MCP App Profile calendar: month highlights from Workout history backup.',
    htmlFile: 'profile-calendar.html',
  },
  {
    name: 'Proxima workout history browse',
    uri: MCP_APP_URI.workoutBrowse,
    description:
      'MCP App Workout history browse: backed-up sessions (not live Hevy).',
    htmlFile: 'workout-browse.html',
  },
  {
    name: 'Proxima body measurements',
    uri: MCP_APP_URI.bodyMeasurements,
    description: 'MCP App Body measurements history window.',
    htmlFile: 'body-measurements.html',
  },
  {
    name: 'Proxima blind spot analysis',
    uri: MCP_APP_URI.blindSpot,
    description:
      'MCP App Blind spot analysis: stall flags and trends from backup.',
    htmlFile: 'blind-spot.html',
  },
]

function loadHtml(fileName: string): Promise<string> {
  return Deno.readTextFile(new URL(`../apps/${fileName}`, import.meta.url))
}

/** Register every composable `ui://` HTML resource (C10). */
export function registerUiResources(server: McpServer): void {
  for (const app of APP_RESOURCES) {
    registerAppResource(
      server,
      app.name,
      app.uri,
      {
        description: app.description,
        mimeType: RESOURCE_MIME_TYPE,
      },
      async () => {
        const text = await loadHtml(app.htmlFile)
        return {
          contents: [
            {
              uri: app.uri,
              mimeType: RESOURCE_MIME_TYPE,
              text,
            },
          ],
        }
      },
    )
  }
}
