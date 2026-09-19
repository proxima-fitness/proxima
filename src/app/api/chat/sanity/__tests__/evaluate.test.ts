import { describe, expect, it, vi } from "vitest";

import { initializeConstraintProfile } from "@/app/api/chat/constraints/initialize";
import { initializeTrainingProfile } from "@/app/api/chat/training-profile";

import {
    applyEvaluatePolicy,
    CONSTRAINT_HONOR_MIN,
    evaluate,
    formatEvaluateMessage,
    TRAINING_MISS_MAX,
    USER_REQUESTED_YES_MIN,
} from "../evaluate";
import { userRequestedId } from "../questions";
import type { TProgramSanitySnapshot } from "../types";

function snapshotWithInjury(): TProgramSanitySnapshot {
    return {
        userMessage: "Build me a week",
        constraintProfile: initializeConstraintProfile({ healthIssues: "can't kneel" }),
        trainingProfile: null,
        weekIntents: [],
        changedDays: [{ week: 1, day: 1 }],
        matchingWeek1Days: [],
        matrix: [{
            week: 1,
            day: 1,
            title: "Lower",
            exercises: [{ title: "Kneeling lunge", workingSetCount: 3, rpeMin: 8, rpeMax: 8 }],
            matchesWeek1Stimulus: false,
        }],
    };
}

function snapshotThinDay(userMessage: string): TProgramSanitySnapshot {
    return {
        userMessage,
        constraintProfile: null,
        trainingProfile: initializeTrainingProfile({ sessionDurationMin: 60 }),
        weekIntents: [],
        changedDays: [{ week: 1, day: 1 }],
        matchingWeek1Days: [],
        matrix: [{
            week: 1,
            day: 1,
            title: "Quick",
            exercises: [{ title: "Curl", workingSetCount: 1, rpeMin: 6, rpeMax: 6 }],
            matchesWeek1Stimulus: false,
        }],
    };
}

describe("applyEvaluatePolicy", () => {
    it("rejects a Constraint miss (fail-any, fail-closed, no User-stated exception)", () => {
        const misses = applyEvaluatePolicy(
            {
                "constraint.injurySemantic": 0.1,
                [userRequestedId("constraint.injurySemantic")]: 0.99,
            },
            ["constraint.injurySemantic"],
            true,
        );

        expect(misses).toEqual([
            { id: "constraint.injurySemantic", detail: "does not honor constraint.injurySemantic" },
        ]);
    });

    it("rejects a low-confidence Constraint miss", () => {
        const noul = (CONSTRAINT_HONOR_MIN + TRAINING_MISS_MAX) / 2;
        expect(noul).toBeGreaterThan(TRAINING_MISS_MAX);
        expect(noul).toBeLessThan(CONSTRAINT_HONOR_MIN);

        const misses = applyEvaluatePolicy(
            { "constraint.injurySemantic": noul },
            ["constraint.injurySemantic"],
            true,
        );

        expect(misses).toHaveLength(1);
        expect(misses[0].id).toBe("constraint.injurySemantic");
    });

    it("passes a user-asked thin day", () => {
        const misses = applyEvaluatePolicy(
            {
                "skill.sessionShape": 0.05,
                [userRequestedId("skill.sessionShape")]: 0.92,
            },
            ["skill.sessionShape", userRequestedId("skill.sessionShape")],
            true,
        );

        expect(misses).toEqual([]);
        expect(0.92).toBeGreaterThanOrEqual(USER_REQUESTED_YES_MIN);
    });

    it("passes a low-confidence skill miss", () => {
        const noul = (CONSTRAINT_HONOR_MIN + TRAINING_MISS_MAX) / 2;
        const misses = applyEvaluatePolicy(
            { "skill.sessionShape": noul },
            ["skill.sessionShape"],
            true,
        );

        expect(misses).toEqual([]);
    });

    it("does not reject Training / skill on a standalone later mutation", () => {
        const misses = applyEvaluatePolicy(
            { "skill.sessionShape": 0.05 },
            ["skill.sessionShape"],
            false,
        );

        expect(misses).toEqual([]);
    });
});

