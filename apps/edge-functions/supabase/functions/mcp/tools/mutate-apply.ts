/**
 * Fail-all apply for MCP agent ops (ADR 0034 / 04).
 * Port of landing applyOperations subset — no Next/UI imports.
 *
 * Landmines vs Andy registry:
 * - No inferMissingFolderIds (folderIds required when targeting a week)
 * - No UI-only ops (duplicate_week / reorder / add_routine_as_day)
 * - swap_exercise_template requires resolved `to.exercise_template_id` + `to.title`
 *
 * Depends on: mutate-schema, @proxima/program-mutation-schemas
 * Used by: mutate-db.ts, mutate-db_test.ts
 */

import type {
  TAgentProgramOperation,
  TBuilderRoutine,
} from './mutate-schema.ts'

export type TApplyBatchResult =
  | { ok: true; program: TBuilderRoutine[] }
  | {
    ok: false
    failures: Array<{ index: number; op: string; reason: string }>
    program: TBuilderRoutine[]
  }

type TDay = TBuilderRoutine
type TExercise = TDay['exercises'][number]
type TSet = TExercise['sets'][number]

function dayKey(day: TDay): string {
  return `${day.folder_id}:${day.order}`
}

function collectDeletedDayKeys(
  operations: readonly TAgentProgramOperation[],
): Set<string> {
  const keys = new Set<string>()
  for (const op of operations) {
    if (op.op !== 'delete_day') continue
    const folderIds = op.folderIds ?? []
    for (const folderId of folderIds) {
      keys.add(`${folderId}:${op.dayOrder}`)
    }
  }
  return keys
}

function validateNoEmptiedTrainingDays(
  initial: readonly TDay[],
  next: readonly TDay[],
  deletedDayKeys: Set<string>,
): string | null {
  const initialByKey = new Map(initial.map((day) => [dayKey(day), day]))
  for (const day of next) {
    const key = dayKey(day)
    if (deletedDayKeys.has(key)) continue
    const before = initialByKey.get(key)
    if (!before || before.exercises.length === 0) continue
    if (day.exercises.length > 0) continue
    const week = Number(day.folder_id) + 1
    return (
      `Week ${week} day ${day.order} would have no exercises. ` +
      'Add insert_exercise ops to replace removed movements, or delete_day if the day should be removed.'
    )
  }
  return null
}

function requireFolderIds(
  op: { folderIds?: number[] },
): number[] | string {
  if (!op.folderIds?.length) {
    return 'folderIds is required (0-based week index array, e.g. [0])'
  }
  return op.folderIds
}

function mapMatchingDays(
  program: TDay[],
  folderIds: number[],
  dayOrder: number,
  mapDay: (day: TDay) => TDay | string,
): TDay[] | string {
  let touched = false
  const out: TDay[] = []
  for (const day of program) {
    if (
      !folderIds.includes(Number(day.folder_id)) ||
      Number(day.order) !== dayOrder
    ) {
      out.push(day)
      continue
    }
    touched = true
    const next = mapDay(day)
    if (typeof next === 'string') return next
    out.push(next)
  }
  if (!touched) {
    return `No day found for folderIds=${JSON.stringify(folderIds)} dayOrder=${dayOrder}`
  }
  return out
}

function renumberExercises(exercises: TExercise[]): TExercise[] {
  return exercises.map((exercise, index) => ({ ...exercise, index }))
}

function applyUpdateSet(
  program: TDay[],
  op: Extract<TAgentProgramOperation, { op: 'update_set' }>,
): TDay[] | string {
  const folderIds = requireFolderIds(op)
  if (typeof folderIds === 'string') return folderIds
  return mapMatchingDays(program, folderIds, op.dayOrder, (day) => {
    const exercise = day.exercises[op.exerciseIndex]
    if (!exercise) {
      return `exerciseIndex ${op.exerciseIndex} out of range (day has ${day.exercises.length})`
    }
    if (!exercise.sets[op.setIndex]) {
      return `setIndex ${op.setIndex} out of range (exercise has ${exercise.sets.length})`
    }
    return {
      ...day,
      exercises: day.exercises.map((ex, index) => {
        if (index !== op.exerciseIndex) return ex
        return {
          ...ex,
          sets: ex.sets.map((set, setIndex) =>
            setIndex === op.setIndex ? { ...set, ...op.set } : set
          ),
        }
      }),
    }
  })
}

