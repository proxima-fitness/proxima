import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import type { ReactNode } from "react";

import { emptyUserTrainingProfile } from "@/api/user-training-profile";

const useUserTrainingProfile = vi.fn();
const saveUserTrainingProfile = vi.fn();

vi.mock("@/api/hooks", () => ({
    useUserTrainingProfile: (...args: unknown[]) => useUserTrainingProfile(...args),
}));

vi.mock("@/api/user-training-profile", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/user-training-profile")>();
    return {
        ...actual,
        saveUserTrainingProfile: (...args: unknown[]) =>
            saveUserTrainingProfile(...args),
    };
});

vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

import { TrainingProfileSection } from "../TrainingProfileSection";
import {
    TRAINING_ACTIVITY_LEVEL_OPTIONS,
    TRAINING_EXPERIENCE_OPTIONS,
    TRAINING_FOCUS_OPTIONS,
    TRAINING_PHYSIQUE_PHASE_OPTIONS,
} from "../training-profile-options";

const user = { id: "user-1" } as User;

function renderSection(
    ui: ReactNode,
    client: QueryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    }),
) {
    return render(
        <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
    );
}

async function chooseSelectOption(triggerId: string, optionLabel: string) {
    const trigger = document.getElementById(triggerId);
    expect(trigger).toBeTruthy();
    fireEvent.click(trigger!);
    const option = await screen.findByRole("option", { name: optionLabel });
    fireEvent.click(option);
}

describe("training-profile-options catalogs", () => {
    it("matches CONTEXT closed lists", () => {
        expect(TRAINING_EXPERIENCE_OPTIONS.map((o) => o.value)).toEqual([
            "beginner",
            "novice",
            "intermediate",
            "advanced",
        ]);
        expect(TRAINING_PHYSIQUE_PHASE_OPTIONS.map((o) => o.value)).toEqual([
            "bulk",
            "cut",
            "maintain",
            "recomp",
        ]);
        expect(TRAINING_FOCUS_OPTIONS.map((o) => o.value)).toEqual([
            "bodybuilding",
            "powerbuilding",
            "powerlifting",
            "hyrox",
            "crossfit",
            "olympic_weightlifting",
            "calisthenics_bodyweight",
            "athletics_sport",
            "fat_loss",
            "general_fitness",
            "rehab_pain_aware",
        ]);
        expect(TRAINING_ACTIVITY_LEVEL_OPTIONS.map((o) => o.value)).toEqual([
            "sedentary",
            "light",
            "moderate",
            "high",
            "extreme",
        ]);
    });
});

