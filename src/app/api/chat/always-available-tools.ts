/**
 * Tools always kept when a skill sets `allowedTools` (route prepareCall).
 * Constraint / Training profile writes must survive build-program / mutate-program
 * scopes or Agentic memory never persists mid-chat.
 * openHevyExportGate must survive so Hevy-export intent works post-build.
 * fetchHevyShareFolder must survive so a share link pasted mid-build can be read for context.
 * importHevyShareFolder must survive so a confirmed share load is not blocked by a build/mutate
 * scope the same turn set - it refuses on its own gates, never on tool availability.
 */
export const ALWAYS_AVAILABLE_CHAT_TOOLS = [
    "loadSkill",
    "readFile",
    "bash",
    "updateConstraintProfile",
    "updateTrainingProfile",
    "openHevyExportGate",
    "fetchHevyShareFolder",
    "importHevyShareFolder",
] as const;
