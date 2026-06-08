import { mutationFailure, type TMutationResult, mutationSuccess } from "./types";

export function requireNonEmptyFolderIds(folderIds: number[] | undefined): TMutationResult | null {
    if (!folderIds || folderIds.length === 0) {
        return mutationFailure("folderIds must not be empty");
    }
    return null;
}

export function requireSingleFolderId(folderIds: number[]): TMutationResult | null {
    if (folderIds.length !== 1) {
        return mutationFailure("folderIds must contain exactly one week");
    }
    return null;
}

export function requireValidDayOrder(dayOrder: number | undefined): TMutationResult | null {
    if (dayOrder === undefined || dayOrder === null || !Number.isFinite(dayOrder) || dayOrder < 1) {
        return mutationFailure("dayOrder must be a 1-based positive integer");
    }
    return null;
}

export function findDay(
    program: THevyRoutine[],
    folderId: number,
    dayOrder: number,
): THevyRoutine | undefined {
    return program.find(
        (day) => Number(day.folder_id) === folderId && Number(day.order) === dayOrder,
    );
}

export function findDayById(program: THevyRoutine[], dayId: string): THevyRoutine | undefined {
    return program.find((day) => day.id === dayId);
}

export function locateDays(
    program: THevyRoutine[],
    folderIds: number[],
    dayOrder: number,
): TMutationResult {
    const folderFailure = requireNonEmptyFolderIds(folderIds);
    if (folderFailure) return folderFailure;

    const dayOrderFailure = requireValidDayOrder(dayOrder);
    if (dayOrderFailure) return dayOrderFailure;

    for (const folderId of folderIds) {
        if (!findDay(program, folderId, dayOrder)) {
            return mutationFailure(`Day not found for week ${folderId}, day ${dayOrder}`);
        }
    }

    return mutationSuccess(program);
}

export function locateDayById(program: THevyRoutine[], dayId: string): TMutationResult {
    if (!findDayById(program, dayId)) {
        return mutationFailure(`Day not found: ${dayId}`);
    }
    return mutationSuccess(program);
}

export function locateExercise(
    program: THevyRoutine[],
    folderIds: number[],
    dayOrder: number,
    exerciseIndex: number,
): TMutationResult {
    const daysResult = locateDays(program, folderIds, dayOrder);
    if (!daysResult.ok) return daysResult;

    if (!Number.isInteger(exerciseIndex) || exerciseIndex < 0) {
        return mutationFailure("exerciseIndex must be a non-negative integer");
    }

    for (const folderId of folderIds) {
        const day = findDay(program, folderId, dayOrder)!;
        if (exerciseIndex >= day.exercises.length) {
            return mutationFailure(
                `exerciseIndex ${exerciseIndex} out of range for week ${folderId}, day ${dayOrder}`,
            );
        }
    }

    return mutationSuccess(program);
}

export function locateInsertExerciseIndex(
    program: THevyRoutine[],
    folderIds: number[],
    dayOrder: number,
    exerciseIndex: number,
): TMutationResult {
    const folderFailure = requireNonEmptyFolderIds(folderIds);
    if (folderFailure) return folderFailure;

    const dayOrderFailure = requireValidDayOrder(dayOrder);
    if (dayOrderFailure) return dayOrderFailure;

    if (!Number.isInteger(exerciseIndex) || exerciseIndex < 0) {
        return mutationFailure("exerciseIndex must be a non-negative integer");
    }

    for (const folderId of folderIds) {
        const day = findDay(program, folderId, dayOrder);
        if (!day) {
            return mutationFailure(`Day not found for week ${folderId}, day ${dayOrder}`);
        }
        if (exerciseIndex > day.exercises.length) {
            return mutationFailure(
                `exerciseIndex ${exerciseIndex} out of range for week ${folderId}, day ${dayOrder}`,
            );
        }
    }

    return mutationSuccess(program);
}

export function nextRoutineId(program: THevyRoutine[]): string {
    const maxId = program.reduce((max, day) => Math.max(max, Number(day.id) || 0), 0);
    return String(maxId + 1);
}
