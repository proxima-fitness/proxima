/**
 * @module lib/hevy-share
 *
 * Server-side **Hevy share fetch** / **Hevy share import** pipeline: link parse,
 * platform-key proxy to Hevy's undocumented web share endpoints, light throttle,
 * and the adapter that produces a one-week `THevyRoutine[]` seed.
 *
 * Start at {@link loadHevyShare} - the agent tools need nothing else.
 *
 * Used by: chat share tools (sub-plans 2-3)
 */
export { loadHevyShare, type THevyShareCaller, type THevyShareLoadResult } from "./load-share";
export { adaptHevyShareToRoutines, type THevyShareAdaptResult } from "./share-adapter";
export {
    HEVY_SHARE_API_BASE,
    HEVY_SHARE_PLATFORM_KEY_ENV,
    fetchHevyShareTarget,
    fetchRoutineWithShortId,
    fetchShareableFolder,
    isHevyShareConfigured,
} from "./share-client";
export { HevyShareError, isHevyShareError, type THevyShareErrorReason } from "./share-errors";
export {
    HEVY_SHARE_RATE_LIMIT_PER_HOUR,
    checkHevyShareRateLimit,
    hevyShareRateLimitKey,
    resetHevyShareRateLimits,
    type THevyShareRateLimitResult,
} from "./share-rate-limit";
export { formatHevyShareUrl, parseHevyShareUrl, type THevyShareTarget } from "./share-url";
