/**
 * Heuristic bodybuilding program scoring against editable volume landmarks and rules.
 * Narrative muscle volumes live in `.agents/skills/build-program/resources/bodybuilding.md`;
 * landmarks here are **scoring-tuned** and may differ (e.g. back/quads MEV) — see VOLUME_LANDMARKS.
 */

/** Maps TestResults UI: passed = green, okay = yellow, failed = red */
export type TProgramScoreStatus = "passed" | "okay" | "failed";

export interface IProgramScoreTest {
    id: string;
    name: string;
    status: TProgramScoreStatus;
    detail?: string;
}

export interface IProgramScoreSuite {
    id: string;
    name: string;
    tests: IProgramScoreTest[];
}

export interface IProgramScore {
    suites: IProgramScoreSuite[];
    summary: {
        passed: number;
        failed: number;
        okay: number;
        total: number;
    };
    emptyProgram: boolean;
    /** One-line for the model */
    headline: string;
}

/**
 * Weekly **working-set** landmarks for the scorecard (one scored week, intermediate-oriented).
 * Not sets×reps×weight. Intentionally separate from prose in `bodybuilding.md` where they differ
 * (e.g. back MEV 4–6 here vs 6–10 in markdown; quads MEV 6–8 here vs 4–6 in markdown) so we do not
 * silently change pass/fail for existing programs — align in a dedicated pass if desired.
 */
export const VOLUME_LANDMARKS: Record<
    string,
    { mev: readonly [number, number]; mav: readonly [number, number]; mrv: readonly [number, number] }
> = {
    chest: { mev: [4, 6], mav: [6, 16], mrv: [16, 24] },
    back: { mev: [4, 6], mav: [6, 16], mrv: [16, 24] },
    quads: { mev: [6, 8], mav: [8, 20], mrv: [20, 26] },
    hamstrings: { mev: [4, 6], mav: [6, 14], mrv: [14, 20] },
    glutes: { mev: [6, 8], mav: [8, 24], mrv: [24, 30] },
    biceps: { mev: [8, 10], mav: [14, 20], mrv: [20, 26] },
    triceps: { mev: [4, 6], mav: [6, 14], mrv: [14, 20] },
    shoulders: { mev: [6, 8], mav: [8, 20], mrv: [20, 26] },
};

/** Hevy `primary_muscle_group` values rolled into our landmark keys */
const MUSCLE_ALIAS: Record<string, keyof typeof VOLUME_LANDMARKS | null> = {
    chest: "chest",
    shoulders: "shoulders",
    biceps: "biceps",
    triceps: "triceps",
    quadriceps: "quads",
    hamstrings: "hamstrings",
    glutes: "glutes",
    lats: "back",
    upper_back: "back",
    lower_back: "back",
    traps: "back",
    abdominals: null,
    calves: null,
    forearms: null,
    cardio: null,
    neck: null,
    full_body: null,
    other: null,
    abductors: null,
    adductors: null,
};

function normalizeMuscleKey(primary: string | null | undefined): keyof typeof VOLUME_LANDMARKS | null {
    if (!primary) return null;
    const k = primary.toLowerCase().trim();
    return MUSCLE_ALIAS[k] ?? null;
}

function workingSetCount(sets: THevySets[] | undefined): number {
    if (!sets?.length) return 0;
    return sets.filter((s) => (s.type || "normal") !== "warmup").length;
}

/** RPE floor for “hypertrophy stimulus band” reporting (logged working sets only). */
export const STIMULUS_RPE_THRESHOLD = 6;

interface IStimulusCounts {
    workingSets: number;
    withRpe: number;
    hardSets: number;
    /** 0 < rpe < STIMULUS_RPE_THRESHOLD */
    lightSets: number;
    unspecifiedRpe: number;
}

/** All non-warmup sets in the scored week (every exercise), for RPE/stimulus reporting. */
function aggregateStimulusFromWeek(routines: THevyRoutine[]): IStimulusCounts {
    const out: IStimulusCounts = {
        workingSets: 0,
        withRpe: 0,
        hardSets: 0,
        lightSets: 0,
        unspecifiedRpe: 0,
    };
    for (const routine of routines) {
        for (const ex of routine.exercises ?? []) {
            for (const s of ex.sets ?? []) {
                if ((s.type || "normal") === "warmup") continue;
                out.workingSets += 1;
                const r = s.rpe;
                if (r == null || r <= 0) {
                    out.unspecifiedRpe += 1;
                    continue;
                }
                out.withRpe += 1;
                if (r >= STIMULUS_RPE_THRESHOLD) out.hardSets += 1;
                else out.lightSets += 1;
            }
        }
    }
    return out;
}

