// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module lib/public-api/public-api-rate-limit
 *
 * Shared Upstash Redis budgets for `/api/v1` (ADR 0026 / 05). Sliding IP
 * 60/minute on every request; sliding write 20/hour per **Public API key**
 * holder on POST `/exercises` and POST/PUT/DELETE `/workouts`. Missing env or
 * Redis errors fail closed (503). Not the Hevy-share in-memory limiter.
 *
 * Depends on: @upstash/ratelimit, @upstash/redis
 * Used by: src/app/api/v1/exercises, src/app/api/v1/workouts
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const PUBLIC_API_IP_RATE_LIMIT_PER_MINUTE = 60;
export const PUBLIC_API_WRITE_RATE_LIMIT_PER_HOUR = 20;

export type TPublicApiSlidingLimitResult = {
    limit: number;
    reason?: string;
    remaining: number;
    reset: number;
    success: boolean;
};

export type TPublicApiSlidingLimiter = {
    limit: (identifier: string) => Promise<TPublicApiSlidingLimitResult>;
};

export type TPublicApiRateLimitOk = {
    allowed: true;
    limit: number;
    remaining: number;
    resetAt: number;
};

export type TPublicApiRateLimitBlocked = {
    allowed: false;
    limit: number;
    remaining: number;
    resetAt: number;
    retryAfterSeconds: number;
    status: 429;
};

export type TPublicApiRateLimitUnavailable = {
    allowed: false;
    status: 503;
};

export type TPublicApiRateLimitResult =
    | TPublicApiRateLimitOk
    | TPublicApiRateLimitBlocked
    | TPublicApiRateLimitUnavailable;

type TPublicApiRateLimiters = {
    ip: TPublicApiSlidingLimiter | null;
    write: TPublicApiSlidingLimiter | null;
};

let testLimiters: TPublicApiRateLimiters | undefined;
let envLimiters: TPublicApiRateLimiters | undefined;

/**
 * First `x-forwarded-for` hop, else `x-real-ip`, else `unknown`.
 *
 * @param request - Incoming `/api/v1` request
 */
export function readPublicApiClientIp(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
        const first = forwarded.split(",")[0]?.trim();
        if (first) {
            return first;
        }
    }
    const realIp = request.headers.get("x-real-ip")?.trim();
    if (realIp) {
        return realIp;
    }
    return "unknown";
}

/**
 * Sliding IP window for every `/api/v1` request, including catalog GET.
 *
 * @param request - Incoming request
 */
export async function checkPublicApiIpRateLimit(
    request: Request,
): Promise<TPublicApiRateLimitResult> {
    return consumeLimit(
        getLimiters().ip,
        readPublicApiClientIp(request),
        PUBLIC_API_IP_RATE_LIMIT_PER_MINUTE,
    );
}

/**
 * Sliding write window for the **Public API key** holder.
 *
 * @param userId - Resolved key owner
 */
export async function checkPublicApiWriteRateLimit(
    userId: string,
): Promise<TPublicApiRateLimitResult> {
    return consumeLimit(
        getLimiters().write,
        userId,
        PUBLIC_API_WRITE_RATE_LIMIT_PER_HOUR,
    );
}

/**
 * `X-RateLimit-*` plus `Retry-After` on 429. Empty on 503.
 *
 * @param result - Outcome of an IP or write check
 */
export function publicApiRateLimitHeaders(
    result: TPublicApiRateLimitResult,
): Record<string, string> {
    if (!result.allowed) {
        if (result.status === 503) {
            return {};
        }
        return {
            "Retry-After": String(result.retryAfterSeconds),
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": String(result.remaining),
            "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
        };
    }
    return {
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    };
}

/**
 * JSON body, status, and headers for a blocked `/api/v1` request.
 *
 * @param result - Failed IP or write check
 */
export function publicApiBlockedJson(
    result: Extract<TPublicApiRateLimitResult, { allowed: false }>,
): {
    body: { error: string };
    headers: Record<string, string>;
    status: 429 | 503;
} {
    if (result.status === 503) {
        return {
            body: { error: "Service unavailable" },
            headers: {},
            status: 503,
        };
    }
    return {
        body: { error: "Too many requests" },
        headers: publicApiRateLimitHeaders(result),
        status: 429,
    };
}

/**
 * Injects limiters for Vitest. `null` stands in for missing Redis.
 *
 * @param limiters - Fake Upstash clients, or nulls for 503
 */
export function setPublicApiRateLimitersForTests(limiters: TPublicApiRateLimiters): void {
    testLimiters = limiters;
}

/** Clears injected limiters. Tests only. */
export function resetPublicApiRateLimitersForTests(): void {
    testLimiters = undefined;
}

function getLimiters(): TPublicApiRateLimiters {
    if (testLimiters !== undefined) {
        return testLimiters;
    }
    if (envLimiters === undefined) {
        envLimiters = createLimitersFromEnv();
    }
    return envLimiters;
}

function createLimitersFromEnv(): TPublicApiRateLimiters {
    const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
    const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
    if (!url || !token) {
        return { ip: null, write: null };
    }

    const redis = new Redis({ url, token });
    return {
        ip: new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(PUBLIC_API_IP_RATE_LIMIT_PER_MINUTE, "1 m"),
            prefix: "proxima-public-api:ip",
            analytics: false,
        }),
        write: new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(PUBLIC_API_WRITE_RATE_LIMIT_PER_HOUR, "1 h"),
            prefix: "proxima-public-api:write",
            analytics: false,
        }),
    };
}

async function consumeLimit(
    limiter: TPublicApiSlidingLimiter | null,
    identifier: string,
    configuredLimit: number,
): Promise<TPublicApiRateLimitResult> {
    if (!limiter) {
        return { allowed: false, status: 503 };
    }

    let result: TPublicApiSlidingLimitResult;
    try {
        result = await limiter.limit(identifier);
    } catch {
        return { allowed: false, status: 503 };
    }

    if (result.reason === "timeout") {
        return { allowed: false, status: 503 };
    }

    const limit = result.limit || configuredLimit;
    const resetAt = result.reset;
    if (!result.success) {
        return {
            allowed: false,
            status: 429,
            limit,
            remaining: Math.max(0, result.remaining),
            resetAt,
            retryAfterSeconds: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)),
        };
    }

    return {
        allowed: true,
        limit,
        remaining: result.remaining,
        resetAt,
    };
}
