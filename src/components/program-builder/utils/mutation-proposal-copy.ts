/**
 * @module mutation-proposal-copy
 *
 * Frozen-grid recipe lines for a **Mutation proposal** (ADR 0024 / 01).
 * Turns a **Program mutation batch** plus the current grid into the tree
 * the proposal card will render. Does not apply ops.
 *
 * Depends on: agentSchema (TAgentProgramOperation)
 * Used by: Mutation proposal card (slice 02)
 */

import type { TAgentProgramOperation } from "@/components/program-builder/mutations/agentSchema";
import { findDay } from "@/components/program-builder/mutations/locate";

const MISSING_NAME = "…";

export type TMutationProposalSetRow = {
    from: string;
    setLabel: string;
    to: string;
};

/** Frozen-grid row a recipe step can **Proposal jump** to. */
export type TProposalStepLocator = {
    builderExerciseKey?: number;
    dayOrder: number;
    exerciseIndex: number;
    folderId: number;
};

export type TMutationProposalAction = {
    kind: "action";
    locator?: TProposalStepLocator;
    text: string;
};

export type TMutationProposalExercise = {
    kind: "exercise";
    locator?: TProposalStepLocator;
    setRows: TMutationProposalSetRow[];
    title: string;
};

export type TMutationProposalStep = TMutationProposalAction | TMutationProposalExercise;

export type TMutationProposalDay = {
    heading: string;
    steps: TMutationProposalStep[];
};

export type TMutationProposalRecipe = {
    days: TMutationProposalDay[];
};

type TSetChange = {
    builderExerciseKey?: number;
    exerciseIndex: number;
    exerciseTitle: string;
    from: string;
    setIndex: number;
    to: string;
};

type TDayBucket = {
    actions: TMutationProposalAction[];
    dayOrder: number | undefined;
    dayTitle: string;
    folderId: number | null;
    setChanges: TSetChange[];
};

type TDraftDay = {
    dayOrder: number | undefined;
    dayTitle: string;
    steps: TMutationProposalStep[];
    weekNumbers: number[];
};

/**
 * Recipe tree for a **Program mutation batch** against the frozen grid.
 *
 * @param operations - Agent ops; streaming-partial entries must not throw
 * @param hevyProgram - Current (frozen) grid
 * @param catalog - Hevy template id → listed title; outgoing names come from here
 */
export function buildMutationProposalRecipe(
    operations: readonly TAgentProgramOperation[] | undefined,
    hevyProgram: THevyRoutine[],
    catalog?: ReadonlyMap<string, string>,
): TMutationProposalRecipe {
    if (!operations?.length) {
        return { days: [] };
    }

    const program = hevyProgram ?? [];
    const buckets = new Map<string, TDayBucket>();

    for (const operation of operations) {
        if (operation == null || typeof operation !== "object") {
            continue;
        }
        addOperationToBuckets(buckets, operation, operations, program, catalog);
    }

    return { days: mergeBuckets(Array.from(buckets.values()), program) };
}

function addOperationToBuckets(
    buckets: Map<string, TDayBucket>,
    operation: TAgentProgramOperation,
    operations: readonly TAgentProgramOperation[],
    program: THevyRoutine[],
    catalog?: ReadonlyMap<string, string>,
): void {
    switch (operation.op) {
        case "swap_exercise_template":
            addSwap(buckets, operation, program, catalog);
            return;
        case "insert_exercise":
            addNamedExerciseAction(buckets, operation, program, (title) => `Add ${title}`, catalog);
            return;
        case "delete_exercise":
            addIndexedExerciseAction(buckets, operation, program, (title) => `Remove ${title}`, catalog);
            return;
        case "edit_exercise":
            addReplaceExercise(buckets, operation, program, catalog);
            return;
        case "update_set":
            addUpdateSet(buckets, operation, operations, program, catalog);
            return;
        case "edit_day_title":
            addDayScopedAction(buckets, operation, program, (day) => {
                const from = displayDayTitle(day, operation.dayOrder);
                const to = readString(operation, "title") || MISSING_NAME;
                return `Rename ${from} to ${to}`;
            });
            return;
        case "delete_day":
            addDayScopedAction(buckets, operation, program, (day) => {
                return `Delete ${displayDayTitle(day, operation.dayOrder)}`;
            });
            return;
        case "delete_week":
            addDeleteWeek(buckets, operation);
            return;
        case "add_day":
            addAddDay(buckets, operation);
            return;
        case "add_day_notes":
            addDayScopedAction(buckets, operation, program, (day) => {
                return `Set notes on ${displayDayTitle(day, operation.dayOrder)}`;
            });
            return;
        case "add_exercise_notes":
            addIndexedExerciseAction(buckets, operation, program, (title) => `Set notes on ${title}`, catalog);
            return;
        case "create_superset":
            addCreateSuperset(buckets, operation, program, catalog);
            return;
        case "remove_from_superset":
            addIndexedExerciseAction(
                buckets,
                operation,
                program,
                (title) => `Remove ${title} from superset`,
                catalog,
            );
            return;
        default: {
            const _unused: never = operation;
            void _unused;
        }
    }
}

