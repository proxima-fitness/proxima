import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

import type { TBodyMeasurementRow } from "@/api/body-measurements-read";
import { emptyUserConstraintProfileRecord } from "@/api/user-constraints";
import { emptyUserTrainingProfile } from "@/api/user-training-profile";

/** Force Popover path so content opens on click in jsdom. */
vi.mock("@/hooks/use-media-query", () => ({
    useMediaQuery: () => true,
}));

import { AgenticMemoryPeek } from "../AgenticMemoryPeek";

function measurement(
    overrides: Partial<TBodyMeasurementRow> = {},
): TBodyMeasurementRow {
    return {
        id: "bm-1",
        user_id: "user-1",
        source: "hevy",
        external_id: "2024-08-14",
        measured_on: "2024-08-14",
        weight_kg: 80.5,
        lean_mass_kg: null,
        fat_percent: null,
        neck_cm: null,
        shoulder_cm: null,
        chest_cm: null,
        left_bicep_cm: null,
        right_bicep_cm: null,
        left_forearm_cm: null,
        right_forearm_cm: null,
        abdomen: null,
        waist: null,
        hips: null,
        left_thigh: null,
        right_thigh: null,
        left_calf: null,
        right_calf: null,
        created_at: "2024-08-14T00:00:00Z",
        updated_at: "2024-08-14T00:00:00Z",
        ...overrides,
    };
}

function renderPeek(ui: ReactNode) {
    return render(ui);
}

function openPeek() {
    fireEvent.click(screen.getByRole("button", { name: "Agentic memory" }));
}

describe("AgenticMemoryPeek", () => {
    afterEach(() => {
        cleanup();
    });

    it("always renders the peek trigger (including empty)", () => {
        renderPeek(<AgenticMemoryPeek />);

        expect(screen.getByRole("button", { name: "Agentic memory" })).toBeTruthy();
    });

    it("shows loading spinner while parent loads", () => {
        renderPeek(<AgenticMemoryPeek isLoading />);
        openPeek();

        expect(document.querySelector(".animate-spin")).toBeTruthy();
    });

    it("shows empty copy and Edit profile link when all sections empty", () => {
        renderPeek(<AgenticMemoryPeek />);
        openPeek();

        expect(screen.getByText(/No agentic memory saved yet/i)).toBeTruthy();
        expect(screen.getByRole("link", { name: "Edit profile" })).toBeTruthy();
        expect(screen.queryByText("Constraint profile")).toBeNull();
        expect(screen.queryByRole("button", { name: "Save constraints" })).toBeNull();
    });

    it("renders accordion sections from fixtures and omits raw statements", () => {
        const constraints = emptyUserConstraintProfileRecord();
        constraints.injuries = ["knee"];
        constraints.excludedEquipment = ["Band"];
        constraints.preferences = {
            ...constraints.preferences,
            splitType: "ppl",
        };
        constraints.chatRefinements = ["no floor work"];
        constraints.rawStatements = ["user said no floor work — should stay hidden"];

        const training = {
            ...emptyUserTrainingProfile(),
            age: 28,
            trainingFocus: "bodybuilding" as const,
        };

        renderPeek(
            <AgenticMemoryPeek
                constraintProfile={constraints}
                trainingProfile={training}
                latestBodyMeasurement={measurement()}
                isInLbs
            />,
        );
        openPeek();

        expect(screen.getByText("knee")).toBeTruthy();
        expect(screen.getByText("Band")).toBeTruthy();
        expect(screen.getByText("PPL")).toBeTruthy();
        expect(screen.getByText("no floor work")).toBeTruthy();
        expect(
            screen.queryByText("user said no floor work — should stay hidden"),
        ).toBeNull();

        expect(screen.getByText("Constraint profile")).toBeTruthy();
        expect(screen.getByText("Training profile")).toBeTruthy();
        expect(screen.getByText("Body measurements")).toBeTruthy();
        expect(screen.getByRole("link", { name: "Edit profile" })).toBeTruthy();
    });

    it("opens first section with content by default (training when constraint empty)", () => {
        const training = {
            ...emptyUserTrainingProfile(),
            age: 30,
        };

        renderPeek(
            <AgenticMemoryPeek
                constraintProfile={null}
                trainingProfile={training}
                latestBodyMeasurement={null}
            />,
        );
        openPeek();

        const trainingTrigger = screen.getByText("Training profile").closest("button");
        expect(trainingTrigger?.getAttribute("data-state")).toBe("open");

        const constraintTrigger = screen.getByText("Constraint profile").closest("button");
        expect(constraintTrigger?.getAttribute("data-state")).toBe("closed");

        expect(screen.getByText("30")).toBeTruthy();

        fireEvent.click(constraintTrigger!);
        expect(screen.getByText("No constraints saved yet.")).toBeTruthy();
    });

    it("opens constraint by default when it has content", () => {
        const constraints = emptyUserConstraintProfileRecord();
        constraints.injuries = ["shoulder"];

        renderPeek(
            <AgenticMemoryPeek
                constraintProfile={constraints}
                trainingProfile={{
                    ...emptyUserTrainingProfile(),
                    age: 25,
                }}
            />,
        );
        openPeek();

        const constraintTrigger = screen.getByText("Constraint profile").closest("button");
        expect(constraintTrigger?.getAttribute("data-state")).toBe("open");
        expect(screen.getByText("shoulder")).toBeTruthy();
    });

    it("shows body one-liner when measurement present", () => {
        renderPeek(
            <AgenticMemoryPeek
                constraintProfile={null}
                trainingProfile={null}
                latestBodyMeasurement={measurement()}
                isInLbs
            />,
        );
        openPeek();

        const bodyTrigger = screen.getByText("Body measurements").closest("button");
        expect(bodyTrigger?.getAttribute("data-state")).toBe("open");
        expect(screen.getByText(/Aug/)).toBeTruthy();
    });

    it("omits body section when no measurement", () => {
        const constraints = emptyUserConstraintProfileRecord();
        constraints.injuries = ["knee"];

        renderPeek(
            <AgenticMemoryPeek
                constraintProfile={constraints}
                latestBodyMeasurement={null}
            />,
        );
        openPeek();

        expect(screen.queryByText("Body measurements")).toBeNull();
    });

    it("uses editProfileHref override", () => {
        const constraints = emptyUserConstraintProfileRecord();
        constraints.injuries = ["knee"];

        renderPeek(
            <AgenticMemoryPeek
                constraintProfile={constraints}
                editProfileHref="/profile/edit?from=peek"
            />,
        );
        openPeek();

        expect(screen.getByRole("link", { name: "Edit profile" }).getAttribute("href")).toBe(
            "/profile/edit?from=peek",
        );
    });
});
