// SPDX-License-Identifier: AGPL-3.0-only

import { beforeEach, describe, expect, it } from "vitest";
import {
    HEVY_SHARE_RATE_LIMIT_PER_HOUR,
    checkHevyShareRateLimit,
    hevyShareRateLimitKey,
    resetHevyShareRateLimits,
} from "@/lib/hevy-share/share-rate-limit";

const HOUR_MS = 60 * 60 * 1000;
const START = Date.parse("2026-07-29T10:00:00.000Z");

describe("hevyShareRateLimitKey", () => {
    it("prefers the signed-in user, falls back to IP, then to a shared anonymous bucket", () => {
        expect(hevyShareRateLimitKey({ userId: "user-1", ip: "1.2.3.4" })).toBe("user:user-1");
        expect(hevyShareRateLimitKey({ ip: "1.2.3.4" })).toBe("ip:1.2.3.4");
        expect(hevyShareRateLimitKey({ userId: "  ", ip: "" })).toBe("anonymous:unknown");
        expect(hevyShareRateLimitKey({})).toBe("anonymous:unknown");
    });
});

describe("checkHevyShareRateLimit", () => {
    beforeEach(() => {
        resetHevyShareRateLimits();
    });

    it("allows a fixed number of reads per hour", () => {
        for (let i = 1; i <= HEVY_SHARE_RATE_LIMIT_PER_HOUR; i++) {
            const result = checkHevyShareRateLimit("user:a", START);
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(HEVY_SHARE_RATE_LIMIT_PER_HOUR - i);
        }

        const blocked = checkHevyShareRateLimit("user:a", START);
        expect(blocked).toMatchObject({
            allowed: false,
            remaining: 0,
            limit: HEVY_SHARE_RATE_LIMIT_PER_HOUR,
            resetAt: START + HOUR_MS,
        });
    });

    it("keeps budgets separate per key", () => {
        for (let i = 0; i < HEVY_SHARE_RATE_LIMIT_PER_HOUR; i++) {
            checkHevyShareRateLimit("user:a", START);
        }

        expect(checkHevyShareRateLimit("user:a", START).allowed).toBe(false);
        expect(checkHevyShareRateLimit("ip:1.2.3.4", START).allowed).toBe(true);
    });

    it("does not let a throttled caller push their own reset out", () => {
        for (let i = 0; i < HEVY_SHARE_RATE_LIMIT_PER_HOUR + 5; i++) {
            checkHevyShareRateLimit("user:a", START);
        }

        expect(checkHevyShareRateLimit("user:a", START + HOUR_MS - 1).resetAt).toBe(START + HOUR_MS);
    });

    it("starts a fresh window once the hour has elapsed", () => {
        for (let i = 0; i < HEVY_SHARE_RATE_LIMIT_PER_HOUR; i++) {
            checkHevyShareRateLimit("user:a", START);
        }
        expect(checkHevyShareRateLimit("user:a", START + HOUR_MS - 1).allowed).toBe(false);

        const next = checkHevyShareRateLimit("user:a", START + HOUR_MS);
        expect(next.allowed).toBe(true);
        expect(next.remaining).toBe(HEVY_SHARE_RATE_LIMIT_PER_HOUR - 1);
        expect(next.resetAt).toBe(START + 2 * HOUR_MS);
    });
});