function addSwap(
    buckets: Map<string, TDayBucket>,
    operation: TAgentProgramOperation & { op: "swap_exercise_template" },
    program: THevyRoutine[],
    catalog?: ReadonlyMap<string, string>,
): void {
    const fromId = readString(operation, "from_exercise_template_id");
    const toId = readToTemplateId(operation);
    if (fromId && toId && fromId === toId) {
        return;
    }
    const toTitle = resolveListedTitle(toId, readToTitle(operation), catalog);
    const folderIds = optionalFolderIds(operation);
    const dayOrder = optionalDayOrder(operation);
    const days = program.filter((day) => {
        if (!dayInScope(day, folderIds, dayOrder)) {
            return false;
        }
        return day.exercises.some((exercise) => exercise.exercise_template_id === fromId);
    });
    const targets = days.length > 0 ? days : fallbackTargetDays(program, folderIds, dayOrder);
    for (const day of targets) {
        const fromTitle = resolveListedTitle(
            fromId,
            findFromTitleOnDay(day, fromId) || fromId,
            catalog,
        );
        if (fromTitle === toTitle) {
            continue;
        }
        const fromIndex = day.exercises.findIndex(
            (exercise) => exercise.exercise_template_id === fromId,
        );
        addAction(
            buckets,
            day,
            `Swap ${fromTitle} for ${toTitle}`,
            fromIndex >= 0 ? rowLocator(day, fromIndex) : undefined,
        );
    }
}

function addNamedExerciseAction(
    buckets: Map<string, TDayBucket>,
    operation: TAgentProgramOperation,
    program: THevyRoutine[],
    writeText: (title: string) => string,
    catalog?: ReadonlyMap<string, string>,
): void {
    const title = resolveListedTitle(
        readInsertedTemplateId(operation),
        readInsertedTitle(operation),
        catalog,
    );
    for (const day of targetDays(program, operation)) {
        addAction(buckets, day, writeText(title));
    }
}

function addIndexedExerciseAction(
    buckets: Map<string, TDayBucket>,
    operation: TAgentProgramOperation,
    program: THevyRoutine[],
    writeText: (title: string) => string,
    catalog?: ReadonlyMap<string, string>,
): void {
    const exerciseIndex = optionalIndex(operation, "exerciseIndex");
    for (const day of targetDays(program, operation)) {
        const exercise =
            exerciseIndex == null ? undefined : day.exercises[exerciseIndex];
        const title = resolveListedTitle(
            exercise?.exercise_template_id ?? "",
            displayExerciseTitle(exercise),
            catalog,
        );
        addAction(buckets, day, writeText(title), rowLocator(day, exerciseIndex));
    }
}