function applyDeleteExercise(
  program: TDay[],
  op: Extract<TAgentProgramOperation, { op: 'delete_exercise' }>,
): TDay[] | string {
  const folderIds = requireFolderIds(op)
  if (typeof folderIds === 'string') return folderIds
  return mapMatchingDays(program, folderIds, op.dayOrder, (day) => {
    if (!day.exercises[op.exerciseIndex]) {
      return `exerciseIndex ${op.exerciseIndex} out of range`
    }
    return {
      ...day,
      exercises: renumberExercises(
        day.exercises.filter((_, index) => index !== op.exerciseIndex),
      ),
    }
  })
}

function toSets(
  sets: Extract<TAgentProgramOperation, { op: 'insert_exercise' }>['exercise']['sets'],
): TSet[] {
  return sets.map((set, index) => ({
    index,
    type: set.type,
    weight_kg: set.weight_kg ?? null,
    reps: set.reps ?? null,
    distance_meters: set.distance_meters ?? null,
    duration_seconds: set.duration_seconds ?? null,
    rpe: set.rpe ?? null,
    custom_metric: set.custom_metric ?? null,
    rep_range: set.rep_range ?? null,
  }))
}

function applyInsertExercise(
  program: TDay[],
  op: Extract<TAgentProgramOperation, { op: 'insert_exercise' }>,
): TDay[] | string {
  const folderIds = requireFolderIds(op)
  if (typeof folderIds === 'string') return folderIds
  const exercise = op.exercise
  if (!exercise.title?.trim()) {
    return 'insert_exercise requires exercise.title (resolve from list_exercises)'
  }
  return mapMatchingDays(program, folderIds, op.dayOrder, (day) => {
    if (op.exerciseIndex < 0 || op.exerciseIndex > day.exercises.length) {
      return `exerciseIndex ${op.exerciseIndex} out of range for insert (0..${day.exercises.length})`
    }
    const row: TExercise = {
      index: op.exerciseIndex,
      title: exercise.title!.trim(),
      notes: exercise.notes ?? '',
      rest_seconds: exercise.rest_seconds ?? null,
      exercise_template_id: exercise.exercise_template_id,
      supersets_id: exercise.supersets_id ?? null,
      sets: toSets(exercise.sets),
    }
    const next = [...day.exercises]
    next.splice(op.exerciseIndex, 0, row)
    return { ...day, exercises: renumberExercises(next) }
  })
}

function applyEditExercise(
  program: TDay[],
  op: Extract<TAgentProgramOperation, { op: 'edit_exercise' }>,
): TDay[] | string {
  const folderIds = requireFolderIds(op)
  if (typeof folderIds === 'string') return folderIds
  const exercise = op.exercise
  if (!exercise.title?.trim()) {
    return 'edit_exercise requires exercise.title'
  }
  return mapMatchingDays(program, folderIds, op.dayOrder, (day) => {
    if (!day.exercises[op.exerciseIndex]) {
      return `exerciseIndex ${op.exerciseIndex} out of range`
    }
    return {
      ...day,
      exercises: day.exercises.map((ex, index) => {
        if (index !== op.exerciseIndex) return ex
        return {
          ...ex,
          title: exercise.title!.trim(),
          notes: exercise.notes ?? ex.notes,
          rest_seconds: exercise.rest_seconds ?? ex.rest_seconds,
          exercise_template_id: exercise.exercise_template_id,
          supersets_id: exercise.supersets_id ?? ex.supersets_id,
          sets: toSets(exercise.sets),
        }
      }),
    }
  })
}

function applySwapTemplate(
  program: TDay[],
  op: Extract<TAgentProgramOperation, { op: 'swap_exercise_template' }>,
): TDay[] | string {
  const to = op.to as {
    exercise_template_id?: string
    title?: string
  }
  if (!to.exercise_template_id || !to.title?.trim()) {
    return 'swap_exercise_template.to needs exercise_template_id and title'
  }
  const folderIds = op.folderIds
  return program.map((day) => {
    if (folderIds?.length && !folderIds.includes(Number(day.folder_id))) {
      return day
    }
    if (op.dayOrder != null && Number(day.order) !== op.dayOrder) {
      return day
    }
    return {
      ...day,
      exercises: day.exercises.map((ex) => {
        if (ex.exercise_template_id !== op.from_exercise_template_id) {
          return ex
        }
        return {
          ...ex,
          exercise_template_id: to.exercise_template_id!,
          title: to.title!.trim(),
          ...(op.preserve_sets === false
            ? {
              sets: ex.sets.map((set) => ({
                ...set,
                weight_kg: null,
                reps: set.reps,
              })),
            }
            : {}),
        }
      }),
    }
  })
}

