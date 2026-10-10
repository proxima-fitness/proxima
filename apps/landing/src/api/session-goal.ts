// SPDX-License-Identifier: AGPL-3.0-only

export type TSessionGoal = "strength" | "hypertrophy" | "endurance" | "mixed";

export const SESSION_GOAL_LABELS: Record<TSessionGoal, string> = {
    strength: "Strength",
    hypertrophy: "Hypertrophy",
    endurance: "Endurance",
    mixed: "Mixed",
};

export const SESSION_GOAL_TOOLTIPS: Record<TSessionGoal, string> = {
    strength:
        "This day focused on strength training to build maximal force with heavier loads.",
    hypertrophy:
        "This day focused on hypertrophy training to stimulate muscle growth.",
    endurance:
        "This day focused on endurance training to build muscular stamina and work capacity.",
    mixed:
        "This day blended strength, hypertrophy, and endurance training with no single dominant focus.",
};

type TRepZone = Exclude<TSessionGoal, "mixed">;

const REP_ZONES: TRepZone[] = ["strength", "hypertrophy", "endurance"];

function repZone(reps: number): TRepZone {
    if (reps <= 5) return "strength";
    if (reps <= 12) return "hypertrophy";
    return "endurance";
}

function isWorkingSet(set: THevySets): boolean {
    const type = (set.type || "normal").toLowerCase();
    return type !== "warmup" && set.reps != null && set.reps > 0;
}

/**
 * Infers session goal from working-set rep distribution on a logged workout.
 * Returns null when there are zero qualifying working sets.
 */
export function classifySessionGoal(
    day: Pick<THevyRoutine, "exercises">,
): TSessionGoal | null {
    const zoneReps: Record<TRepZone, number> = {
        strength: 0,
        hypertrophy: 0,
        endurance: 0,
    };

    for (const exercise of day.exercises ?? []) {
        for (const set of exercise.sets ?? []) {
            if (!isWorkingSet(set)) continue;
            zoneReps[repZone(set.reps!)] += set.reps!;
        }
    }

    const total = REP_ZONES.reduce((sum, zone) => sum + zoneReps[zone], 0);
    if (total === 0) return null;

    const ranked = REP_ZONES.map((zone) => [zone, zoneReps[zone]] as const).sort(
        (a, b) => b[1] - a[1],
    );
    const [topZone, topReps] = ranked[0];
    const secondReps = ranked[1]?.[1] ?? 0;

    if (topReps / total >= 0.5 && topReps > secondReps) {
        return topZone;
    }

    return "mixed";
}
