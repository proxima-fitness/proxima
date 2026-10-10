// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from "vitest";
import { PROXIMA_FITNESS_EXPORT_URL, routineNotesForExport } from "../proximaExportAttribution";

describe("routineNotesForExport", () => {
    const line = `Built by Proxima · ${PROXIMA_FITNESS_EXPORT_URL}`;

    it("returns attribution only when notes are empty or undefined", () => {
        expect(routineNotesForExport(undefined)).toBe(line);
        expect(routineNotesForExport("")).toBe(line);
        expect(routineNotesForExport("   ")).toBe(line);
    });

    it("appends attribution after user notes with blank line separator", () => {
        expect(routineNotesForExport("Deload week focus")).toBe(`Deload week focus\n\n${line}`);
    });

    it("trims whitespace on user notes before appending", () => {
        expect(routineNotesForExport("  Hello  ")).toBe(`Hello\n\n${line}`);
    });

    it("is idempotent when URL is already present", () => {
        const once = routineNotesForExport("My note");
        expect(routineNotesForExport(once)).toBe(once);
    });
});
