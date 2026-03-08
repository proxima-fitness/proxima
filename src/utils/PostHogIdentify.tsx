"use client";

/**
 * Syncs Supabase auth state to PostHog so session replays and events are linked
 * to the real user (distinct_id = user.id). Call identify on login, reset on logout.
 *
 * Depends on: posthog-js, UserContext. Must be rendered inside PostHogProvider and UserProvider.
 */

import posthog from "posthog-js";
import { useEffect } from "react";
import { useUserContext } from "@/contexts/UserContext";

export function PostHogIdentify() {
    const { user } = useUserContext();

    useEffect(() => {
        if (user) {
            posthog?.identify?.(user.id);
        } else {
            posthog?.reset?.();
        }
    }, [user]);

    return null;
}
