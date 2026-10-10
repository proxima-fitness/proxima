// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Mutation proposal → Accept → Save for Proxima MCP (ADR 0034 / 04).
 *
 * Propose stores a pending batch (no prescription write). Accept applies to
 * builder memory only. Save persists under Edit program locks (C8).
 *
 * Landmines vs Andy:
 * - No Jev / week-coverage Soft-fails (C5 — no Gateway)
 * - Pending in `mcp_mutation_proposals` (Edge isolates do not share process memory)
 * - Accept without builder_routines errors — never silent prescription write
 *
 * Depends on: mutate-schema, mutate-apply, programs-db, @proxima/mutation-constraint-gate
 * Used by: mutate.ts, program-week-app.ts, mutate-db_test.ts
 */

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.108.2'
import { validateAgainstConstraints } from '@proxima/mutation-constraint-gate'

import {
  applyOperations,
  folderIdsTouchedByOperations,
} from './mutate-apply.ts'
import type {
  TAcceptProgramMutationInput,
  TAgentProgramOperation,
  TBuilderRoutine,
  TMutateProgramInput,
  TRejectProgramMutationInput,
  TSaveProgramInput,
} from './mutate-schema.ts'
import { readProgram } from './programs-db.ts'

export type TMutateResult =
  | {
    status: 'ok'
    program_id: number
    proposal: 'pending'
    operations: TAgentProgramOperation[]
  }
  | { status: 'error'; error: string; failures?: TApplyBatchFailure[] }

export type TAcceptResult =
  | {
    status: 'ok'
    program_id: number
    builder_routines: TBuilderRoutine[]
  }
  | { status: 'error'; error: string; failures?: TApplyBatchFailure[] }

export type TRejectResult =
  | { status: 'ok'; program_id: number; cleared: boolean }
  | { status: 'error'; error: string }

export type TSaveResult =
  | { status: 'ok'; program_id: number }
  | { status: 'error'; error: string }

type TApplyBatchFailure = { index: number; op: string; reason: string }

type TPending = {
  operations: TAgentProgramOperation[]
}

/** Same-isolate cache; Postgres is the source of truth across Edge workers. */
const pendingByKey = new Map<string, TPending>()

function pendingKey(userId: string, programId: number): string {
  return `${userId}:${programId}`
}

/** Test seam — clear in-memory cache between cases (mock DB cleared separately). */
export function clearPendingProposalsForTests(): void {
  pendingByKey.clear()
}

async function loadPending(
  db: SupabaseClient,
  userId: string,
  programId: number,
): Promise<TPending | null> {
  const key = pendingKey(userId, programId)
  const cached = pendingByKey.get(key)
  if (cached) return cached

  const { data, error } = await db
    .from('mcp_mutation_proposals')
    .select('operations')
    .eq('user_id', userId)
    .eq('program_id', programId)
    .maybeSingle()
  if (error) {
    console.error('mcp_mutation_proposals load', error.message)
    return null
  }
  if (!data?.operations || !Array.isArray(data.operations)) return null
  const pending = {
    operations: data.operations as TAgentProgramOperation[],
  }
  pendingByKey.set(key, pending)
  return pending
}

async function storePending(
  db: SupabaseClient,
  userId: string,
  programId: number,
  operations: TAgentProgramOperation[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = pendingKey(userId, programId)
  pendingByKey.set(key, { operations })
  const { error } = await db.from('mcp_mutation_proposals').upsert(
    {
      user_id: userId,
      program_id: programId,
      operations,
    },
    { onConflict: 'user_id,program_id' },
  )
  if (error) {
    pendingByKey.delete(key)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

async function clearPending(
  db: SupabaseClient,
  userId: string,
  programId: number,
): Promise<boolean> {
  const key = pendingKey(userId, programId)
  const hadMem = pendingByKey.delete(key)
  const { data, error } = await db
    .from('mcp_mutation_proposals')
    .delete()
    .eq('user_id', userId)
    .eq('program_id', programId)
    .select('program_id')
  if (error) {
    console.error('mcp_mutation_proposals delete', error.message)
    return hadMem
  }
  return hadMem || (data?.length ?? 0) > 0
}

/** Peek pending Mutation proposal ops (MCP App Accept chrome). */
export async function peekPendingProposal(
  db: SupabaseClient,
  userId: string,
  programId: number,
): Promise<TAgentProgramOperation[] | null> {
  const pending = await loadPending(db, userId, programId)
  return pending?.operations ?? null
}

type TLinkRow = {
  nth_week: number
  completed_at: string | null
}

/**
 * Edit program locked weeks (0-based folder_id): Current week + Week complete.
 * Mirrors CONTEXT / deriveProgramOverviewWeekStatuses.
 */
export function lockedFolderIdsFromLinks(
  links: readonly TLinkRow[],
): number[] {
  const linked = links
    .map((link) => link.nth_week)
    .filter((week) => Number.isInteger(week) && week >= 1)
  const completed = new Set(
    links
      .filter((link) => link.completed_at != null)
      .map((link) => link.nth_week)
      .filter((week) => Number.isInteger(week) && week >= 1),
  )
  const incompleteLinked = linked.filter((week) => !completed.has(week))
  const currentWeek =
    incompleteLinked.length > 0 ? Math.min(...incompleteLinked) : null

  const locked = new Set<number>()
  for (const week of completed) {
    locked.add(week - 1)
  }
  if (currentWeek != null) {
    locked.add(currentWeek - 1)
  }
  return [...locked].sort((a, b) => a - b)
}

function routinesForFolder(
  routines: readonly TBuilderRoutine[],
  folderId: number,
): TBuilderRoutine[] {
  return routines
    .filter((day) => Number(day.folder_id) === folderId)
    .map((day) => ({
      ...day,
      exercises: day.exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((set) => ({ ...set })),
      })),
    }))
    .sort((a, b) => Number(a.order) - Number(b.order))
}

