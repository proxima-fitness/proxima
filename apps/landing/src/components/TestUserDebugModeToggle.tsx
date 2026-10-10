"use client";

/**
 * @module TestUserDebugModeToggle
 * For test users only: toggle agent debug mode (show Soft tool failure panels
 * in chat and log Jev traces).
 * Depends on: UserContext, feature-limits isTestUser, AgentDebugModeContext, UI Checkbox.
 * Used by: AppSidebar (when user is test user).
 */
import { Checkbox } from "@/components/ui/checkbox";
import { useUserContext } from "@/contexts/UserContext";
import { useAgentDebugMode } from "@/contexts/AgentDebugModeContext";
import { isTestUser } from "@/api/feature-limits";

/** No props. Renders nothing if user is not a test user; otherwise debug mode checkbox. */
export function TestUserDebugModeToggle() {
    const { user } = useUserContext();
    const { debugMode, setDebugMode } = useAgentDebugMode();

    if (!user || !isTestUser(user)) return null;

    return (
        <div className="px-2 pb-1.5">
            <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                    checked={debugMode}
                    onCheckedChange={(checked) => setDebugMode(checked === true)}
                    aria-label="Debug mode"
                />
                <span className="text-sm text-foreground">Debug mode</span>
            </label>
            <p className="text-muted-foreground mt-1 pl-6 text-xs">
                Show tool errors and log Jev checks
            </p>
        </div>
    );
}
