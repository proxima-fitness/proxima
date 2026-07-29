/**
 * @module lib/hevy-share/share-rate-limit
 *
 * Light per-user/IP throttle on **Hevy share fetch** / **Hevy share import**. Fixed
 * window, N per hour, held in process memory - deliberately simple. It exists so one
 * caller cannot hammer Hevy's undocumented share endpoints with our platform key, not
 * as a billing meter (that is the **Hevy write quota**, and share reads never write).
 *
 * In-memory means the budget is per server instance and resets on deploy. Acceptable
 * for a courtesy limit; revisit if share reads ever become a costed feature.
 *
 * Depends on: nothing
 * Used by: lib/hevy-share/load-share
 */

/** Share reads allowed per key per hour. */
export const HEVY_SHARE_RATE_LIMIT_PER_HOUR = 20;

const WINDOW_MS = 60 * 60 * 1000;

/** Drop idle keys once we hold this many, so the map cannot grow unbounded. */
const MAX_TRACKED_KEYS = 5_000;

type TWindow = { windowStart: number; count: number };

const windows = new Map<string, TWindow>();

/** Outcome of a share-read budget check. */
export type THevyShareRateLimitResult = {
    allowed: boolean;
    /** Reads left in the current window after this check. */
    remaining: number;
    limit: number;
    /** Epoch ms when the current window rolls over. */
    resetAt: number;
};

/**
 * Builds the throttle key: signed-in users get their own budget, anonymous callers
 * share one per client IP. **Hevy share fetch** is anon-OK, so an IP fallback is the
 * only handle we have.
 */
export function hevyShareRateLimitKey(caller: { userId?: string | null; ip?: string | null }): string {
    const userId = caller.userId?.trim();
    if (userId) return `user:${userId}`;

    const ip = caller.ip?.trim();
    if (ip) return `ip:${ip}`;

    return "anonymous:unknown";
}

/** Evicts windows that have already expired; called only when the map grows large. */
function evictExpired(now: number): void {
    for (const [key, window] of windows) {
        if (now - window.windowStart >= WINDOW_MS) windows.delete(key);
    }
}

/**
 * Consumes one share read from `key`'s budget.
 *
 * Counts only allowed reads, so a throttled caller cannot push their own reset further out.
 *
 * @param key - From {@link hevyShareRateLimitKey}
 * @param now - Injectable clock for deterministic tests
 */
export function checkHevyShareRateLimit(
    key: string,
    now: number = Date.now(),
): THevyShareRateLimitResult {
    if (windows.size >= MAX_TRACKED_KEYS) evictExpired(now);

    const existing = windows.get(key);
    const window: TWindow =
        existing && now - existing.windowStart < WINDOW_MS
            ? existing
            : { windowStart: now, count: 0 };

    const allowed = window.count < HEVY_SHARE_RATE_LIMIT_PER_HOUR;
    if (allowed) window.count += 1;

    windows.set(key, window);

    return {
        allowed,
        remaining: Math.max(0, HEVY_SHARE_RATE_LIMIT_PER_HOUR - window.count),
        limit: HEVY_SHARE_RATE_LIMIT_PER_HOUR,
        resetAt: window.windowStart + WINDOW_MS,
    };
}

/** Clears all windows. Tests only - the limiter has no other reset path. */
export function resetHevyShareRateLimits(): void {
    windows.clear();
}