/** True when builder differs from prescription on a locked week. */
export function lockedWeeksChanged(
  prescription: readonly TBuilderRoutine[],
  builder: readonly TBuilderRoutine[],
  lockedFolderIds: readonly number[],
): number[] {
  const changed: number[] = []
  for (const folderId of lockedFolderIds) {
    const before = JSON.stringify(routinesForFolder(prescription, folderId))
    const after = JSON.stringify(routinesForFolder(builder, folderId))
    if (before !== after) changed.push(folderId)
  }
  return changed
}

async function assertOwner(
  db: SupabaseClient,
  userId: string,
  programId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await db
    .from('programs')
    .select('id, user_id')
    .eq('id', programId)
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'Program not found' }
  if (data.user_id !== userId) {
    return { ok: false, error: 'Only the program owner can mutate or Save' }
  }
  return { ok: true }
}

async function loadLockedFolderIds(
  db: SupabaseClient,
  programId: number,
): Promise<{ ok: true; locked: number[] } | { ok: false; error: string }> {
  const { data, error } = await db
    .from('program_hevy_week_links')
    .select('nth_week, completed_at')
    .eq('program_id', programId)

  if (error) return { ok: false, error: error.message }
  return {
    ok: true,
    locked: lockedFolderIdsFromLinks((data ?? []) as TLinkRow[]),
  }
}

type TTemplateMeta = {
  id: string
  title: string
  equipment: string | null
  primary_muscle_group: string | null
}

