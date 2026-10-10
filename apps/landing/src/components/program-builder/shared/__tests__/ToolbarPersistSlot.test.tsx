/**
 * @module ToolbarPersistSlot
 *
 * One persist control: **Save** or **Start** (ADR 0016).
 */
import { describe, expect, it, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ToolbarPersistSlot } from "../ToolbarPortalButtons";

describe("ToolbarPersistSlot", () => {
    afterEach(() => {
        cleanup();
    });

    it("renders Save and not Start when the grid is unsaved or dirty", () => {
        render(
            <ToolbarPersistSlot
                onSave={() => undefined}
                saveDisabled={false}
                isSaving={false}
            />,
        );

        expect(screen.getByRole("button", { name: "Save program" })).toBeTruthy();
        expect(screen.queryByRole("link", { name: "Start" })).toBeNull();
    });

    it("renders Start and not Save when startHref is set", () => {
        render(
            <ToolbarPersistSlot
                onSave={() => undefined}
                saveDisabled
                isSaving={false}
                startHref="/profile?programId=9"
            />,
        );

        expect(screen.getByRole("link", { name: "Start" }).getAttribute("href")).toBe(
            "/profile?programId=9",
        );
        expect(screen.queryByRole("button", { name: "Save program" })).toBeNull();
    });

    it("renders Start disabled while Save is in flight", () => {
        render(
            <ToolbarPersistSlot
                onSave={() => undefined}
                saveDisabled
                isSaving
                persistMode="save"
            />,
        );

        expect(screen.getByRole("button", { name: "Start" })).toHaveProperty("disabled", true);
        expect(screen.queryByRole("link", { name: "Start" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Save program" })).toBeNull();
    });

    it("keeps Start disabled until Save finishes even if an href is already known", () => {
        render(
            <ToolbarPersistSlot
                onSave={() => undefined}
                saveDisabled
                isSaving
                persistMode="save"
                startHref="/profile?programId=9"
            />,
        );

        expect(screen.getByRole("button", { name: "Start" })).toHaveProperty("disabled", true);
        expect(screen.queryByRole("link", { name: "Start" })).toBeNull();
    });
});
