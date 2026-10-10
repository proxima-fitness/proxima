// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Zod contracts for Proxima MCP workout tools — mirror of
 * proxima_landing `openapi-schemas/workouts.ts` + `workout-source.ts` (ADR 0033 / 03).
 * Copy, don't import the Next app.
 */

import { z } from 'npm:zod@4'

/** Native sync only. MCP / Public API writes must not use this slug. */
export const HEVY_RESERVED_SOURCE = 'hevy' as const

/**
 * v1 closed Workout source slugs. `hevy` is never accepted.
 */
export const PUBLIC_API_WORKOUT_SOURCES = [
  'manual',
  'strong',
  'macrofactor_workouts',
  'fitbod',
  'gravl',
  'apple_health',
  'jefit',
  'caliber',
  'boostcamp',
  'liftosaur',
  'strengthlog',
  'alpha_progression',
  'stronglifts',
  'setgraph',
  'rp_hypertrophy',
  'juggernaut',
] as const

export type TPublicApiWorkoutSource = (typeof PUBLIC_API_WORKOUT_SOURCES)[number]

export const PUBLIC_API_SET_TYPES = ['normal', 'warmup', 'dropset', 'failure'] as const

export type TPublicApiSetType = (typeof PUBLIC_API_SET_TYPES)[number]

export const WorkoutIdInput = z.object({
  id: z.string().uuid().describe('Proxima Workout backup id.'),
})

export const PublicApiWorkoutSet = z.object({
  set_type: z.enum(PUBLIC_API_SET_TYPES).describe('normal, warmup, dropset, or failure.'),
  weight_kg: z.number().nullable().optional(),
  reps: z.number().nullable().optional(),
  duration_seconds: z.number().nullable().optional(),
  distance_meters: z.number().nullable().optional(),
  rpe: z.number().nullable().optional(),
  custom_metric: z.number().nullable().optional(),
  rep_range_start: z.number().nullable().optional(),
  rep_range_end: z.number().nullable().optional(),
})

export const PublicApiWorkoutExercise = z.object({
  canonical_exercise_id: z
    .string()
    .uuid()
    .describe('ID from list_exercises or create_custom_exercise.'),
  notes: z.string().optional().describe('Exercise-level notes.'),
  sets: z.array(PublicApiWorkoutSet).min(1).describe('At least one set.'),
})

function refineWorkoutTimes(
  data: { ended_at: string; started_at: string },
  ctx: z.RefinementCtx
): void {
  const startedAt = Date.parse(data.started_at)
  const endedAt = Date.parse(data.ended_at)
  if (Number.isNaN(startedAt)) {
    ctx.addIssue({
      code: 'custom',
      path: ['started_at'],
      message: 'started_at must be a valid ISO 8601 datetime',
    })
  }
  if (Number.isNaN(endedAt)) {
    ctx.addIssue({
      code: 'custom',
      path: ['ended_at'],
      message: 'ended_at must be a valid ISO 8601 datetime',
    })
  }
  if (!Number.isNaN(startedAt) && !Number.isNaN(endedAt) && endedAt < startedAt) {
    ctx.addIssue({
      code: 'custom',
      path: ['ended_at'],
      message: 'ended_at must be at or after started_at',
    })
  }
}

/** Plain object for MCP inputSchema (effects stay on the parse helpers). */
export const CreateWorkoutInput = z.object({
  source: z
    .enum(PUBLIC_API_WORKOUT_SOURCES)
    .describe('Closed Workout source list. hevy is rejected.'),
  external_id: z
    .string()
    .trim()
    .min(1)
    .describe('Caller identity for this session. Unique with source per athlete.'),
  started_at: z.string().describe('ISO 8601 start.'),
  ended_at: z.string().describe('ISO 8601 end. Must be at or after started_at.'),
  title: z.string().trim().min(1),
  description: z.string().optional(),
  exercises: z.array(PublicApiWorkoutExercise).min(1).describe('At least one exercise.'),
})

const CreateWorkoutParsed = CreateWorkoutInput.superRefine(refineWorkoutTimes)

/** Plain object for MCP inputSchema. */
export const ReplaceWorkoutFields = z.object({
  started_at: z.string().describe('ISO 8601 start.'),
  ended_at: z.string().describe('ISO 8601 end. Must be at or after started_at.'),
  title: z.string().trim().min(1),
  description: z.string().optional(),
  exercises: z.array(PublicApiWorkoutExercise).min(1),
})

const ReplaceWorkoutParsed = ReplaceWorkoutFields.superRefine(refineWorkoutTimes)

/** Tool input: Workout id + replace body. */
export const ReplaceWorkoutInput = WorkoutIdInput.merge(ReplaceWorkoutFields)

