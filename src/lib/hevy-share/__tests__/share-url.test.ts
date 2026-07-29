import { describe, expect, it } from "vitest";
import { formatHevyShareUrl, parseHevyShareUrl } from "@/lib/hevy-share/share-url";

describe("parseHevyShareUrl", () => {
    it("parses folder and routine share links", () => {
        expect(parseHevyShareUrl("https://hevy.com/folder/abc123")).toEqual({
            kind: "folder",
            folderId: "abc123",
        });
        expect(parseHevyShareUrl("https://hevy.com/routine/xY_z-9")).toEqual({
            kind: "routine",
            shortId: "xY_z-9",
        });
    });

    it("tolerates how links actually arrive in chat", () => {
        const target = { kind: "routine", shortId: "abc123" };

        expect(parseHevyShareUrl("hevy.com/routine/abc123")).toEqual(target);
        expect(parseHevyShareUrl("  https://www.hevy.com/routine/abc123/  ")).toEqual(target);
        expect(parseHevyShareUrl("http://hevy.com/routine/abc123?utm_source=ig#top")).toEqual(target);
        expect(parseHevyShareUrl("https://hevy.com/routine/abc123.")).toEqual(target);
        expect(parseHevyShareUrl("(https://hevy.com/routine/abc123)")).toEqual(target);
        expect(parseHevyShareUrl("https://HEVY.com/Routine/abc123")).toEqual(target);
    });

    it("rejects anything that is not a share link", () => {
        expect(parseHevyShareUrl("https://hevy.com/routine")).toBeNull();
        expect(parseHevyShareUrl("https://hevy.com/folder/abc/extra")).toBeNull();
        expect(parseHevyShareUrl("https://hevy.com/workout/abc123")).toBeNull();
        expect(parseHevyShareUrl("https://api.hevyapp.com/routine_with_short_id/abc123")).toBeNull();
        expect(parseHevyShareUrl("https://hevy.example.com/routine/abc123")).toBeNull();
        expect(parseHevyShareUrl("my push pull legs split")).toBeNull();
        expect(parseHevyShareUrl("")).toBeNull();
    });

    it("round-trips a parsed target back to a canonical url", () => {
        expect(formatHevyShareUrl({ kind: "folder", folderId: "abc123" })).toBe(
            "https://hevy.com/folder/abc123",
        );
        expect(formatHevyShareUrl(parseHevyShareUrl("www.hevy.com/routine/abc123/")!)).toBe(
            "https://hevy.com/routine/abc123",
        );
    });
});
