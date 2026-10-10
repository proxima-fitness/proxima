export const AGENT_DEBUG_MODE_KEY = "proxima_agent_debug_mode";

export function getAgentDebugMode(): boolean {
    if (typeof window === "undefined") return false;
    try {
        return localStorage.getItem(AGENT_DEBUG_MODE_KEY) === "true";
    } catch {
        return false;
    }
}

export function setAgentDebugMode(enabled: boolean): void {
    if (typeof window === "undefined") return;
    try {
        if (enabled) {
            localStorage.setItem(AGENT_DEBUG_MODE_KEY, "true");
        } else {
            localStorage.removeItem(AGENT_DEBUG_MODE_KEY);
        }
    } catch {
        // ignore quota / private mode
    }
}
