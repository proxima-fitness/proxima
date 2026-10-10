/**
 * Agentic memory reads/writes against the OAuth user's RLS client (ADR 0034 / 02).
 * Mirrors landing `user-constraints` / `user-training-profile` / `body-measurements-read`
 * + Andy patch tools — no Gateway.
 */

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.108.2'
import { sanitizeExcludedEquipment } from '@proxima/mutation-constraint-gate'

import type {
  TUpdateConstraintProfileInput,
  TUpdateTrainingProfileInput,
} from './memory-schema.ts'

export type TConstraintPreferences = {
  splitType: string
  exerciseVariability: string
  progressionSystem: string
  deloadWeek: string
  peakWeek: string
  warmupExercises: string
}

export type TConstraintProfile = {
  injuries: string[]
  excludedEquipment: string[]
  excludedAreas: string[]
  preferences: TConstraintPreferences
  rawStatements: string[]
}

export type TTrainingProfile = {
  age: number | null
  sex: string
  heightCm: number | null
  experienceLevel: string
  physiquePhase: string
  trainingFocus: string
  activityLevel: string
  sessionDurationMin: number | null
}

export type TBodyMeasurement = {
  measured_on: string
  weight_kg: number | null
  lean_mass_kg: number | null
  fat_percent: number | null
  neck_cm: number | null
  shoulder_cm: number | null
  chest_cm: number | null
  left_bicep_cm: number | null
  right_bicep_cm: number | null
  left_forearm_cm: number | null
  right_forearm_cm: number | null
  abdomen: number | null
  waist: number | null
  hips: number | null
  left_thigh: number | null
  right_thigh: number | null
  left_calf: number | null
  right_calf: number | null
}

export type TUpdateResult<T> =
  | { status: 'ok'; profile: T }
  | { status: 'skipped'; reason: string }
  | { status: 'error'; error: string }

type TConstraintRow = {
  injuries: string[] | null
  excluded_equipment: string[] | null
  excluded_areas: string[] | null
  preferences: Record<string, string> | null
  raw_statements: string[] | null
}

type TTrainingRow = {
  age: number | null
  sex: string | null
  height_cm: number | string | null
  experience_level: string | null
  physique_phase: string | null
  training_focus: string | null
  activity_level: string | null
  session_duration_min: number | null
}

function emptyPreferences(): TConstraintPreferences {
  return {
    splitType: '',
    exerciseVariability: '',
    progressionSystem: '',
    deloadWeek: '',
    peakWeek: '',
    warmupExercises: '',
  }
}

export function emptyConstraintProfile(): TConstraintProfile {
  return {
    injuries: [],
    excludedEquipment: [],
    excludedAreas: [],
    preferences: emptyPreferences(),
    rawStatements: [],
  }
}

export function emptyTrainingProfile(): TTrainingProfile {
  return {
    age: null,
    sex: '',
    heightCm: null,
    experienceLevel: '',
    physiquePhase: '',
    trainingFocus: '',
    activityLevel: '',
    sessionDurationMin: null,
  }
}

function splitCsv(value?: string): string[] {
  if (!value) return []
  return value.split(',').map((s) => s.trim()).filter(Boolean)
}

function flattenTokens(values?: string[]): string[] {
  return (values ?? []).flatMap((v) => splitCsv(v))
}

/** Case-insensitive add/remove; CSV blobs in a single element are split. */
export function patchStringArray(
  arr: string[],
  add?: string[],
  remove?: string[]
): string[] {
  const addFlat = flattenTokens(add)
  const removeFlat = flattenTokens(remove)
  const removeSet = new Set(removeFlat.map((s) => s.toLowerCase()))
  const existing = new Set(arr.map((s) => s.toLowerCase()))
  return [
    ...arr.filter((s) => !removeSet.has(s.toLowerCase())),
    ...addFlat.filter(
      (s) => !existing.has(s.toLowerCase()) && !removeSet.has(s.toLowerCase())
    ),
  ]
}