function addReplaceExercise(
    buckets: Map<string, TDayBucket>,
    operation: TAgentProgramOperation,
    program: THevyRoutine[],
    catalog?: ReadonlyMap<string, string>,
): void {
    const exerciseIndex = optionalIndex(operation, "exerciseIndex");
    const toTitle = resolveListedTitle(
        readInsertedTemplateId(operation),
        readInsertedTitle(operation),
        catalog,
    );
    for (const day of targetDays(program, operation)) {
        const exercise =
            exerciseIndex == null ? undefined : day.exercises[exerciseIndex];
        const fromTitle = resolveListedTitle(
            exercise?.exercise_template_id ?? "",
            displayExerciseTitle(exercise),
            catalog,
        );
        if (fromTitle === toTitle) {
            continue;
        }
        addAction(buckets, day, `Replace ${fromTitle} with ${toTitle}`, rowLocator(day, exerciseIndex));
    }
}

function addUpdateSet(
    buckets: Map<string, TDayBucket>,
    operation: TAgentProgramOperation & { op: "update_set" },
    operations: readonly TAgentProgramOperation[],
    program: THevyRoutine[],
    catalog?: ReadonlyMap<string, string>,
): void {
    const exerciseIndex = optionalIndex(operation, "exerciseIndex");
    const setIndex = optionalIndex(operation, "setIndex");
    if (exerciseIndex == null || setIndex == null) {
        return;
    }
    const patch = readSetPatch(operation);
    if (patch == null) {
        return;
    }

    for (const day of targetDays(program, operation)) {
        const exercise = day.exercises[exerciseIndex];
        const currentSet = exercise?.sets?.[setIndex];
        if (currentSet == null) {
            continue;
        }
        const changedFields = changedSetFields(currentSet, patch);
        if (changedFields.length === 0) {
            continue;
        }
        const nextSet: THevySets = { ...currentSet, ...patch };
        const from = formatSetAmount(currentSet, changedFields);
        const to = formatSetAmount(nextSet, changedFields);
        if (!from && !to) {
            continue;
        }
        const bucket = getBucket(buckets, day);
        bucket.setChanges.push({
            ...(isPositiveKey(exercise.builder_exercise_key)
                ? { builderExerciseKey: exercise.builder_exercise_key }
                : {}),
            exerciseIndex,
            exerciseTitle: resolveProposedExerciseTitle(exercise, day, operations, catalog),
            from,
            setIndex,
            to,
        });
    }
}

function addDayScopedAction(
    buckets: Map<string, TDayBucket>,
    operation: TAgentProgramOperation,
    program: THevyRoutine[],
    writeText: (day: THevyRoutine | undefined) => string,
): void {
    const targets = targetDays(program, operation);
    if (targets.length === 0) {
        const dayOrder = optionalDayOrder(operation);
        const folderIds = resolveFolderIds(program, optionalFolderIds(operation), dayOrder);
        for (const folderId of folderIds) {
            const synthetic = syntheticDay(folderId, dayOrder);
            addAction(buckets, synthetic, writeText(undefined));
        }
        return;
    }
    for (const day of targets) {
        addAction(buckets, day, writeText(day));
    }
}

function addDeleteWeek(
    buckets: Map<string, TDayBucket>,
    operation: TAgentProgramOperation,
): void {
    const folderIds = optionalFolderIds(operation);
    const folderId = folderIds?.[0];
    if (folderId == null || !Number.isFinite(folderId)) {
        addWeekOnlyAction(buckets, null, "Delete week");
        return;
    }
    addWeekOnlyAction(buckets, folderId, `Delete Week ${folderId + 1}`);
}

function addAddDay(
    buckets: Map<string, TDayBucket>,
    operation: TAgentProgramOperation,
): void {
    const folderIds = optionalFolderIds(operation);
    const folderId = folderIds?.[0];
    if (folderId == null || !Number.isFinite(folderId)) {
        addWeekOnlyAction(buckets, null, "Add day");
        return;
    }
    addWeekOnlyAction(buckets, folderId, "Add day");
}

function addWeekOnlyAction(
    buckets: Map<string, TDayBucket>,
    folderId: number | null,
    text: string,
): void {
    const day = syntheticDay(folderId, undefined);
    addAction(buckets, day, text);
    const bucket = buckets.get(dayKey(folderId, undefined));
    if (bucket) {
        bucket.dayTitle = "";
        bucket.dayOrder = undefined;
    }
}

