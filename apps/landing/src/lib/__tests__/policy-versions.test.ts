// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from "vitest";

import {
    areVersionIdsCurrent,
    isLegalAcceptanceCurrent,
    selectCurrentPolicyVersions,
} from "@/lib/policy-versions";

const NOW = new Date("2026-06-17T12:00:00.000Z");

const rows: TPolicyVersionRow[] = [
    {
        id: "terms-old",
        document_type: "terms_of_use",
        version_label: "2024-01-25",
        effective_at: "2024-01-25T00:00:00.000Z",
    },
    {
        id: "terms-current",
        document_type: "terms_of_use",
        version_label: "2026-06-17",
        effective_at: "2026-06-17T00:00:00.000Z",
    },
    {
        id: "privacy-future",
        document_type: "privacy_policy",
        version_label: "2026-12-01",
        effective_at: "2026-12-01T00:00:00.000Z",
    },
    {
        id: "privacy-current",
        document_type: "privacy_policy",
        version_label: "2026-06-17",
        effective_at: "2026-06-17T00:00:00.000Z",
    },
];

describe("selectCurrentPolicyVersions", () => {
    it("returns latest effective row per document type", () => {
        const current = selectCurrentPolicyVersions(rows, NOW);

        expect(current).toEqual({
            terms: {
                id: "terms-current",
                versionLabel: "2026-06-17",
                effectiveAt: "2026-06-17T00:00:00.000Z",
            },
            privacy: {
                id: "privacy-current",
                versionLabel: "2026-06-17",
                effectiveAt: "2026-06-17T00:00:00.000Z",
            },
        });
    });

    it("ignores future-dated versions", () => {
        const current = selectCurrentPolicyVersions(rows, NOW);
        expect(current?.privacy.id).toBe("privacy-current");
    });

    it("returns null when a document type is missing", () => {
        const current = selectCurrentPolicyVersions(
            rows.filter((row) => row.document_type !== "privacy_policy"),
            NOW,
        );
        expect(current).toBeNull();
    });
});

describe("isLegalAcceptanceCurrent", () => {
    const current = selectCurrentPolicyVersions(rows, NOW)!;

    it("returns true when both FKs match current versions", () => {
        expect(
            isLegalAcceptanceCurrent(
                {
                    terms_version_id: "terms-current",
                    privacy_version_id: "privacy-current",
                },
                current,
            ),
        ).toBe(true);
    });

    it("returns false when either FK is stale", () => {
        expect(
            isLegalAcceptanceCurrent(
                {
                    terms_version_id: "terms-old",
                    privacy_version_id: "privacy-current",
                },
                current,
            ),
        ).toBe(false);
    });

    it("returns false when consents are missing", () => {
        expect(isLegalAcceptanceCurrent(null, current)).toBe(false);
    });
});

describe("areVersionIdsCurrent", () => {
    const current = selectCurrentPolicyVersions(rows, NOW)!;

    it("returns true for matching version IDs", () => {
        expect(areVersionIdsCurrent("terms-current", "privacy-current", current)).toBe(true);
    });

    it("returns false for stale version IDs", () => {
        expect(areVersionIdsCurrent("terms-old", "privacy-current", current)).toBe(false);
    });
});
