// SPDX-License-Identifier: AGPL-3.0-only

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import {
    sampleQuestions,
    sampleQuestionsAdvanced,
    sampleQuestionsCore,
} from "@/assets/constants/form-options";
import { isAdvancedQuestion, Questions } from "../questions";

beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
});

afterEach(() => {
    cleanup();
});

describe("questionnaire catalogs", () => {
    it("core stays minimal; style prefs and Training profile live in advanced", () => {
        expect(sampleQuestionsCore.map((q) => q.id)).toEqual([
            "program-length",
            "days-per-week",
            "exclude-equipment",
            "health-issues",
        ]);
        expect(sampleQuestionsCore.every((q) => !isAdvancedQuestion(q))).toBe(true);
        expect(sampleQuestionsAdvanced.every(isAdvancedQuestion)).toBe(true);
        expect(sampleQuestionsAdvanced.some((q) => q.id === "exclude-areas")).toBe(true);
        expect(sampleQuestionsAdvanced.some((q) => q.id === "split-type")).toBe(true);
        expect(sampleQuestionsAdvanced.some((q) => q.id === "warmup-exercises")).toBe(true);
        expect(sampleQuestionsAdvanced.some((q) => q.id === "age")).toBe(true);
        expect(sampleQuestions).toHaveLength(
            sampleQuestionsCore.length + sampleQuestionsAdvanced.length,
        );
    });

    it("exclude-areas drops full body", () => {
        const excludeAreas = sampleQuestionsAdvanced.find((q) => q.id === "exclude-areas");
        expect(excludeAreas?.options.some((o) => o.id === "full body")).toBe(false);
        expect(excludeAreas?.options.some((o) => o.id === "legs")).toBe(true);
    });
});

describe("Questions core / advanced UI", () => {
    it("keeps advanced collapsed by default and allows empty advanced on Build", () => {
        const onComplete = vi.fn();
        render(
            <Questions
                questions={sampleQuestions}
                onComplete={onComplete}
            />,
        );

        expect(screen.getByTestId("questionnaire-advanced-trigger")).toBeTruthy();
        expect(screen.queryByText(/Age\?/)).toBeNull();
        expect(screen.queryByText(/Exclude muscle areas\?/)).toBeNull();
        expect(screen.queryByText(/Preferred split\?/)).toBeNull();
        expect(screen.getByText(/Program length\?/)).toBeTruthy();
        expect(screen.getByText(/Health issues to consider\?/)).toBeTruthy();

        fireEvent.click(screen.getByRole("button", { name: "Build program" }));
        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(onComplete.mock.calls[0][0]).not.toHaveProperty("age");
        expect(onComplete.mock.calls[0][0]).not.toHaveProperty("split-type");
    });

    it("expands advanced questions when trigger clicked", () => {
        render(<Questions questions={sampleQuestions} />);

        fireEvent.click(screen.getByTestId("questionnaire-advanced-trigger"));
        expect(screen.getByText(/Exclude muscle areas\?/)).toBeTruthy();
        expect(screen.getByText(/Preferred split\?/)).toBeTruthy();
        expect(screen.getByText(/Add warmup exercises\?/)).toBeTruthy();
        expect(screen.getByText(/Age\?/)).toBeTruthy();
        expect(screen.getByText(/Training focus\?/)).toBeTruthy();
        expect(screen.getByText(/Height\?/)).toBeTruthy();
    });

    it("renders age and session duration as dropdown Selects, not radio option buttons", () => {
        render(<Questions questions={sampleQuestions} />);

        fireEvent.click(screen.getByTestId("questionnaire-advanced-trigger"));

        expect(sampleQuestionsAdvanced.find((q) => q.id === "age")?.type).toBe("dropdown");
        expect(sampleQuestionsAdvanced.find((q) => q.id === "session-duration")?.type).toBe(
            "dropdown",
        );
        expect(screen.getByRole("combobox", { name: "Age?" })).toBeTruthy();
        expect(screen.getByRole("combobox", { name: "Session duration cap?" })).toBeTruthy();
        expect(screen.queryByRole("button", { name: "Select 14" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Select 28" })).toBeNull();
    });

    it("hides Skip when onSkip is omitted", () => {
        render(<Questions questions={sampleQuestionsCore.slice(0, 2)} />);
        expect(screen.queryByRole("button", { name: "Skip questionnaire" })).toBeNull();
    });

    it("shows Training profile questions without the advanced collapse and Save as the primary action", () => {
        const onComplete = vi.fn();
        const trainingQuestions = sampleQuestionsAdvanced.filter((q) =>
            ["age", "sex", "training-focus"].includes(q.id),
        );
        render(
            <Questions
                questions={trainingQuestions}
                completeAction="save"
                onComplete={onComplete}
            />,
        );

        expect(screen.queryByTestId("questionnaire-advanced-trigger")).toBeNull();
        expect(screen.getByText(/Age\?/)).toBeTruthy();
        expect(screen.getByRole("button", { name: "Save training profile" })).toBeTruthy();

        fireEvent.click(screen.getByRole("button", { name: "Save training profile" }));
        expect(onComplete).toHaveBeenCalledTimes(1);
    });
});
