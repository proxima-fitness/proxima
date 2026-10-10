import { describe, expect, it } from "vitest";
import { formatUsageResetDate, withRenewsOn } from "@/lib/format-usage-reset-date";

describe("formatUsageResetDate", () => {
    it("formats YYYY-MM-DD as short month + day without shifting the calendar day", () => {
        expect(formatUsageResetDate("2026-08-01")).toBe(
            new Date(2026, 7, 1).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
            }),
        );
    });

    it("returns empty string for null/invalid", () => {
        expect(formatUsageResetDate(null)).toBe("");
        expect(formatUsageResetDate(undefined)).toBe("");
        expect(formatUsageResetDate("not-a-date")).toBe("");
    });
});

describe("withRenewsOn", () => {
    it("appends Renews on when resets_on is present", () => {
        const formatted = formatUsageResetDate("2026-08-01");
        expect(withRenewsOn("You have run out of credits.", "2026-08-01")).toBe(
            `You have run out of credits. Renews on ${formatted}.`,
        );
    });

    it("omits the renew sentence when resets_on is null (anonymous)", () => {
        expect(withRenewsOn("You have run out of credits.", null)).toBe(
            "You have run out of credits.",
        );
    });
});
