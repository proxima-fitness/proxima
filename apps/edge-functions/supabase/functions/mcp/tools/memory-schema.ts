/**
 * Zod contracts for Proxima MCP Agentic memory tools (ADR 0034 / 02).
 * Preference / Training catalogs mirror landing questionnaire option ids.
 */

import { z } from 'npm:zod@4'

export const EmptyInput = z.object({})

const SPLIT_TYPE = ['default', 'ppl', 'pplul', 'ul', 'fb', 'other'] as const
const EXERCISE_VARIABILITY = ['little', 'lots'] as const
const PROGRESSION_SYSTEM = [
  'default',
  'linear',
  'double',
  'rpe-based',
  'wave-loading',
  'density',
  'other',
] as const
const YES_NO = ['yes', 'no'] as const

function preferenceField(values: readonly [string, ...string[]], label: string) {
  return z
    .enum(values)
    .nullable()
    .optional()
    .describe(
      `${label}: catalog id (${values.join(', ')}), or null to clear on User-stated change only.`
    )
}

export const UpdateConstraintProfileInput = z.object({
  addInjuries: z
    .array(z.string())
    .optional()
    .describe(
      'Injuries & health issues only (pain, surgery, movement limits). Not periodization notes.'
    ),
  removeInjuries: z
    .array(z.string())
    .optional()
    .describe('Remove only on User-stated change.'),
  addExcludedEquipment: z
    .array(z.string())
    .optional()
    .describe(
      'Equipment to exclude (Hevy values: barbell, dumbbell, kettlebell, machine, plate, resistance_band, suspension, other).'
    ),
  removeExcludedEquipment: z
    .array(z.string())
    .optional()
    .describe('Allow again only on User-stated change.'),
  addExcludedAreas: z.array(z.string()).optional().describe('Muscle areas to exclude.'),
  removeExcludedAreas: z
    .array(z.string())
    .optional()
    .describe('Allow again only on User-stated change.'),
  preferences: z
    .object({
      splitType: preferenceField(SPLIT_TYPE, 'Preferred split'),
      exerciseVariability: preferenceField(EXERCISE_VARIABILITY, 'Exercise variability'),
      progressionSystem: preferenceField(PROGRESSION_SYSTEM, 'Progression system'),
      deloadWeek: preferenceField(YES_NO, 'Deload week'),
      peakWeek: preferenceField(YES_NO, 'Peak week'),
      warmupExercises: preferenceField(YES_NO, 'Warmup exercises'),
    })
    .optional()
    .describe('Only provided keys change. null clears on User-stated change only.'),
  rawStatement: z
    .string()
    .optional()
    .describe("User's exact words expressing this constraint (appended to audit trail)."),
})

export type TUpdateConstraintProfileInput = z.infer<typeof UpdateConstraintProfileInput>

export const UpdateTrainingProfileInput = z.object({
  age: z
    .number()
    .int()
    .min(14)
    .max(100)
    .nullable()
    .optional()
    .describe('Age in years (14-100). null clears on User-stated change only.'),
  sex: z
    .enum(['male', 'female'])
    .nullable()
    .optional()
    .describe('male | female. null clears / prefer-not-to-say on User-stated change only.'),
  heightCm: z
    .number()
    .min(120)
    .max(230)
    .nullable()
    .optional()
    .describe('Height in centimeters. null clears on User-stated change only.'),
  experienceLevel: z
    .enum(['beginner', 'novice', 'intermediate', 'advanced'])
    .nullable()
    .optional()
    .describe('Experience level catalog id. null clears on User-stated change only.'),
  physiquePhase: z
    .enum(['bulk', 'cut', 'maintain', 'recomp'])
    .nullable()
    .optional()
    .describe('Physique phase catalog id. null clears on User-stated change only.'),
  trainingFocus: z
    .enum([
      'bodybuilding',
      'powerbuilding',
      'powerlifting',
      'hyrox',
      'crossfit',
      'olympic_weightlifting',
      'calisthenics_bodyweight',
      'athletics_sport',
      'fat_loss',
      'general_fitness',
      'rehab_pain_aware',
    ])
    .nullable()
    .optional()
    .describe('Training focus catalog id. null clears on User-stated change only.'),
  activityLevel: z
    .enum(['sedentary', 'light', 'moderate', 'high', 'extreme'])
    .nullable()
    .optional()
    .describe('Activity level short form. null clears on User-stated change only.'),
  sessionDurationMin: z
    .number()
    .int()
    .min(10)
    .max(180)
    .nullable()
    .optional()
    .describe('Session duration cap in minutes (10-180). null clears on User-stated change only.'),
})

export type TUpdateTrainingProfileInput = z.infer<typeof UpdateTrainingProfileInput>