describe("formatEvaluateMessage", () => {
    it("puts the question id on each line", () => {
        expect(formatEvaluateMessage([
            { id: "constraint.injurySemantic", detail: "does not honor constraint.injurySemantic" },
        ])).toBe("constraint.injurySemantic: does not honor constraint.injurySemantic");
    });
});

describe("evaluate", () => {
    it("rejects a Constraint miss from the mocked client", async () => {
        const postSystemOne = vi.fn(async () => ({
            "constraint.injurySemantic": 0.12,
        }));

        const result = await evaluate(snapshotWithInjury(), {
            andyAuthored: true,
            postSystemOne,
        });

        expect(postSystemOne).toHaveBeenCalledOnce();
        expect(result.ok).toBe(false);
        expect(result.misses[0]?.id).toBe("constraint.injurySemantic");
    });

    it("passes a user-asked thin day from the mocked client", async () => {
        const postSystemOne = vi.fn(async () => ({
            "training.sessionDurationFit": 0.9,
            [userRequestedId("training.sessionDurationFit")]: 0.1,
            "skill.sessionShape": 0.08,
            [userRequestedId("skill.sessionShape")]: 0.94,
            "skill.stimulusHonor": 0.9,
            [userRequestedId("skill.stimulusHonor")]: 0.1,
        }));

        const result = await evaluate(snapshotThinDay("Keep today to one curl, I asked for a short day"), {
            andyAuthored: true,
            postSystemOne,
        });

        expect(result.ok).toBe(true);
        expect(result.misses).toEqual([]);
    });

    it("fail-opens Jev questions when TypeSafe returns null (missing key / transport)", async () => {
        const postSystemOne = vi.fn(async () => null);
        const result = await evaluate(snapshotWithInjury(), {
            andyAuthored: true,
            postSystemOne,
        });

        expect(postSystemOne).toHaveBeenCalledOnce();
        expect(result).toEqual({ ok: true, misses: [] });
    });

    it("logs a Jev trace when debug is on", async () => {
        const log = vi.spyOn(console, "log").mockImplementation(() => {});
        const postSystemOne = vi.fn(async () => ({
            "constraint.injurySemantic": 0.12,
        }));

        const result = await evaluate(snapshotWithInjury(), {
            andyAuthored: true,
            debug: true,
            postSystemOne,
        });

        expect(result.ok).toBe(false);
        expect(log).toHaveBeenCalledWith(
            "[jev]",
            expect.objectContaining({
                ok: false,
                andyAuthored: true,
                nouls: { "constraint.injurySemantic": 0.12 },
                misses: [
                    { id: "constraint.injurySemantic", detail: "does not honor constraint.injurySemantic" },
                ],
            }),
        );
        expect(result.debug?.questionIds).toContain("constraint.injurySemantic");
        log.mockRestore();
    });

    it("does not log when debug is off", async () => {
        const log = vi.spyOn(console, "log").mockImplementation(() => {});

        await evaluate(snapshotWithInjury(), {
            andyAuthored: true,
            postSystemOne: async () => ({ "constraint.injurySemantic": 0.99 }),
        });

        expect(log).not.toHaveBeenCalled();
        log.mockRestore();
    });

    it("does not call TypeSafe when every premise is empty", async () => {
        const postSystemOne = vi.fn(async () => {
            throw new Error("should not call TypeSafe");
        });

        const result = await evaluate({
            userMessage: "",
            constraintProfile: null,
            trainingProfile: null,
            weekIntents: [],
            changedDays: [],
            matchingWeek1Days: [],
            matrix: [],
        }, {
            andyAuthored: true,
            postSystemOne,
        });

        expect(postSystemOne).not.toHaveBeenCalled();
        expect(result).toEqual({ ok: true, misses: [] });
    });
});