function addCreateSuperset(
    buckets: Map<string, TDayBucket>,
    operation: TAgentProgramOperation,
    program: THevyRoutine[],
    catalog?: ReadonlyMap<string, string>,
): void {
    const indexes = readNumberArray(operation, "exerciseIndexes");
    for (const day of targetDays(program, operation)) {
        const names =
            indexes?.map((index) => {
                const exercise = day.exercises[index];
                return resolveListedTitle(
                    exercise?.exercise_template_id ?? "",
                    displayExerciseTitle(exercise),
                    catalog,
                );
            }) ?? [MISSING_NAME];
        addAction(
            buckets,
            day,
            `Create superset (${names.join(", ")})`,
            indexes?.[0] != null ? rowLocator(day, indexes[0]) : undefined,
        );
    }
}

function addAction(
    buckets: Map<string, TDayBucket>,
    day: THevyRoutine,
    text: string,
    locator?: TProposalStepLocator,
): void {
    getBucket(buckets, day).actions.push(
        locator ? { kind: "action", locator, text } : { kind: "action", text },
    );
}

function getBucket(buckets: Map<string, TDayBucket>, day: THevyRoutine): TDayBucket {
    const folderId = parseFolderId(day.folder_id);
    const dayOrder = parseDayOrder(day.order);
    const key = dayKey(folderId, dayOrder);
    const existing = buckets.get(key);
    if (existing) {
        return existing;
    }
    const created: TDayBucket = {
        actions: [],
        dayOrder,
        dayTitle: day.title?.trim() ?? "",
        folderId,
        setChanges: [],
    };
    buckets.set(key, created);
    return created;
}

function mergeBuckets(buckets: TDayBucket[], program: THevyRoutine[]): TMutationProposalDay[] {
    const drafts: TDraftDay[] = buckets
        .map((bucket) => ({
            dayOrder: bucket.dayOrder,
            dayTitle: bucket.dayTitle,
            steps: stepsForBucket(bucket),
            weekNumbers: bucket.folderId == null ? [] : [bucket.folderId + 1],
        }))
        .filter((draft) => draft.steps.length > 0);

    const groups: TDraftDay[] = [];
    for (const draft of drafts) {
        const match = groups.find(
            (group) =>
                group.dayTitle === draft.dayTitle &&
                group.dayOrder === draft.dayOrder &&
                stepsEqual(group.steps, draft.steps),
        );
        if (match) {
            match.weekNumbers.push(...draft.weekNumbers);
            continue;
        }
        groups.push({
            ...draft,
            weekNumbers: [...draft.weekNumbers],
        });
    }

    groups.sort((a, b) => {
        const weekDelta = minWeek(a.weekNumbers) - minWeek(b.weekNumbers);
        if (weekDelta !== 0) {
            return weekDelta;
        }
        return (a.dayOrder ?? 0) - (b.dayOrder ?? 0);
    });

    return groups.map((group) => ({
        heading: formatHeading(group.weekNumbers, group.dayTitle, program, group.dayOrder),
        steps: group.steps,
    }));
}

function minWeek(weekNumbers: number[]): number {
    return weekNumbers.length > 0 ? Math.min(...weekNumbers) : Number.POSITIVE_INFINITY;
}

function stepsForBucket(bucket: TDayBucket): TMutationProposalStep[] {
    const exercises = new Map<
        number,
        { changes: TSetChange[]; title: string }
    >();
    for (const change of bucket.setChanges) {
        const existing = exercises.get(change.exerciseIndex);
        if (existing) {
            existing.changes.push(change);
            continue;
        }
        exercises.set(change.exerciseIndex, {
            changes: [change],
            title: change.exerciseTitle,
        });
    }

    const exerciseSteps: TMutationProposalExercise[] = Array.from(exercises.entries())
        .sort(([a], [b]) => a - b)
        .map(([exerciseIndex, exercise]) => {
            const locator = rowLocatorFromBucket(
                bucket,
                exerciseIndex,
                exercise.changes[0]?.builderExerciseKey,
            );
            return {
                kind: "exercise" as const,
                ...(locator ? { locator } : {}),
                setRows: collapseSetRows(exercise.changes),
                title: exercise.title,
            };
        })
        .filter((step) => step.setRows.length > 0);

    return [...bucket.actions, ...exerciseSteps];
}

