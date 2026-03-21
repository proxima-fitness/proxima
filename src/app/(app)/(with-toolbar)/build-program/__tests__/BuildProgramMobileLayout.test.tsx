import { describe, it, expect, afterEach } from "vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { BuildProgramMobileLayout } from "@/app/(app)/(with-toolbar)/build-program/BuildProgramMobileLayout";

afterEach(() => {
    cleanup();
});

describe("build-program BuildProgramMobileLayout.tsx", () => {
    it("renders mobile container with expected height + ensures chat content uses min-h-0/overflow-hidden", () => {
        const { container } = render(
            <BuildProgramMobileLayout
                mobileTab="chat"
                onMobileTabChange={() => {}}
                hasProgramContent={true}
                chatPanel={null}
                routineContent={null}
            />
        );

        const root = container.firstElementChild;
        expect(root).toBeTruthy();

        const containerClass = root?.className ?? "";
        expect(containerClass).toContain("h-[calc(100vh-4rem)]");
        expect(containerClass).toContain("flex-col");

        const scrollable = container.querySelector("[class*='min-h-0']");
        expect(scrollable).toBeTruthy();

        const scrollableClass = scrollable?.className ?? "";
        expect(scrollableClass).toContain("min-h-0");
        expect(scrollableClass).toContain("overflow-hidden");
    });

    it("updates controlled tab state when switching Chat and Program (no forceMount; Radix may defer unmount until exit animation)", () => {
        function ControlledLayout() {
            const [mobileTab, setMobileTab] = useState("chat");
            return (
                <BuildProgramMobileLayout
                    mobileTab={mobileTab}
                    onMobileTabChange={setMobileTab}
                    hasProgramContent={true}
                    chatPanel={<span data-testid="chat-panel-marker">chat</span>}
                    routineContent={null}
                />
            );
        }

        render(<ControlledLayout />);
        expect(screen.getByRole("tab", { name: "Chat" }).getAttribute("data-state")).toBe("active");
        expect(screen.getByRole("tab", { name: "Program" }).getAttribute("data-state")).toBe("inactive");

        // Radix TabsTrigger commits selection on primary-button mousedown (not click alone in all environments).
        fireEvent.mouseDown(screen.getByRole("tab", { name: "Program" }), { button: 0 });
        expect(screen.getByRole("tab", { name: "Program" }).getAttribute("data-state")).toBe("active");
        expect(screen.getByRole("tab", { name: "Chat" }).getAttribute("data-state")).toBe("inactive");

        fireEvent.mouseDown(screen.getByRole("tab", { name: "Chat" }), { button: 0 });
        expect(screen.getByRole("tab", { name: "Chat" }).getAttribute("data-state")).toBe("active");
        expect(screen.getByTestId("chat-panel-marker")).toBeTruthy();
    });
});

