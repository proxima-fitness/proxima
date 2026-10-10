// SPDX-License-Identifier: AGPL-3.0-only

import { afterEach, describe, expect, it } from "vitest";

import {
    PUBLIC_API_IP_RATE_LIMIT_PER_MINUTE,
    PUBLIC_API_WRITE_RATE_LIMIT_PER_HOUR,
    checkPublicApiIpRateLimit,
    checkPublicApiWriteRateLimit,
    publicApiRateLimitHeaders,
    readPublicApiClientIp,
    resetPublicApiRateLimitersForTests,
    setPublicApiRateLimitersForTests,
    type TPublicApiSlidingLimiter,
    type TPublicApiSlidingLimitResult,
} from "@/lib/public-api/public-api-rate-limit";

const RESET_AT = Date.parse("2026-09-21T18:00:00.000Z");

function requestWith(headers?: HeadersInit): Request {
    return new Request("http://localhost/api/v1/exercises", { headers });
}

function scripted(results: TPublicApiSlidingLimitResult[]): TPublicApiSlidingLimiter {
    const queue = [...results];
    return {
        async limit() {
            const next = queue.shift();
            if (!next) {
                throw new Error("unexpected limiter.limit()");
            }
            return next;
        },
    };
}

function allow(
    limit: number,
    remaining: number,
    extra?: Partial<TPublicApiSlidingLimitResult>,
): TPublicApiSlidingLimitResult {
    return { success: true, remaining, reset: RESET_AT, limit, ...extra };
}

function deny(limit: number): TPublicApiSlidingLimitResult {
    return { success: false, remaining: 0, reset: RESET_AT, limit };
}

afterEach(() => {
    resetPublicApiRateLimitersForTests();
});

describe("readPublicApiClientIp", () => {
    it("uses the first x-forwarded-for hop, then x-real-ip, then unknown", () => {
        expect(
            readPublicApiClientIp(
                requestWith({ "x-forwarded-for": "  1.2.3.4, 10.0.0.1", "x-real-ip": "9.9.9.9" }),
            ),
        ).toBe("1.2.3.4");
        expect(readPublicApiClientIp(requestWith({ "x-real-ip": " 9.9.9.9 " }))).toBe("9.9.9.9");
        expect(readPublicApiClientIp(requestWith())).toBe("unknown");
    });
});

describe("checkPublicApiIpRateLimit / checkPublicApiWriteRateLimit", () => {
    it("is 503 when Redis is not configured", async () => {
        setPublicApiRateLimitersForTests({ ip: null, write: null });

        const ip = await checkPublicApiIpRateLimit(requestWith());
        const write = await checkPublicApiWriteRateLimit("user-1");

        expect(ip).toEqual({ allowed: false, status: 503 });
        expect(write).toEqual({ allowed: false, status: 503 });
        expect(publicApiRateLimitHeaders(ip)).toEqual({});
    });

    it("is 503 when Redis errors or times out, including a timeout that the SDK marks success", async () => {
        setPublicApiRateLimitersForTests({
            ip: {
                async limit() {
                    throw new Error("redis down");
                },
            },
            write: scripted([
                allow(PUBLIC_API_WRITE_RATE_LIMIT_PER_HOUR, 19, { reason: "timeout" }),
            ]),
        });

        expect(await checkPublicApiIpRateLimit(requestWith())).toEqual({
            allowed: false,
            status: 503,
        });
        expect(await checkPublicApiWriteRateLimit("user-1")).toEqual({
            allowed: false,
            status: 503,
        });
    });

    it("allows an IP under 60/minute and a write under 20/hour", async () => {
        setPublicApiRateLimitersForTests({
            ip: scripted([allow(PUBLIC_API_IP_RATE_LIMIT_PER_MINUTE, 59)]),
            write: scripted([allow(PUBLIC_API_WRITE_RATE_LIMIT_PER_HOUR, 19)]),
        });

        const ip = await checkPublicApiIpRateLimit(requestWith({ "x-real-ip": "1.2.3.4" }));
        const write = await checkPublicApiWriteRateLimit("user-1");

        expect(ip).toEqual({
            allowed: true,
            limit: PUBLIC_API_IP_RATE_LIMIT_PER_MINUTE,
            remaining: 59,
            resetAt: RESET_AT,
        });
        expect(write).toEqual({
            allowed: true,
            limit: PUBLIC_API_WRITE_RATE_LIMIT_PER_HOUR,
            remaining: 19,
            resetAt: RESET_AT,
        });
        expect(publicApiRateLimitHeaders(ip)).toEqual({
            "X-RateLimit-Limit": "60",
            "X-RateLimit-Remaining": "59",
            "X-RateLimit-Reset": String(Math.ceil(RESET_AT / 1000)),
        });
    });

    it("is 429 with Retry-After when the IP or write window is exhausted", async () => {
        setPublicApiRateLimitersForTests({
            ip: scripted([deny(PUBLIC_API_IP_RATE_LIMIT_PER_MINUTE)]),
            write: scripted([deny(PUBLIC_API_WRITE_RATE_LIMIT_PER_HOUR)]),
        });

        const ip = await checkPublicApiIpRateLimit(requestWith());
        const write = await checkPublicApiWriteRateLimit("user-1");

        expect(ip).toMatchObject({
            allowed: false,
            status: 429,
            remaining: 0,
            limit: PUBLIC_API_IP_RATE_LIMIT_PER_MINUTE,
            resetAt: RESET_AT,
        });
        expect(write).toMatchObject({
            allowed: false,
            status: 429,
            remaining: 0,
            limit: PUBLIC_API_WRITE_RATE_LIMIT_PER_HOUR,
        });
        expect(publicApiRateLimitHeaders(ip)).toMatchObject({
            "Retry-After": expect.any(String),
            "X-RateLimit-Limit": "60",
            "X-RateLimit-Remaining": "0",
        });
    });
});