function rowToConstraint(row: TConstraintRow): TConstraintProfile {
  const preferences = row.preferences ?? {}
  return {
    injuries: row.injuries ?? [],
    excludedEquipment: row.excluded_equipment ?? [],
    excludedAreas: row.excluded_areas ?? [],
    preferences: {
      splitType: preferences.splitType ?? '',
      exerciseVariability: preferences.exerciseVariability ?? '',
      progressionSystem: preferences.progressionSystem ?? '',
      deloadWeek: preferences.deloadWeek ?? '',
      peakWeek: preferences.peakWeek ?? '',
      warmupExercises: preferences.warmupExercises ?? '',
    },
    rawStatements: row.raw_statements ?? [],
  }
}

function rowToTraining(row: TTrainingRow): TTrainingProfile {
  return {
    age: row.age ?? null,
    sex: row.sex ?? '',
    heightCm: row.height_cm == null ? null : Number(row.height_cm),
    experienceLevel: row.experience_level ?? '',
    physiquePhase: row.physique_phase ?? '',
    trainingFocus: row.training_focus ?? '',
    activityLevel: row.activity_level ?? '',
    sessionDurationMin: row.session_duration_min ?? null,
  }
}

function trainingToRow(userId: string, profile: TTrainingProfile) {
  return {
    user_id: userId,
    age: profile.age,
    sex: profile.sex === '' ? null : profile.sex,
    height_cm: profile.heightCm,
    experience_level: profile.experienceLevel === '' ? null : profile.experienceLevel,
    physique_phase: profile.physiquePhase === '' ? null : profile.physiquePhase,
    training_focus: profile.trainingFocus === '' ? null : profile.trainingFocus,
    activity_level: profile.activityLevel === '' ? null : profile.activityLevel,
    session_duration_min: profile.sessionDurationMin,
  }
}

/**
 * Loads Constraint profile for the signed-in user, or null when no row.
 */
export async function getConstraintProfile(
  db: SupabaseClient,
  userId: string
): Promise<TConstraintProfile | null> {
  const { data, error } = await db
    .from('user_constraints')
    .select(
      'injuries, excluded_equipment, excluded_areas, preferences, raw_statements'
    )
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return rowToConstraint(data as TConstraintRow)
}

/**
 * Patch-upsert Constraint profile (Andy updateConstraintProfile semantics).
 */
export async function updateConstraintProfile(
  db: SupabaseClient,
  userId: string,
  patch: TUpdateConstraintProfileInput
): Promise<TUpdateResult<TConstraintProfile>> {
  const hasArrayChange = [
    patch.addInjuries,
    patch.removeInjuries,
    patch.addExcludedEquipment,
    patch.removeExcludedEquipment,
    patch.addExcludedAreas,
    patch.removeExcludedAreas,
  ].some((arr) => (arr?.length ?? 0) > 0)
  const hasPreferenceChange = Boolean(
    patch.preferences &&
      Object.values(patch.preferences).some(
        (v) => v === null || (typeof v === 'string' && v.trim() !== '')
      )
  )
  const hasRawStatement = Boolean(patch.rawStatement?.trim())

  if (!hasArrayChange && !hasPreferenceChange && !hasRawStatement) {
    return {
      status: 'skipped',
      reason: 'Nothing to persist - empty update skipped.',
    }
  }

  const current = (await getConstraintProfile(db, userId)) ?? emptyConstraintProfile()

  current.injuries = patchStringArray(
    current.injuries,
    patch.addInjuries,
    patch.removeInjuries
  )
  current.excludedEquipment = sanitizeExcludedEquipment(
    patchStringArray(
      current.excludedEquipment,
      patch.addExcludedEquipment,
      patch.removeExcludedEquipment
    )
  )
  current.excludedAreas = patchStringArray(
    current.excludedAreas,
    patch.addExcludedAreas,
    patch.removeExcludedAreas
  )

  if (patch.preferences) {
    for (const [key, value] of Object.entries(patch.preferences) as Array<
      [keyof TConstraintPreferences, string | null | undefined]
    >) {
      if (value === undefined) continue
      if (value === null || (typeof value === 'string' && value.trim() === '')) {
        if (value === null) current.preferences[key] = ''
        continue
      }
      current.preferences[key] = value
    }
  }

  const { error } = await db.from('user_constraints').upsert(
    {
      user_id: userId,
      injuries: current.injuries,
      excluded_equipment: current.excludedEquipment,
      excluded_areas: current.excludedAreas,
      preferences: current.preferences,
    },
    { onConflict: 'user_id' }
  )
  if (error) return { status: 'error', error: error.message }

  if (hasRawStatement && patch.rawStatement) {
    const { error: rpcError } = await db.rpc('append_raw_statement', {
      p_user_id: userId,
      p_statement: patch.rawStatement,
    })
    if (rpcError) return { status: 'error', error: rpcError.message }
    current.rawStatements = [...current.rawStatements, patch.rawStatement]
  }

  return { status: 'ok', profile: current }
}