function collapseSetRows(changes: TSetChange[]): TMutationProposalSetRow[] {
    const sorted = [...changes].sort((a, b) => a.setIndex - b.setIndex);
    const collapsed: Array<{ end: number; from: string; start: number; to: string }> = [];

    for (const change of sorted) {
        const last = collapsed[collapsed.length - 1];
        if (
            last &&
            change.setIndex === last.end + 1 &&
            change.from === last.from &&
            change.to === last.to
        ) {
            last.end = change.setIndex;
            continue;
        }
        collapsed.push({
            end: change.setIndex,
            from: change.from,
            start: change.setIndex,
            to: change.to,
        });
    }

    return collapsed.map((row) => ({
        from: row.from,
        setLabel: row.start === row.end ? `Set ${row.start + 1}` : `Sets ${row.start + 1}-${row.end + 1}`,
        to: row.to,
    }));
}

function stepsEqual(a: TMutationProposalStep[], b: TMutationProposalStep[]): boolean {
    return JSON.stringify(a.map(stepWithoutLocator)) === JSON.stringify(b.map(stepWithoutLocator));
}

function stepWithoutLocator(step: TMutationProposalStep): TMutationProposalStep {
    if (step.kind === "action") {
        return { kind: "action", text: step.text };
    }
    return { kind: "exercise", setRows: step.setRows, title: step.title };
}

function rowLocator(day: THevyRoutine, exerciseIndex: number | undefined): TProposalStepLocator | undefined {
    if (exerciseIndex == null) {
        return undefined;
    }
    const exercise = day.exercises[exerciseIndex];
    if (exercise == null) {
        return undefined;
    }
    const folderId = parseFolderId(day.folder_id);
    const dayOrder = parseDayOrder(day.order);
    if (folderId == null || dayOrder == null) {
        return undefined;
    }
    return {
        ...(isPositiveKey(exercise.builder_exercise_key)
            ? { builderExerciseKey: exercise.builder_exercise_key }
            : {}),
        dayOrder,
        exerciseIndex,
        folderId,
    };
}

function rowLocatorFromBucket(
    bucket: TDayBucket,
    exerciseIndex: number,
    builderExerciseKey?: number,
): TProposalStepLocator | undefined {
    if (bucket.folderId == null || bucket.dayOrder == null) {
        return undefined;
    }
    return {
        ...(isPositiveKey(builderExerciseKey) ? { builderExerciseKey } : {}),
        dayOrder: bucket.dayOrder,
        exerciseIndex,
        folderId: bucket.folderId,
    };
}

function isPositiveKey(key: number | undefined): key is number {
    return typeof key === "number" && Number.isInteger(key) && key > 0;
}

function formatHeading(
    weekNumbers: number[],
    dayTitle: string,
    program: THevyRoutine[],
    dayOrder: number | undefined,
): string {
    const weekPart = formatWeeks(weekNumbers, program);
    const title = dayTitle.trim() || (dayOrder != null ? `Day ${dayOrder}` : "");
    if (!weekPart) {
        return title;
    }
    if (!title) {
        return weekPart;
    }
    return `${weekPart}, ${title}`;
}

function formatWeeks(weekNumbers: number[], program: THevyRoutine[]): string {
    const unique = Array.from(new Set(weekNumbers.filter((week) => Number.isFinite(week)))).sort(
        (a, b) => a - b,
    );
    if (unique.length === 0) {
        return "";
    }

    const programWeeks = uniqueFolderIds(program).map((id) => id + 1);
    const coversProgram =
        programWeeks.length > 0 &&
        programWeeks.every((week) => unique.includes(week)) &&
        unique.length === programWeeks.length;
    if (coversProgram && unique.length > 1) {
        return "All weeks";
    }

    if (unique.length === 1) {
        return `Week ${unique[0]}`;
    }
    return `Weeks ${formatWeekRanges(unique)}`;
}