async function gateOperations(
  db: SupabaseClient,
  userId: string,
  operations: readonly TAgentProgramOperation[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const templateIds = new Set<string>()
  for (const op of operations) {
    if (op.op === 'insert_exercise' || op.op === 'edit_exercise') {
      templateIds.add(op.exercise.exercise_template_id)
    }
    if (op.op === 'swap_exercise_template') {
      const to = op.to as { exercise_template_id?: string }
      if (to.exercise_template_id) templateIds.add(to.exercise_template_id)
    }
  }
  if (templateIds.size === 0) return { ok: true }

  const { data: profile, error: profileError } = await db
    .from('user_constraints')
    .select('injuries, excluded_equipment, excluded_areas')
    .eq('user_id', userId)
    .maybeSingle()

  if (profileError) return { ok: false, error: profileError.message }
  if (!profile) return { ok: true }

  const { data: templates, error: templatesError } = await db
    .from('hevy_exercise_templates')
    .select('id, title, equipment, primary_muscle_group')
    .in('id', [...templateIds])

  if (templatesError) return { ok: false, error: templatesError.message }

  const metas = ((templates ?? []) as TTemplateMeta[]).map((row) => ({
    title: row.title,
    equipment: row.equipment,
    primary_muscle_group: row.primary_muscle_group,
  }))

  const result = validateAgainstConstraints(
    {
      injuries: (profile.injuries as string[] | null) ?? [],
      excludedEquipment: (profile.excluded_equipment as string[] | null) ?? [],
      excludedAreas: (profile.excluded_areas as string[] | null) ?? [],
    },
    metas,
  )

  if (!result.valid) {
    const detail = result.violations
      .map((v) => `${v.exerciseTitle}: ${v.reason}`)
      .join('; ')
    return {
      ok: false,
      error: `Mutation constraint gate rejected: ${detail}`,
    }
  }
  return { ok: true }
}

/**
 * Stage a Mutation proposal (replaces any pending for this program).
 * Does not write the Program prescription.
 */
export async function proposeProgramMutation(
  db: SupabaseClient,
  userId: string,
  input: TMutateProgramInput,
): Promise<TMutateResult> {
  const owner = await assertOwner(db, userId, input.program_id)
  if (!owner.ok) return { status: 'error', error: owner.error }

  const locked = await loadLockedFolderIds(db, input.program_id)
  if (!locked.ok) return { status: 'error', error: locked.error }

  const touched = folderIdsTouchedByOperations(input.operations)
  if (touched.includes(-1) && locked.locked.length > 0) {
    return {
      status: 'error',
      error:
        `Edit program lock: whole-program swap touches locked weeks ` +
        `(folder_id ${locked.locked.join(', ')} — Current week / Week complete)`,
    }
  }
  const lockedHit = touched.filter((id) => locked.locked.includes(id))
  if (lockedHit.length > 0) {
    return {
      status: 'error',
      error:
        `Edit program lock: cannot propose changes to locked weeks ` +
        `(folder_id ${lockedHit.join(', ')} — Current week / Week complete)`,
    }
  }

  const gate = await gateOperations(db, userId, input.operations)
  if (!gate.ok) return { status: 'error', error: gate.error }

  // Preflight fail-all against current prescription (indexes must be valid)
  const current = await readProgram(db, userId, input.program_id)
  if (current.status === 'not_found') {
    return { status: 'error', error: 'Program not found' }
  }
  if (current.status === 'error') {
    return { status: 'error', error: current.error }
  }

  const preflight = applyOperations(
    current.program.routines as TBuilderRoutine[],
    input.operations,
  )
  if (!preflight.ok) {
    return {
      status: 'error',
      error: 'Mutation batch failed (fail-all); nothing proposed',
      failures: preflight.failures,
    }
  }

  const stored = await storePending(
    db,
    userId,
    input.program_id,
    input.operations,
  )
  if (!stored.ok) {
    return { status: 'error', error: stored.error }
  }

  return {
    status: 'ok',
    program_id: input.program_id,
    proposal: 'pending',
    operations: input.operations,
  }
}

/**
 * Accept pending proposal into builder memory. Requires builder_routines.
 */
export async function acceptProgramMutation(
  db: SupabaseClient,
  userId: string,
  input: TAcceptProgramMutationInput,
): Promise<TAcceptResult> {
  const owner = await assertOwner(db, userId, input.program_id)
  if (!owner.ok) return { status: 'error', error: owner.error }

  const pending = await loadPending(db, userId, input.program_id)
  if (!pending) {
    return {
      status: 'error',
      error: 'No pending Mutation proposal for this program — call mutate_program first',
    }
  }

  if (!input.builder_routines?.length) {
    return {
      status: 'error',
      error:
        'Open the program week UI (MCP App) to Accept — builder state required. ' +
        'Pending proposal is kept; prescription was not written.',
    }
  }

  const locked = await loadLockedFolderIds(db, input.program_id)
  if (!locked.ok) return { status: 'error', error: locked.error }

  const touched = folderIdsTouchedByOperations(pending.operations)
  if (touched.includes(-1) && locked.locked.length > 0) {
    return {
      status: 'error',
      error:
        `Edit program lock: Accept refused for locked weeks ` +
        `(folder_id ${locked.locked.join(', ')})`,
    }
  }
  const lockedHit = touched.filter((id) => locked.locked.includes(id))
  if (lockedHit.length > 0) {
    return {
      status: 'error',
      error:
        `Edit program lock: Accept refused for locked weeks ` +
        `(folder_id ${lockedHit.join(', ')} — Current week / Week complete)`,
    }
  }

  const applied = applyOperations(input.builder_routines, pending.operations)
  if (!applied.ok) {
    await clearPending(db, userId, input.program_id)
    return {
      status: 'error',
      error: 'Accept failed (stale builder or invalid batch); proposal discarded',
      failures: applied.failures,
    }
  }

  await clearPending(db, userId, input.program_id)
  return {
    status: 'ok',
    program_id: input.program_id,
    builder_routines: applied.program,
  }
}

/** Discard pending Mutation proposal (reject / supersede helper). */
export async function rejectProgramMutation(
  db: SupabaseClient,
  userId: string,
  input: TRejectProgramMutationInput,
): Promise<TRejectResult> {
  const cleared = await clearPending(db, userId, input.program_id)
  return { status: 'ok', program_id: input.program_id, cleared }
}

function buildRepsRange2D(
  sets: TBuilderRoutine['exercises'][number]['sets'],
): number[][] | null {
  if (!sets.length) return null
  const pairs: number[][] = []
  for (const set of sets) {
    const range = set.rep_range
    if (range == null) return null
    pairs.push([range.start, range.end])
  }
  return pairs
}

/**
 * Persist builder grid as Program prescription (Edit program Save).
 * Refuses when Current week / Week complete slots would change.
 */
export async function saveProgram(
  db: SupabaseClient,
  userId: string,
  input: TSaveProgramInput,
): Promise<TSaveResult> {
  const owner = await assertOwner(db, userId, input.program_id)
  if (!owner.ok) return { status: 'error', error: owner.error }

  const locked = await loadLockedFolderIds(db, input.program_id)
  if (!locked.ok) return { status: 'error', error: locked.error }

  const current = await readProgram(db, userId, input.program_id)
  if (current.status === 'not_found') {
    return { status: 'error', error: 'Program not found' }
  }
  if (current.status === 'error') {
    return { status: 'error', error: current.error }
  }

  const changed = lockedWeeksChanged(
    current.program.routines as TBuilderRoutine[],
    input.builder_routines,
    locked.locked,
  )
  if (changed.length > 0) {
    return {
      status: 'error',
      error:
        `Edit program lock: Save refused for locked weeks ` +
        `(folder_id ${changed.join(', ')} — Current week / Week complete). ` +
        'Use Edit current week (ADR 0036) for the live Hevy week.',
    }
  }

  // Merge: locked weeks from prescription, others from builder
  const lockedSet = new Set(locked.locked)
  const merged: TBuilderRoutine[] = [
    ...current.program.routines
      .filter((day) => lockedSet.has(Number(day.folder_id)))
      .map((day) => day as TBuilderRoutine),
    ...input.builder_routines.filter(
      (day) => !lockedSet.has(Number(day.folder_id)),
    ),
  ]

  // Replace schedule_workouts (cascade removes exercises)
  const { error: deleteError } = await db
    .from('schedule_workouts')
    .delete()
    .eq('program_id', input.program_id)

  if (deleteError) return { status: 'error', error: deleteError.message }

  const scheduleUploads = merged.map((routine) => ({
    id: crypto.randomUUID(),
    nthWeek: Number(routine.folder_id) + 1,
    nthDay: Number(routine.order || '1'),
    day_title: routine.title,
    day_notes: routine.notes ?? '',
    program_id: input.program_id,
  }))

  const BATCH = 50
  for (let i = 0; i < scheduleUploads.length; i += BATCH) {
    const batch = scheduleUploads.slice(i, i + BATCH)
    const { error: scheduleError } = await db
      .from('schedule_workouts')
      .insert(batch)
    if (scheduleError) return { status: 'error', error: scheduleError.message }
  }

  const { data: templates, error: templatesError } = await db
    .from('hevy_exercise_templates')
    .select('id')
    .limit(10000)

  if (templatesError) return { status: 'error', error: templatesError.message }
  const validIds = new Set((templates ?? []).map((t) => t.id as string))

  const exerciseUploads: Record<string, unknown>[] = []
  for (let i = 0; i < merged.length; i++) {
    const routine = merged[i]
    const schedule = scheduleUploads[i]
    if (!routine || !schedule) continue

    for (const exercise of routine.exercises) {
      if (!validIds.has(exercise.exercise_template_id)) {
        return {
          status: 'error',
          error:
            `Unknown exercise_template_id "${exercise.exercise_template_id}" ` +
            `for "${exercise.title}". Call list_exercises first.`,
        }
      }
      const reps = exercise.sets.map((set) => set.reps)
      const weights = exercise.sets.map((set) => set.weight_kg)
      const rpe = exercise.sets.map((set) => set.rpe)
      exerciseUploads.push({
        schedule_id: schedule.id,
        exercise_id: exercise.exercise_template_id,
        reps,
        reps_range: buildRepsRange2D(exercise.sets),
        reps_max: null,
        amrap: null,
        time_taken: null,
        time_range: null,
        weights: weights.every((w) => w == null) ? null : weights,
        rpe: rpe.every((value) => value == null) ? null : rpe,
        rpe_range: null,
        percent_rm: null,
        set_types: exercise.sets.map((set) => set.type),
      })
    }
  }

  for (let i = 0; i < exerciseUploads.length; i += BATCH) {
    const batch = exerciseUploads.slice(i, i + BATCH)
    if (!batch.length) continue
    const { error: workoutError } = await db
      .from('program_workout_exercises')
      .insert(batch)
    if (workoutError) return { status: 'error', error: workoutError.message }
  }

  const maxWeek = Math.max(
    0,
    ...merged.map((day) => Number(day.folder_id) + 1),
  )
  if (maxWeek > 0) {
    await db
      .from('programs')
      .update({ program_length: maxWeek })
      .eq('id', input.program_id)
      .eq('user_id', userId)
  }

  return { status: 'ok', program_id: input.program_id }
}