function applyEditDayTitle(
  program: TDay[],
  op: Extract<TAgentProgramOperation, { op: 'edit_day_title' }>,
): TDay[] | string {
  const folderIds = requireFolderIds(op)
  if (typeof folderIds === 'string') return folderIds
  return mapMatchingDays(program, folderIds, op.dayOrder, (day) => ({
    ...day,
    title: op.title,
  }))
}

function applyAddDayNotes(
  program: TDay[],
  op: Extract<TAgentProgramOperation, { op: 'add_day_notes' }>,
): TDay[] | string {
  const folderIds = requireFolderIds(op)
  if (typeof folderIds === 'string') return folderIds
  return mapMatchingDays(program, folderIds, op.dayOrder, (day) => ({
    ...day,
    notes: op.notes,
  }))
}

function applyAddExerciseNotes(
  program: TDay[],
  op: Extract<TAgentProgramOperation, { op: 'add_exercise_notes' }>,
): TDay[] | string {
  const folderIds = requireFolderIds(op)
  if (typeof folderIds === 'string') return folderIds
  return mapMatchingDays(program, folderIds, op.dayOrder, (day) => {
    if (!day.exercises[op.exerciseIndex]) {
      return `exerciseIndex ${op.exerciseIndex} out of range`
    }
    return {
      ...day,
      exercises: day.exercises.map((ex, index) =>
        index === op.exerciseIndex ? { ...ex, notes: op.notes } : ex
      ),
    }
  })
}

function applyDeleteDay(
  program: TDay[],
  op: Extract<TAgentProgramOperation, { op: 'delete_day' }>,
): TDay[] | string {
  const folderIds = requireFolderIds(op)
  if (typeof folderIds === 'string') return folderIds
  const next = program.filter(
    (day) =>
      !(
        folderIds.includes(Number(day.folder_id)) &&
        Number(day.order) === op.dayOrder
      ),
  )
  if (next.length === program.length) {
    return `No day found to delete for folderIds=${JSON.stringify(folderIds)} dayOrder=${op.dayOrder}`
  }
  // Renormalize order within touched weeks
  const touched = new Set(folderIds)
  const byWeek = new Map<number, TDay[]>()
  for (const day of next) {
    const week = Number(day.folder_id)
    const bucket = byWeek.get(week) ?? []
    bucket.push(day)
    byWeek.set(week, bucket)
  }
  const out: TDay[] = []
  for (const [week, days] of [...byWeek.entries()].sort((a, b) => a[0] - b[0])) {
    const sorted = [...days].sort((a, b) => Number(a.order) - Number(b.order))
    if (touched.has(week)) {
      sorted.forEach((day, index) => {
        out.push({ ...day, order: String(index + 1) })
      })
    } else {
      out.push(...sorted)
    }
  }
  return out
}

function applyAddDay(
  program: TDay[],
  op: Extract<TAgentProgramOperation, { op: 'add_day' }>,
): TDay[] | string {
  const folderId = op.folderIds[0]
  if (folderId == null) return 'folderIds required'
  const weekDays = program.filter((day) => Number(day.folder_id) === folderId)
  const maxOrder = Math.max(0, ...weekDays.map((day) => Number(day.order)))
  const maxId = Math.max(
    0,
    ...program.map((day) => Number(day.id)).filter((id) => Number.isFinite(id)),
  )
  return [
    ...program,
    {
      id: String(maxId + 1),
      title: '',
      folder_id: folderId,
      notes: '',
      order: String(maxOrder + 1),
      exercises: [],
    },
  ]
}

function applyDeleteWeek(
  program: TDay[],
  op: Extract<TAgentProgramOperation, { op: 'delete_week' }>,
): TDay[] | string {
  const folderId = op.folderIds[0]
  if (folderId == null) return 'folderIds required'
  const next = program.filter((day) => Number(day.folder_id) !== folderId)
  if (next.length === program.length) {
    return `Week folder_id=${folderId} not found`
  }
  // Shift later weeks down
  return next.map((day) => {
    const week = Number(day.folder_id)
    return week > folderId ? { ...day, folder_id: week - 1 } : day
  })
}

