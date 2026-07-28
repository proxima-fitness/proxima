/**
 * Tools always kept when a skill sets `allowedTools` (route prepareCall).
 * Constraint / Training profile writes must survive build-program / mutate-program
 * scopes or Agentic memory never persists mid-chat.
 * openHevyExportGate must survive so Hevy-export intent works post-build.
 */
export const ALWAYS_AVAILABLE_CHAT_TOOLS = [
    "loadSkill",
    "readFile",
    "bash",
    "updateConstraintProfile",
    "updateTrainingProfile",
    "openHevyExportGate",
] as const;
