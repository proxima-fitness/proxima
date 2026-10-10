import type { McpServer } from 'npm:@modelcontextprotocol/server@2.0.0'

import { registerBuildTools } from './build.ts'
import { registerExerciseTools } from './exercises.ts'
import { registerMemoryTools } from './memory.ts'
import { registerMutateTools } from './mutate.ts'
import { registerProgramTools } from './programs.ts'
import type { ToolContext } from './types.ts'
import { registerWorkoutTools } from './workouts.ts'

export type { ToolContext } from './types.ts'

// The one composition point for this server. Add one registration call for
// each tool module; the MCP SDK rejects duplicate protocol tool names.
export function registerTools(server: McpServer, context: ToolContext): void {
  registerExerciseTools(server, context)
  registerWorkoutTools(server, context)
  registerProgramTools(server, context)
  registerMemoryTools(server, context)
  registerBuildTools(server, context)
  registerMutateTools(server, context)
}