export type TPublicApiWorkoutSetDraft = {
  custom_metric: number | null
  distance_meters: number | null
  duration_seconds: number | null
  rep_range_end: number | null
  rep_range_start: number | null
  reps: number | null
  rpe: number | null
  set_type: TPublicApiSetType
  weight_kg: number | null
}

export type TPublicApiWorkoutExerciseDraft = {
  canonical_exercise_id: string
  notes: string | null
  sets: TPublicApiWorkoutSetDraft[]
}

export type TPublicApiCreateWorkoutDraft = {
  description: string | null
  ended_at: string
  exercises: TPublicApiWorkoutExerciseDraft[]
  external_id: string
  source: TPublicApiWorkoutSource
  started_at: string
  title: string
}

export type TPublicApiReplaceWorkoutDraft = Omit<
  TPublicApiCreateWorkoutDraft,
  'external_id' | 'source'
>

export type TPublicApiWorkout = TPublicApiCreateWorkoutDraft & { id: string }

export type TCreateWorkoutParse =
  | { draft: TPublicApiCreateWorkoutDraft; ok: true }
  | { error: string; ok: false }

export type TReplaceWorkoutParse =
  | { draft: TPublicApiReplaceWorkoutDraft; ok: true }
  | { error: string; ok: false }

export function isReservedHevySource(slug: string): slug is typeof HEVY_RESERVED_SOURCE {
  return slug === HEVY_RESERVED_SOURCE
}

/**
 * Parses create_workout. Rejects `hevy`, unknown sources, and any `routine_id`.
 */
export function parseCreateWorkout(body: unknown): TCreateWorkoutParse {
  if (hasOwn(body, 'routine_id')) {
    return { ok: false, error: 'routine_id is not allowed' }
  }
  if (readSource(body) !== null && isReservedHevySource(readSource(body) ?? '')) {
    return { ok: false, error: 'source hevy is reserved for native sync' }
  }

  const parsed = CreateWorkoutParsed.safeParse(body)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid request body' }
  }

  return { ok: true, draft: toCreateDraft(parsed.data) }
}

/**
 * Parses replace_workout body fields. `source`, `external_id`, and `routine_id` are rejected.
 */
export function parseReplaceWorkout(body: unknown): TReplaceWorkoutParse {
  if (hasOwn(body, 'routine_id')) {
    return { ok: false, error: 'routine_id is not allowed' }
  }
  if (hasOwn(body, 'source') || hasOwn(body, 'external_id')) {
    return { ok: false, error: 'source and external_id cannot be changed' }
  }

  const parsed = ReplaceWorkoutParsed.safeParse(body)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid request body' }
  }

  return { ok: true, draft: toReplaceDraft(parsed.data) }
}

function hasOwn(body: unknown, key: string): boolean {
  return typeof body === 'object' && body !== null && Object.hasOwn(body, key)
}

function readSource(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('source' in body)) {
    return null
  }
  return typeof body.source === 'string' ? body.source : null
}

function optionalText(value: string | undefined): string | null {
  if (value == null) {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toSetDraft(set: {
  custom_metric?: number | null
  distance_meters?: number | null
  duration_seconds?: number | null
  rep_range_end?: number | null
  rep_range_start?: number | null
  reps?: number | null
  rpe?: number | null
  set_type: TPublicApiSetType
  weight_kg?: number | null
}): TPublicApiWorkoutSetDraft {
  return {
    set_type: set.set_type,
    weight_kg: set.weight_kg ?? null,
    reps: set.reps ?? null,
    duration_seconds: set.duration_seconds ?? null,
    distance_meters: set.distance_meters ?? null,
    rpe: set.rpe ?? null,
    custom_metric: set.custom_metric ?? null,
    rep_range_start: set.rep_range_start ?? null,
    rep_range_end: set.rep_range_end ?? null,
  }
}

function toExerciseDrafts(
  exercises: Array<{
    canonical_exercise_id: string
    notes?: string
    sets: Parameters<typeof toSetDraft>[0][]
  }>
): TPublicApiWorkoutExerciseDraft[] {
  return exercises.map((exercise) => ({
    canonical_exercise_id: exercise.canonical_exercise_id,
    notes: exercise.notes ?? null,
    sets: exercise.sets.map(toSetDraft),
  }))
}

function toCreateDraft(
  data: z.infer<typeof CreateWorkoutParsed>
): TPublicApiCreateWorkoutDraft {
  return {
    source: data.source,
    external_id: data.external_id,
    started_at: data.started_at,
    ended_at: data.ended_at,
    title: data.title,
    description: optionalText(data.description),
    exercises: toExerciseDrafts(data.exercises),
  }
}

function toReplaceDraft(
  data: z.infer<typeof ReplaceWorkoutParsed>
): TPublicApiReplaceWorkoutDraft {
  return {
    started_at: data.started_at,
    ended_at: data.ended_at,
    title: data.title,
    description: optionalText(data.description),
    exercises: toExerciseDrafts(data.exercises),
  }
}