function formatWeekRanges(weeks: number[]): string {
    const parts: string[] = [];
    let start = weeks[0];
    let prev = weeks[0];
    for (let i = 1; i <= weeks.length; i++) {
        const current = weeks[i];
        if (current === prev + 1) {
            prev = current;
            continue;
        }
        parts.push(start === prev ? `${start}` : `${start}-${prev}`);
        start = current;
        prev = current;
    }
    return parts.join(", ");
}

function targetDays(program: THevyRoutine[], operation: TAgentProgramOperation): THevyRoutine[] {
    const folderIds = resolveFolderIds(
        program,
        optionalFolderIds(operation),
        optionalDayOrder(operation),
    );
    const dayOrder = optionalDayOrder(operation);
    if (dayOrder == null) {
        return program.filter((day) => {
            const folderId = parseFolderId(day.folder_id);
            return folderId != null && folderIds.includes(folderId);
        });
    }
    return folderIds
        .map((folderId) => findDay(program, folderId, dayOrder))
        .filter((day): day is THevyRoutine => day != null);
}

function fallbackTargetDays(
    program: THevyRoutine[],
    folderIds: number[] | undefined,
    dayOrder: number | undefined,
): THevyRoutine[] {
    const resolved = resolveFolderIds(program, folderIds, dayOrder);
    if (dayOrder == null) {
        const days = program.filter((day) => {
            const folderId = parseFolderId(day.folder_id);
            return folderId != null && resolved.includes(folderId);
        });
        return days.length > 0 ? days : resolved.map((folderId) => syntheticDay(folderId, undefined));
    }
    return resolved.map((folderId) => {
        return findDay(program, folderId, dayOrder) ?? syntheticDay(folderId, dayOrder);
    });
}

function syntheticDay(folderId: number | null, dayOrder: number | undefined): THevyRoutine {
    return {
        id: "",
        title: dayOrder != null ? `Day ${dayOrder}` : "",
        folder_id: folderId,
        order: dayOrder != null ? String(dayOrder) : undefined,
        exercises: [],
        notes: "",
    };
}

function parseFolderId(folderId: number | null | undefined): number | null {
    return typeof folderId === "number" && Number.isFinite(folderId) ? folderId : null;
}