function applyCreateSuperset(
  program: TDay[],
  op: Extract<TAgentProgramOperation, { op: 'create_superset' }>,
): TDay[] | string {
  const folderIds = requireFolderIds(op)
  if (typeof folderIds === 'string') return folderIds
  return mapMatchingDays(program, folderIds, op.dayOrder, (day) => {
    for (const index of op.exerciseIndexes) {
      if (!day.exercises[index]) {
        return `exerciseIndex ${index} out of range`
      }
    }
    const used = day.exercises
      .map((ex) => ex.supersets_id)
      .filter((id): id is number => id != null)
    const nextId = (used.length ? Math.max(...used) : 0) + 1
    return {
      ...day,
      exercises: day.exercises.map((ex, index) =>
        op.exerciseIndexes.includes(index)
          ? { ...ex, supersets_id: nextId }
          : ex
      ),
    }
  })
}

function applyRemoveFromSuperset(
  program: TDay[],
  op: Extract<TAgentProgramOperation, { op: 'remove_from_superset' }>,
): TDay[] | string {
  const folderIds = requireFolderIds(op)
  if (typeof folderIds === 'string') return folderIds
  return mapMatchingDays(program, folderIds, op.dayOrder, (day) => {
    if (!day.exercises[op.exerciseIndex]) {
      return `exerciseIndex ${op.exerciseIndex} out of range`
    }
    return {
      ...day,
      exercises: day.exercises.map((ex, index) =>
        index === op.exerciseIndex ? { ...ex, supersets_id: null } : ex
      ),
    }
  })
}

function applyOne(
  program: TDay[],
  op: TAgentProgramOperation,
): TDay[] | string {
  switch (op.op) {
    case 'update_set':
      return applyUpdateSet(program, op)
    case 'delete_exercise':
      return applyDeleteExercise(program, op)
    case 'insert_exercise':
      return applyInsertExercise(program, op)
    case 'edit_exercise':
      return applyEditExercise(program, op)
    case 'swap_exercise_template':
      return applySwapTemplate(program, op)
    case 'edit_day_title':
      return applyEditDayTitle(program, op)
    case 'add_day_notes':
      return applyAddDayNotes(program, op)
    case 'add_exercise_notes':
      return applyAddExerciseNotes(program, op)
    case 'delete_day':
      return applyDeleteDay(program, op)
    case 'add_day':
      return applyAddDay(program, op)
    case 'delete_week':
      return applyDeleteWeek(program, op)
    case 'create_superset':
      return applyCreateSuperset(program, op)
    case 'remove_from_superset':
      return applyRemoveFromSuperset(program, op)
    default: {
      const _exhaustive: never = op
      return `Unsupported op: ${(_exhaustive as TAgentProgramOperation).op}`
    }
  }
}

/**
 * Apply a fail-all Program mutation batch to a builder grid.
 * On any failure returns the original program unchanged.
 */
export function applyOperations(
  program: TBuilderRoutine[],
  operations: readonly TAgentProgramOperation[],
): TApplyBatchResult {
  let next = program
  const deletedDayKeys = collectDeletedDayKeys(operations)

  for (let index = 0; index < operations.length; index++) {
    const op = operations[index]
    const result = applyOne(next, op)
    if (typeof result === 'string') {
      return {
        ok: false,
        failures: [{ index, op: op.op, reason: result }],
        program,
      }
    }
    next = result
  }

  const emptied = validateNoEmptiedTrainingDays(program, next, deletedDayKeys)
  if (emptied) {
    const last = operations[operations.length - 1]
    return {
      ok: false,
      failures: [{
        index: operations.length - 1,
        op: last?.op ?? 'unknown',
        reason: emptied,
      }],
      program,
    }
  }

  return { ok: true, program: next }
}

/** Folder ids (0-based) touched by a batch — used for Edit program locks. */
export function folderIdsTouchedByOperations(
  operations: readonly TAgentProgramOperation[],
): number[] {
  const ids = new Set<number>()
  for (const op of operations) {
    if ('folderIds' in op && Array.isArray(op.folderIds)) {
      for (const id of op.folderIds) ids.add(id)
    }
    if (op.op === 'swap_exercise_template' && !op.folderIds?.length) {
      // Whole-program swap — caller treats as all weeks
      ids.add(-1)
    }
    if (op.op === 'delete_week' || op.op === 'add_day') {
      for (const id of op.folderIds) ids.add(id)
    }
  }
  return [...ids]
}