function scoreStimulusRpeLogging(c: IStimulusCounts): TProgramScoreStatus {
    if (c.workingSets === 0) return "okay";
    if (c.unspecifiedRpe === 0) return "passed";
    return "okay";
}

function scoreStimulusIntensityMix(c: IStimulusCounts): TProgramScoreStatus {
    if (c.workingSets === 0) return "okay";
    if (c.withRpe === 0) return "okay";
    return c.hardSets / c.withRpe >= 0.65 ? "passed" : "okay";
}

/** Effective reps for a set (first number in range for prescription). */
function effectiveReps(set: THevySets): number {
    const rr = set.rep_range;
    if (rr && rr.start > 0 && rr.end > 0) return Math.round((rr.start + rr.end) / 2);
    if (set.reps != null && set.reps > 0) return set.reps;
    return 10;
}

function repBucket(reps: number): "heavy" | "moderate" | "light" {
    if (reps <= 10) return "heavy";
    if (reps <= 20) return "moderate";
    return "light";
}

type TCategoryRule = {
    id: string;
    label: string;
    test: (normalizedTitle: string) => boolean;
};

function isChestHorizontal(t: string): boolean {
    if (/incline|flye|fly\b|pec deck|cross|cable cross/i.test(t)) return false;
    return /bench|push.?up|dip|chest press|machine press|smith|floor press|guillotine/i.test(t);
}

function isChestIncline(t: string): boolean {
    return /incline/i.test(t) && /press|bench|smith|machine|dumbbell|barbell/i.test(t);
}

function isChestIsolation(t: string): boolean {
    return /flye|fly\b|pec deck|crossover|cable cross/i.test(t);
}

const CHEST_CATEGORIES: TCategoryRule[] = [
    { id: "horizontal", label: "Horizontal press", test: (t) => isChestHorizontal(t) },
    { id: "incline", label: "Incline press", test: (t) => isChestIncline(t) },
    { id: "isolation", label: "Chest isolation", test: (t) => isChestIsolation(t) },
];

const BACK_CATEGORIES: TCategoryRule[] = [
    {
        id: "horizontal_pull",
        label: "Horizontal pull / row",
        test: (t) =>
            /row|t-?bar|seal|meadows|inverted|sled|pullover(?!.*lat)/i.test(t) &&
            !/face pull|shrug/i.test(t),
    },
    {
        id: "vertical_pull",
        label: "Vertical pull",
        test: (t) => /pull.?up|chin|pulldown|lat pulldown|assisted pull/i.test(t),
    },
];

/** Category coverage only for muscles where we have rules */
const MUSCLE_CATEGORY_RULES: Partial<Record<keyof typeof VOLUME_LANDMARKS, TCategoryRule[]>> = {
    chest: CHEST_CATEGORIES,
    back: BACK_CATEGORIES,
};

function normalizeTitle(title: string): string {
    return title.toLowerCase().replace(/\s+/g, " ").trim();
}

function scoreVolumeStatus(sets: number, lm: (typeof VOLUME_LANDMARKS)[string]): TProgramScoreStatus {
    const [mevLo] = lm.mev;
    const [, mavHi] = lm.mav;
    const [, mrvHi] = lm.mrv;
    if (sets === 0) return "failed";
    if (sets > mrvHi) return "failed";
    if (sets >= mevLo && sets <= mavHi) return "passed";
    if (sets > 0 && sets < mevLo) return "okay";
    return "okay";
}

function scoreFrequencyStatus(daysPerWeek: number): TProgramScoreStatus {
    if (daysPerWeek === 0) return "failed";
    if (daysPerWeek >= 6) return "failed";
    if (daysPerWeek >= 2 && daysPerWeek <= 4) return "passed";
    return "okay";
}

function scoreSessionSize(n: number): TProgramScoreStatus {
    if (n < 3 || n > 10) return "failed";
    if (n >= 5 && n <= 8) return "passed";
    return "okay";
}

function scoreRepVariety(buckets: { heavy: number; moderate: number; light: number }): TProgramScoreStatus {
    const kinds = [buckets.heavy > 0, buckets.moderate > 0, buckets.light > 0].filter(Boolean).length;
    const total = buckets.heavy + buckets.moderate + buckets.light;
    if (total === 0) return "okay";
    if (kinds === 1) return "failed";
    if (kinds >= 2 && buckets.moderate >= Math.max(buckets.heavy, buckets.light)) return "passed";
    if (kinds >= 2) return "okay";
    return "okay";
}

/**
 * Uses routines from a single week (minimum `folder_id`) to avoid multiplying volume when the grid has many weeks.
 */