function parseDayOrder(order: string | undefined): number | undefined {
    if (order == null || order === "") {
        return undefined;
    }
    const parsed = Number(order);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function resolveFolderIds(
    program: THevyRoutine[],
    folderIds: number[] | undefined,
    dayOrder: number | undefined,
): number[] {
    if (folderIds?.length) {
        return folderIds;
    }
    return uniqueFolderIds(program, dayOrder);
}

function uniqueFolderIds(program: THevyRoutine[], dayOrder?: number): number[] {
    const ids = new Set<number>();
    for (const day of program) {
        if (dayOrder != null && Number(day.order) !== dayOrder) {
            continue;
        }
        const folderId = parseFolderId(day.folder_id);
        if (folderId != null) {
            ids.add(folderId);
        }
    }
    return Array.from(ids).sort((a, b) => a - b);
}

function dayInScope(
    day: THevyRoutine,
    folderIds: number[] | undefined,
    dayOrder: number | undefined,
): boolean {
    const folderId = parseFolderId(day.folder_id);
    if (folderIds?.length && (folderId == null || !folderIds.includes(folderId))) {
        return false;
    }
    if (dayOrder != null && Number(day.order) !== dayOrder) {
        return false;
    }
    return true;
}

function dayKey(folderId: number | null, dayOrder: number | undefined): string {
    return `${folderId ?? "unknown"}:${dayOrder ?? "*"}`;
}

function findFromTitleOnDay(day: THevyRoutine, fromId: string): string {
    const match = day.exercises.find((exercise) => exercise.exercise_template_id === fromId);
    return displayExerciseTitle(match, fromId);
}

function displayExerciseTitle(exercise: THevyExercise | undefined, fallback = "exercise"): string {
    const title = exercise?.title?.trim();
    if (title) {
        return title;
    }
    const templateId = exercise?.exercise_template_id?.trim();
    if (templateId) {
        return templateId;
    }
    return fallback || MISSING_NAME;
}

function displayDayTitle(day: THevyRoutine | undefined, dayOrder: number | undefined): string {
    const title = day?.title?.trim();
    if (title) {
        return title;
    }
    if (dayOrder != null) {
        return `Day ${dayOrder}`;
    }
    return "day";
}

function resolveProposedExerciseTitle(
    exercise: THevyExercise | undefined,
    day: THevyRoutine,
    operations: readonly TAgentProgramOperation[],
    catalog?: ReadonlyMap<string, string>,
): string {
    const frozen = resolveListedTitle(
        exercise?.exercise_template_id ?? "",
        displayExerciseTitle(exercise),
        catalog,
    );
    if (exercise == null) {
        return frozen;
    }
    for (const operation of operations) {
        if (operation?.op !== "swap_exercise_template") {
            continue;
        }
        const fromId = readString(operation, "from_exercise_template_id");
        if (!fromId || exercise.exercise_template_id !== fromId) {
            continue;
        }
        if (!dayInScope(day, optionalFolderIds(operation), optionalDayOrder(operation))) {
            continue;
        }
        return resolveListedTitle(readToTemplateId(operation), readToTitle(operation), catalog);
    }
    return frozen;
}

/**
 * Listed Hevy title for a template id. When the catalog is loaded, never use a
 * model-supplied name that is not on the list.
 */
function resolveListedTitle(
    templateId: string,
    payloadTitle: string,
    catalog?: ReadonlyMap<string, string>,
): string {
    const id = templateId.trim();
    if (id && catalog && catalog.size > 0) {
        const listed = catalog.get(id)?.trim();
        if (listed) {
            return listed;
        }
        return id;
    }
    return payloadTitle.trim() || id || MISSING_NAME;
}

function readToTitle(operation: TAgentProgramOperation): string {
    if (!("to" in operation) || operation.to == null || typeof operation.to !== "object") {
        return "";
    }
    const to = operation.to as { title?: unknown; exercise_template_id?: unknown };
    if (typeof to.title === "string" && to.title.trim()) {
        return to.title.trim();
    }
    if (typeof to.exercise_template_id === "string" && to.exercise_template_id.trim()) {
        return to.exercise_template_id.trim();
    }
    return "";
}

function readToTemplateId(operation: TAgentProgramOperation): string {
    if (!("to" in operation) || operation.to == null || typeof operation.to !== "object") {
        return "";
    }
    const to = operation.to as { exercise_template_id?: unknown };
    return typeof to.exercise_template_id === "string" ? to.exercise_template_id.trim() : "";
}

function readInsertedTemplateId(operation: TAgentProgramOperation): string {
    if (!("exercise" in operation) || operation.exercise == null || typeof operation.exercise !== "object") {
        return "";
    }
    const exercise = operation.exercise as { exercise_template_id?: unknown };
    return typeof exercise.exercise_template_id === "string"
        ? exercise.exercise_template_id.trim()
        : "";
}

function readInsertedTitle(operation: TAgentProgramOperation): string {
    if (!("exercise" in operation) || operation.exercise == null || typeof operation.exercise !== "object") {
        return "";
    }
    const exercise = operation.exercise as {
        title?: unknown;
        exercise_template_id?: unknown;
    };
    if (typeof exercise.title === "string" && exercise.title.trim()) {
        return exercise.title.trim();
    }
    if (
        typeof exercise.exercise_template_id === "string" &&
        exercise.exercise_template_id.trim()
    ) {
        return exercise.exercise_template_id.trim();
    }
    return "";
}

function readSetPatch(operation: TAgentProgramOperation): Partial<THevySets> | null {
    if (!("set" in operation) || operation.set == null || typeof operation.set !== "object") {
        return null;
    }
    return operation.set as Partial<THevySets>;
}

function readString(operation: TAgentProgramOperation, key: string): string {
    if (!(key in operation)) {
        return "";
    }
    const value = (operation as Record<string, unknown>)[key];
    return typeof value === "string" ? value : "";
}

function readNumberArray(operation: TAgentProgramOperation, key: string): number[] | undefined {
    if (!(key in operation)) {
        return undefined;
    }
    const value = (operation as Record<string, unknown>)[key];
    if (!Array.isArray(value)) {
        return undefined;
    }
    return value.filter((item): item is number => typeof item === "number" && Number.isFinite(item));
}

function optionalFolderIds(operation: TAgentProgramOperation): number[] | undefined {
    if (!("folderIds" in operation) || !Array.isArray(operation.folderIds)) {
        return undefined;
    }
    return operation.folderIds.filter((id): id is number => typeof id === "number" && Number.isFinite(id));
}

function optionalDayOrder(operation: TAgentProgramOperation): number | undefined {
    if (!("dayOrder" in operation) || typeof operation.dayOrder !== "number") {
        return undefined;
    }
    return Number.isFinite(operation.dayOrder) ? operation.dayOrder : undefined;
}

function optionalIndex(operation: TAgentProgramOperation, key: "exerciseIndex" | "setIndex"): number | undefined {
    if (!(key in operation)) {
        return undefined;
    }
    const value = (operation as Record<string, unknown>)[key];
    return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}

type TSetAmountField =
    | "custom_metric"
    | "distance_meters"
    | "duration_seconds"
    | "rep_range"
    | "reps"
    | "rpe"
    | "type"
    | "weight_kg";

function changedSetFields(current: THevySets, patch: Partial<THevySets>): TSetAmountField[] {
    const fields: TSetAmountField[] = [];
    if ("reps" in patch && patch.reps !== current.reps) {
        fields.push("reps");
    }
    if ("rep_range" in patch && !repRangesEqual(patch.rep_range, current.rep_range)) {
        fields.push("rep_range");
    }
    if ("weight_kg" in patch && patch.weight_kg !== current.weight_kg) {
        fields.push("weight_kg");
    }
    if ("rpe" in patch && patch.rpe !== current.rpe) {
        fields.push("rpe");
    }
    if ("distance_meters" in patch && patch.distance_meters !== current.distance_meters) {
        fields.push("distance_meters");
    }
    if ("duration_seconds" in patch && patch.duration_seconds !== current.duration_seconds) {
        fields.push("duration_seconds");
    }
    if ("custom_metric" in patch && patch.custom_metric !== current.custom_metric) {
        fields.push("custom_metric");
    }
    if ("type" in patch && patch.type !== current.type) {
        fields.push("type");
    }
    return fields;
}

function repRangesEqual(
    a: THevyRepRange | null | undefined,
    b: THevyRepRange | null | undefined,
): boolean {
    if (a == null && b == null) {
        return true;
    }
    if (a == null || b == null) {
        return false;
    }
    return a.start === b.start && a.end === b.end;
}

function formatSetAmount(set: THevySets, fields: TSetAmountField[]): string {
    const work: string[] = [];
    if (fields.includes("rep_range") && set.rep_range != null) {
        work.push(`${set.rep_range.start}-${set.rep_range.end} reps`);
    } else if (fields.includes("reps")) {
        work.push(`${set.reps ?? MISSING_NAME} reps`);
    }
    if (fields.includes("distance_meters")) {
        work.push(`${set.distance_meters ?? MISSING_NAME} m`);
    }
    if (fields.includes("duration_seconds")) {
        work.push(`${set.duration_seconds ?? MISSING_NAME} s`);
    }
    if (fields.includes("custom_metric")) {
        work.push(String(set.custom_metric ?? MISSING_NAME));
    }
    if (fields.includes("weight_kg")) {
        work.push(`${set.weight_kg ?? MISSING_NAME} kg`);
    }
    if (fields.includes("type") && set.type) {
        work.push(set.type);
    }
    const rpe = fields.includes("rpe") ? `RPE ${set.rpe ?? MISSING_NAME}` : "";
    if (work.length === 0) {
        return rpe;
    }
    if (rpe) {
        return `${work.join(", ")} @ ${rpe}`;
    }
    return work.join(", ");
}