describe("TrainingProfileSection", () => {
    beforeEach(() => {
        useUserTrainingProfile.mockReset();
        saveUserTrainingProfile.mockReset();
        saveUserTrainingProfile.mockResolvedValue(undefined);
        Element.prototype.scrollIntoView = vi.fn();
    });

    afterEach(() => {
        cleanup();
    });

    it("shows loading spinner while profile loads", () => {
        useUserTrainingProfile.mockReturnValue({
            data: undefined,
            isLoading: true,
            isError: false,
        });

        renderSection(<TrainingProfileSection user={user} />);

        expect(document.querySelector(".animate-spin")).toBeTruthy();
        expect(
            screen.queryByRole("button", { name: "Save training profile" }),
        ).toBeNull();
    });

    it("shows editor with empty draft when no row", () => {
        useUserTrainingProfile.mockReturnValue({
            data: null,
            isLoading: false,
            isError: false,
        });

        renderSection(<TrainingProfileSection user={user} />);

        expect(screen.getByTestId("training-profile-editor")).toBeTruthy();
        expect(
            (screen.getByRole("button", { name: "Save training profile" }) as HTMLButtonElement)
                .disabled,
        ).toBe(true);
    });

    it("reports dirty after experience change and saves canonical profile", async () => {
        useUserTrainingProfile.mockReturnValue({
            data: emptyUserTrainingProfile(),
            isLoading: false,
            isError: false,
        });

        const onDirtyChange = vi.fn();
        const onSaveSuccess = vi.fn();

        renderSection(
            <TrainingProfileSection
                user={user}
                onDirtyChange={onDirtyChange}
                onSaveSuccess={onSaveSuccess}
            />,
        );

        await chooseSelectOption("training-experience", "Intermediate");

        expect(onDirtyChange).toHaveBeenCalledWith(true);
        expect(
            (screen.getByRole("button", { name: "Save training profile" }) as HTMLButtonElement)
                .disabled,
        ).toBe(false);

        fireEvent.click(screen.getByRole("button", { name: "Save training profile" }));

        await waitFor(() => {
            expect(saveUserTrainingProfile).toHaveBeenCalledWith(
                "user-1",
                expect.objectContaining({
                    experienceLevel: "intermediate",
                }),
            );
        });

        await waitFor(() => {
            expect(onSaveSuccess).toHaveBeenCalled();
            expect(onDirtyChange).toHaveBeenCalledWith(false);
        });
    });

    it("saves prefer-not-to-say sex as empty string", async () => {
        useUserTrainingProfile.mockReturnValue({
            data: { ...emptyUserTrainingProfile(), sex: "male" },
            isLoading: false,
            isError: false,
        });

        renderSection(<TrainingProfileSection user={user} />);

        await chooseSelectOption("training-sex", "Prefer not to say");
        fireEvent.click(screen.getByRole("button", { name: "Save training profile" }));

        await waitFor(() => {
            expect(saveUserTrainingProfile).toHaveBeenCalledWith(
                "user-1",
                expect.objectContaining({ sex: "" }),
            );
        });
    });

    it("saves metric height as canonical cm", async () => {
        useUserTrainingProfile.mockReturnValue({
            data: emptyUserTrainingProfile(),
            isLoading: false,
            isError: false,
        });

        renderSection(<TrainingProfileSection user={user} />);

        await chooseSelectOption("training-height-cm", "180 cm");
        fireEvent.click(screen.getByRole("button", { name: "Save training profile" }));

        await waitFor(() => {
            expect(saveUserTrainingProfile).toHaveBeenCalledWith(
                "user-1",
                expect.objectContaining({ heightCm: 180 }),
            );
        });
    });

    it("converts imperial height to cm on save", async () => {
        useUserTrainingProfile.mockReturnValue({
            data: emptyUserTrainingProfile(),
            isLoading: false,
            isError: false,
        });

        renderSection(<TrainingProfileSection user={user} />);

        fireEvent.click(screen.getByRole("radio", { name: "Imperial" }));

        await chooseSelectOption("training-height-ft", "5 ft");
        await chooseSelectOption("training-height-in", "10 in");

        fireEvent.click(screen.getByRole("button", { name: "Save training profile" }));

        await waitFor(() => {
            expect(saveUserTrainingProfile).toHaveBeenCalledWith(
                "user-1",
                expect.objectContaining({ heightCm: 178 }),
            );
        });
    });

    it("Reset restores baseline without saving", async () => {
        useUserTrainingProfile.mockReturnValue({
            data: { ...emptyUserTrainingProfile(), experienceLevel: "beginner" },
            isLoading: false,
            isError: false,
        });

        const onDirtyChange = vi.fn();
        renderSection(
            <TrainingProfileSection user={user} onDirtyChange={onDirtyChange} />,
        );

        await chooseSelectOption("training-experience", "Advanced");
        expect(onDirtyChange).toHaveBeenCalledWith(true);

        fireEvent.click(screen.getByRole("button", { name: "Reset" }));

        expect(
            (screen.getByRole("button", { name: "Save training profile" }) as HTMLButtonElement)
                .disabled,
        ).toBe(true);
        expect(onDirtyChange).toHaveBeenCalledWith(false);
        expect(saveUserTrainingProfile).not.toHaveBeenCalled();
        expect(document.getElementById("training-experience")?.textContent).toContain(
            "Beginner",
        );
    });
});