export function getRoutinesForScoringWeek(program: THevyRoutine[]): THevyRoutine[] {
    if (!program.length) return [];
    let minFolder = Infinity;
    for (const r of program) {
        const f = r.folder_id ?? 0;
        if (f < minFolder) minFolder = f;
    }
    if (!Number.isFinite(minFolder)) minFolder = 0;
    return program.filter((r) => (r.folder_id ?? 0) === minFolder);
}

interface IMuscleAgg {
    workingSets: number;
    /** distinct day indices (routine order) */
    days: Set<number>;
}

/**
 * Score the current program for bodybuilding heuristics.
 * @param program - Full `THevyRoutine[]` from the builder
 * @param exerciseTemplates - From `getHevyExercises()` (id -> metadata)
 */
export function scoreProgramForBodybuilding(
    program: THevyRoutine[],
    exerciseTemplates: THevyExerciseTemplate[],
): IProgramScore {
    const idToTemplate = new Map<string, THevyExerciseTemplate>();
    for (const ex of exerciseTemplates) {
        if (ex?.id) idToTemplate.set(ex.id, ex);
    }

    const weekRoutines = getRoutinesForScoringWeek(program);
    if (weekRoutines.length === 0) {
        return {
            suites: [],
            summary: { passed: 0, failed: 0, okay: 0, total: 0 },
            emptyProgram: true,
            headline: "No program loaded — add or generate a program first.",
        };
    }

    const stimulus = aggregateStimulusFromWeek(weekRoutines);

    const byMuscle: Partial<Record<keyof typeof VOLUME_LANDMARKS, IMuscleAgg>> = {};
    const repBuckets = { heavy: 0, moderate: 0, light: 0 };
    const categoryHits: Partial<Record<keyof typeof VOLUME_LANDMARKS, Set<string>>> = {};

    const routinesOrdered = [...weekRoutines].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
    let dayIndex = 0;
    for (const routine of routinesOrdered) {
        const exercises = routine.exercises ?? [];
        for (const ex of exercises) {
            const tmpl = idToTemplate.get(ex.exercise_template_id);
            const primary = tmpl?.primary_muscle_group;
            const key = normalizeMuscleKey(primary);
            const ws = workingSetCount(ex.sets);
            if (key && ws > 0) {
                if (!byMuscle[key]) byMuscle[key] = { workingSets: 0, days: new Set() };
                const agg = byMuscle[key]!;
                agg.workingSets += ws;
                agg.days.add(dayIndex);
                for (const s of ex.sets ?? []) {
                    if ((s.type || "normal") === "warmup") continue;
                    const b = repBucket(effectiveReps(s));
                    if (b === "heavy") repBuckets.heavy += 1;
                    else if (b === "moderate") repBuckets.moderate += 1;
                    else repBuckets.light += 1;
                }
            }
            const title = normalizeTitle(tmpl?.title ?? ex.title ?? "");
            if (key && MUSCLE_CATEGORY_RULES[key]) {
                if (!categoryHits[key]) categoryHits[key] = new Set();
                const rules = MUSCLE_CATEGORY_RULES[key]!;
                for (const rule of rules) {
                    if (rule.test(title)) categoryHits[key]!.add(rule.id);
                }
            }
        }
        dayIndex += 1;
    }

    const suites: IProgramScoreSuite[] = [];

    const volumeTests: IProgramScoreTest[] = [];
    for (const muscle of Object.keys(VOLUME_LANDMARKS) as (keyof typeof VOLUME_LANDMARKS)[]) {
        const lm = VOLUME_LANDMARKS[muscle];
        const agg = byMuscle[muscle];
        const sets = agg?.workingSets ?? 0;
        const st = scoreVolumeStatus(sets, lm);
        volumeTests.push({
            id: `volume-${muscle}`,
            name: `${muscle.charAt(0).toUpperCase() + muscle.slice(1)} volume`,
            status: st,
            detail:
                sets === 0
                    ? "No direct volume this week"
                    : `${sets} hypertrophy-intended working sets/wk (MEV–MAV ~${lm.mev[0]}–${lm.mav[1]}, MRV ~${lm.mrv[1]}); set counts, not tonnage`,
        });
    }
    suites.push({ id: "volume", name: "Weekly volume (working sets)", tests: volumeTests });

    const stimDetailRpe =
        stimulus.workingSets === 0
            ? "No working sets in the scored week."
            : stimulus.unspecifiedRpe === 0
              ? `${stimulus.workingSets} working sets — all have target RPE logged.`
              : `${stimulus.workingSets} working sets — ${stimulus.withRpe} with target RPE, ${stimulus.unspecifiedRpe} without RPE. Add target RPE on each working set for a clearer stimulus check.`;

    const stimDetailMix =
        stimulus.workingSets === 0
            ? "No working sets to evaluate."
            : stimulus.withRpe === 0
              ? `Log target RPE on working sets to see how many land in the hypertrophy band (RPE ${STIMULUS_RPE_THRESHOLD}+). Missing RPE does not change weekly set-count scoring.`
              : `${stimulus.hardSets} of ${stimulus.withRpe} logged sets at RPE ≥${STIMULUS_RPE_THRESHOLD}; ${stimulus.lightSets} below (${STIMULUS_RPE_THRESHOLD - 1} or lower) — expected for deloads, technique, or easy work.`;

    suites.push({
        id: "stimulus",
        name: "Stimulus coverage (RPE)",
        tests: [
            {
                id: "stimulus-rpe-logging",
                name: "Target RPE on working sets",
                status: scoreStimulusRpeLogging(stimulus),
                detail: stimDetailRpe,
            },
            {
                id: "stimulus-intensity-mix",
                name: `Hypertrophy stimulus band (RPE ≥${STIMULUS_RPE_THRESHOLD})`,
                status: scoreStimulusIntensityMix(stimulus),
                detail: stimDetailMix,
            },
        ],
    });

    const freqTests: IProgramScoreTest[] = [];
    for (const muscle of Object.keys(VOLUME_LANDMARKS) as (keyof typeof VOLUME_LANDMARKS)[]) {
        const agg = byMuscle[muscle];
        const d = agg?.days.size ?? 0;
        freqTests.push({
            id: `freq-${muscle}`,
            name: `${muscle.charAt(0).toUpperCase() + muscle.slice(1)} frequency`,
            status: scoreFrequencyStatus(d),
            detail: d === 0 ? "Not trained this week" : `${d} session(s)/wk (typical target 2–4)`,
        });
    }
    suites.push({ id: "frequency", name: "Training frequency", tests: freqTests });

    const catTests: IProgramScoreTest[] = [];
    for (const muscle of Object.keys(MUSCLE_CATEGORY_RULES) as (keyof typeof MUSCLE_CATEGORY_RULES)[]) {
        const rules = MUSCLE_CATEGORY_RULES[muscle]!;
        const hit = categoryHits[muscle] ?? new Set();
        const missing = rules.filter((r) => !hit.has(r.id));
        let status: TProgramScoreStatus = "passed";
        if (missing.length >= 2) status = "failed";
        else if (missing.length === 1) status = "okay";
        if ((byMuscle[muscle]?.workingSets ?? 0) === 0) {
            status = "okay";
        }
        catTests.push({
            id: `cat-${muscle}`,
            name: `${muscle.charAt(0).toUpperCase() + muscle.slice(1)} exercise categories`,
            status,
            detail:
                missing.length === 0
                    ? "Movement categories look covered"
                    : `Missing: ${missing.map((m) => m.label).join("; ")}`,
        });
    }
    suites.push({ id: "categories", name: "Exercise category coverage", tests: catTests });

    const rvStatus = scoreRepVariety(repBuckets);
    suites.push({
        id: "rep_ranges",
        name: "Rep range variety",
        tests: [
            {
                id: "rep-mix",
                name: "Heavy / moderate / light mix",
                status: rvStatus,
                detail: `Heavy ≤10: ${repBuckets.heavy}, moderate 11–20: ${repBuckets.moderate}, light 21+: ${repBuckets.light} (working sets)`,
            },
        ],
    });

    const sessionTests: IProgramScoreTest[] = [];
    for (const routine of routinesOrdered) {
        const n = (routine.exercises ?? []).length;
        const label = routine.title?.trim() || `Day ${routine.order ?? "?"}`;
        sessionTests.push({
            id: `session-${routine.id}`,
            name: label,
            status: scoreSessionSize(n),
            detail: `${n} exercise row(s) (target often ~6–7 including warmups)`,
        });
    }
    suites.push({ id: "session_size", name: "Session size", tests: sessionTests });

    let passed = 0;
    let failed = 0;
    let okay = 0;
    for (const s of suites) {
        for (const t of s.tests) {
            if (t.status === "passed") passed++;
            else if (t.status === "failed") failed++;
            else okay++;
        }
    }
    const total = passed + failed + okay;

    const headline = `Report: ${passed} good, ${okay} could improve, ${failed} need attention (${total} checks).`;

    return {
        suites,
        summary: { passed, failed, okay, total },
        emptyProgram: false,
        headline,
    };
}
