// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from "vitest";

import { buildOptionalConsentPatch } from "@/lib/user-consents";

const NOW = new Date("2026-06-17T12:00:00.000Z");

describe("buildOptionalConsentPatch", () => {
    it("sets opt-in timestamps when toggled on", () => {
        const patch = buildOptionalConsentPatch(
            {
                platformImprovementOptIn: true,
                marketingOptIn: true,
            },
            NOW,
        );

        expect(patch).toEqual({
            updated_at: "2026-06-17T12:00:00.000Z",
            platform_improvement_opt_in: true,
            platform_improvement_opt_in_at: "2026-06-17T12:00:00.000Z",
            marketing_opt_in: true,
            marketing_opt_in_at: "2026-06-17T12:00:00.000Z",
        });
    });

    it("clears opt-in timestamps when toggled off", () => {
        const patch = buildOptionalConsentPatch(
            {
                platformImprovementOptIn: false,
                marketingOptIn: false,
            },
            NOW,
        );

        expect(patch).toEqual({
            updated_at: "2026-06-17T12:00:00.000Z",
            platform_improvement_opt_in: false,
            platform_improvement_opt_in_at: null,
            marketing_opt_in: false,
            marketing_opt_in_at: null,
        });
    });

    it("only patches provided fields", () => {
        const patch = buildOptionalConsentPatch({ marketingOptIn: true }, NOW);

        expect(patch).toEqual({
            updated_at: "2026-06-17T12:00:00.000Z",
            marketing_opt_in: true,
            marketing_opt_in_at: "2026-06-17T12:00:00.000Z",
        });
        expect(patch.platform_improvement_opt_in).toBeUndefined();
    });
});
