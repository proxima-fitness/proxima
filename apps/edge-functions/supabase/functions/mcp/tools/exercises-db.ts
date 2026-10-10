/**
 * Exercise list/create against the OAuth user's RLS client (ADR 0033 / 02).
 * Behavior mirrors listPublicApiExercises + mintCustomMovement, without service role.
 */

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.108.2'
import {
  exerciseMatchKey,
  normalizeExerciseTitle,
} from '@proxima/exercise-identity'

import type { TPublicApiExercise, TPublicApiExerciseList } from './exercise-schema.ts'

const CATALOG_COLUMNS =
  'id, title, exercise_type, equipment, primary_muscle_group, secondary_muscle_groups' as const

const UNIQUE_VIOLATION = '23505'

type TCatalogRow = {
  id: string
  title: string
  exercise_type: string | null
  equipment: string | null
  primary_muscle_group: string | null
  secondary_muscle_groups: string[] | null
}

export type TCustomExerciseDraft = {
  title: string
  exercise_type: string | null
  equipment: string | null
  primary_muscle_group: string | null
  secondary_muscle_groups: string[] | null
}

/**
 * Lists Canonical exercises visible under RLS (globals + caller's Custom exercises).
 * Response omits `user_id`. Pagination matches Public API (`page` / `page_size` / `has_more`).
 */
export async function listExercises(
  db: SupabaseClient,
  options: { page: number; pageSize: number }
): Promise<TPublicApiExerciseList> {
  const from = (options.page - 1) * options.pageSize
  const to = from + options.pageSize

  const { data, error } = await db
    .from('canonical_exercises')
    .select(CATALOG_COLUMNS)
    .order('title', { ascending: true })
    .order('id', { ascending: true })
    .range(from, to)

  if (error) {
    throw error
  }
  if (!data) {
    throw new Error('Failed to list exercises')
  }

  const rows = data as TCatalogRow[]
  const hasMore = rows.length > options.pageSize
  const pageRows = hasMore ? rows.slice(0, options.pageSize) : rows

  return {
    exercises: pageRows.map(toPublicApiExercise),
    page: options.page,
    page_size: options.pageSize,
    has_more: hasMore,
  }
}

/**
 * Mints — or finds — this athlete's Custom exercise. Never inserts a global.
 */
export async function createCustomExercise(
  db: SupabaseClient,
  userId: string,
  draft: TCustomExerciseDraft
): Promise<string> {
  const title = draft.title.trim()
  if (!title) {
    throw new Error('Cannot mint a Custom exercise without a title')
  }

  const normalizedTitle = normalizeExerciseTitle(title)

  const existing = await lookupOwnCustomExercise(db, userId, normalizedTitle)
  if (existing) {
    return existing
  }

  const id = crypto.randomUUID()
  const { error } = await db.from('canonical_exercises').insert({
    id,
    user_id: userId,
    title,
    normalized_title: normalizedTitle,
    match_key: exerciseMatchKey(title),
    exercise_type: draft.exercise_type,
    primary_muscle_group: draft.primary_muscle_group,
    secondary_muscle_groups: draft.secondary_muscle_groups,
    equipment: draft.equipment,
  })

  if (!error) {
    return id
  }

  if ((error as { code?: string }).code !== UNIQUE_VIOLATION) {
    throw error
  }

  const winner = await lookupOwnCustomExercise(db, userId, normalizedTitle)
  if (!winner) {
    throw error
  }
  return winner
}

async function lookupOwnCustomExercise(
  db: SupabaseClient,
  userId: string,
  normalizedTitle: string
): Promise<string | null> {
  const { data, error } = await db
    .from('canonical_exercises')
    .select('id')
    .eq('user_id', userId)
    .eq('normalized_title', normalizedTitle)
    .maybeSingle()

  if (error) {
    throw error
  }
  return data?.id ?? null
}

function toPublicApiExercise(row: TCatalogRow): TPublicApiExercise {
  return {
    id: row.id,
    title: row.title,
    exercise_type: row.exercise_type,
    equipment: row.equipment,
    primary_muscle_group: row.primary_muscle_group,
    secondary_muscle_groups: row.secondary_muscle_groups,
  }
}