/**
 * Loads Training profile for the signed-in user, or null when no row.
 */
export async function getTrainingProfile(
  db: SupabaseClient,
  userId: string
): Promise<TTrainingProfile | null> {
  const { data, error } = await db
    .from('user_training_profile')
    .select(
      'age, sex, height_cm, experience_level, physique_phase, training_focus, activity_level, session_duration_min'
    )
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return rowToTraining(data as TTrainingRow)
}

/**
 * Patch-upsert Training profile (Andy updateTrainingProfile semantics).
 */
export async function updateTrainingProfile(
  db: SupabaseClient,
  userId: string,
  patch: TUpdateTrainingProfileInput
): Promise<TUpdateResult<TTrainingProfile>> {
  const keys = [
    'age',
    'sex',
    'heightCm',
    'experienceLevel',
    'physiquePhase',
    'trainingFocus',
    'activityLevel',
    'sessionDurationMin',
  ] as const

  const provided = keys.filter((key) => patch[key] !== undefined)
  if (provided.length === 0) {
    return {
      status: 'skipped',
      reason: 'Nothing to persist - empty update skipped.',
    }
  }

  const current = (await getTrainingProfile(db, userId)) ?? emptyTrainingProfile()

  for (const key of provided) {
    const value = patch[key]
    if (key === 'age' || key === 'heightCm' || key === 'sessionDurationMin') {
      current[key] = value as number | null
    } else if (key === 'sex') {
      current.sex = (value ?? '') as string
    } else if (key === 'experienceLevel') {
      current.experienceLevel = (value ?? '') as string
    } else if (key === 'physiquePhase') {
      current.physiquePhase = (value ?? '') as string
    } else if (key === 'trainingFocus') {
      current.trainingFocus = (value ?? '') as string
    } else if (key === 'activityLevel') {
      current.activityLevel = (value ?? '') as string
    }
  }

  if (
    current.sessionDurationMin != null &&
    current.sessionDurationMin % 10 !== 0
  ) {
    current.sessionDurationMin = Math.round(current.sessionDurationMin / 10) * 10
  }

  const { error } = await db
    .from('user_training_profile')
    .upsert(trainingToRow(userId, current), { onConflict: 'user_id' })
  if (error) return { status: 'error', error: error.message }

  return { status: 'ok', profile: current }
}

/**
 * Newest backed-up body measurement, or null when none.
 */
export async function getLatestBodyMeasurement(
  db: SupabaseClient,
  userId: string
): Promise<TBodyMeasurement | null> {
  const { data, error } = await db
    .from('body_measurements')
    .select(
      'measured_on, weight_kg, lean_mass_kg, fat_percent, neck_cm, shoulder_cm, chest_cm, left_bicep_cm, right_bicep_cm, left_forearm_cm, right_forearm_cm, abdomen, waist, hips, left_thigh, right_thigh, left_calf, right_calf'
    )
    .eq('user_id', userId)
    .order('measured_on', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return data as TBodyMeasurement
}
