import type { McpServer } from 'npm:@modelcontextprotocol/server@2.0.0'

import { registerExerciseTools } from './exercises.ts'
import type { ToolContext } from './types.ts'
import { registerWorkoutTools } from './workouts.ts'

export type { ToolContext } from './types.ts'

// The one composition point for this server. Add one registration call for
// each tool module; the MCP SDK rejects duplicate protocol tool names.
export function registerTools(server: McpServer, context: ToolContext): void {
  registerExerciseTools(server, context)
  registerWorkoutTools(server, context)
}
