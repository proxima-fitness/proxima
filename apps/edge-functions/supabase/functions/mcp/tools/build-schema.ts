/**
 * Zod contracts for Proxima MCP First build (`build_program`, ADR 0034 / 03).
 * Wave refine mirrors landing `periodization-wave.ts` (no Gateway).
 */

import { z } from 'npm:zod@4'

const EXERCISE_ROLES = ['main', 'accessory', 'warmup'] as const

const periodizationDeltaSchema = z.object({
  rpeDelta: z.number().int().describe('Integer RPE change from week 1 for this role.'),
  setCountDelta: z
    .number()
    .int()
    .describe('Integer working-set count change from week 1 for this role.'),
})

const mainRepRangeSchema = z.object({
  start: z.number().int().min(1),
  end: z.number().int().min(1),
})

const periodizationWeekSchema = z.object({
  week: z.number().int().min(1).describe('1-based week index.'),
  main: periodizationDeltaSchema.describe(
    'Main-lift RPE and set-count deltas from week 1.'
  ),
  accessory: periodizationDeltaSchema
    .optional()
    .describe(
      'Accessory deltas. Required only on claimed deload / unload / taper / peak weeks.'
    ),
  mainRepRange: mainRepRangeSchema
    .nullable()
    .optional()
    .describe(
      'Absolute main-lift rep range. Only on a Block boundary after week 1.'
    ),
})

const periodizationWaveSchema = z.object({
  weeks: z
    .array(periodizationWeekSchema)
    .min(1)
    .describe('One row per 1-based week; length must equal durationWeeks.'),
})

const planBlockSchema = z.object({
  name: z.string().min(1),
  weeks: z.array(z.number().int().min(1)).min(1),
  intent: z.string().min(1),
})

type TWaveBlock = z.infer<typeof planBlockSchema>
type TPeriodizationWave = z.infer<typeof periodizationWaveSchema>

const ACCESSORY_WEEK_RE = /\b(deload|unload|taper|peak)\b/i

function blockBoundaryWeeks(blocks: TWaveBlock[]): Set<number> {
  const boundaries = new Set<number>()
  for (const block of blocks) {
    if (block.weeks.length === 0) continue
    const first = Math.min(...block.weeks)
    if (first > 1) boundaries.add(first)
  }
  return boundaries
}

function blockOwningWeek(
  blocks: TWaveBlock[],
  week: number
): TWaveBlock | undefined {
  let found: TWaveBlock | undefined
  for (const block of blocks) {
    if (block.weeks.includes(week)) found = block
  }
  return found
}

function weekNeedsAccessory(block: TWaveBlock | undefined): boolean {
  if (!block) return false
  return ACCESSORY_WEEK_RE.test(`${block.name} ${block.intent}`)
}

function refinePeriodizationWave(
  data: {
    durationWeeks: number
    blocks: TWaveBlock[]
    periodizationWave: TPeriodizationWave
  },
  ctx: z.RefinementCtx
): void {
  const { durationWeeks, blocks, periodizationWave } = data
  const rows = periodizationWave.weeks
  const seen = new Set<number>()
  let identityOk = rows.length === durationWeeks

  for (const row of rows) {
    if (row.week < 1 || row.week > durationWeeks || seen.has(row.week)) {
      identityOk = false
    }
    seen.add(row.week)
  }
  if (seen.size !== durationWeeks) identityOk = false

  if (!identityOk) {
    ctx.addIssue({
      code: 'custom',
      message: `periodizationWave.weeks must list weeks 1..${durationWeeks} exactly once`,
      path: ['periodizationWave', 'weeks'],
    })
  }

  const boundaries = blockBoundaryWeeks(blocks)

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const path = ['periodizationWave', 'weeks', i] as const
    const hasAccessory = row.accessory !== undefined
    const hasMainRepRange = row.mainRepRange != null

    if (row.week === 1) {
      if (row.main.rpeDelta !== 0 || row.main.setCountDelta !== 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'Week 1 main rpeDelta and setCountDelta must both be 0',
          path: [...path, 'main'],
        })
      }
      if (hasAccessory) {
        ctx.addIssue({
          code: 'custom',
          message: 'Week 1 must not include accessory',
          path: [...path, 'accessory'],
        })
      }
      if (hasMainRepRange) {
        ctx.addIssue({
          code: 'custom',
          message: 'Week 1 must not include mainRepRange',
          path: [...path, 'mainRepRange'],
        })
      }
      continue
    }

    const needsAccessory = weekNeedsAccessory(blockOwningWeek(blocks, row.week))
    if (needsAccessory !== hasAccessory) {
      ctx.addIssue({
        code: 'custom',
        message: needsAccessory
          ? `Week ${row.week} accessory is required on a deload / unload / taper / peak week`
          : `Week ${row.week} accessory is only allowed on a deload / unload / taper / peak week`,
        path: [...path, 'accessory'],
      })
    }

    const mainsFlat = row.main.rpeDelta === 0 && row.main.setCountDelta === 0
    if (mainsFlat && !hasMainRepRange) {
      ctx.addIssue({
        code: 'custom',
        message: `Week ${row.week} mains must change from week 1: set a nonzero main rpeDelta or setCountDelta, or a mainRepRange on a Block boundary`,
        path: [...path, 'main'],
      })
    }

    if (hasMainRepRange && !boundaries.has(row.week)) {
      ctx.addIssue({
        code: 'custom',
        message: `Week ${row.week} mainRepRange is only allowed on a Block boundary`,
        path: [...path, 'mainRepRange'],
      })
    }
  }
}

const setSchema = z.object({
  type: z.enum(['normal', 'warmup', 'dropset', 'failure']),
  reps: z.number().nullable(),
  rep_range: z
    .object({
      start: z.number().int().min(1),
      end: z.number().int().min(1),
    })
    .nullable(),
  rpe: z.number().min(1).max(10),
  weight_kg: z.number().optional(),
})

const exerciseSchema = z.object({
  exercise_template_id: z.string().min(1),
  title: z.string().min(1),
  notes: z.string().default(''),
  rest_seconds: z.string().default('90'),
  supersets_id: z.number().nullable().default(null),
  role: z.enum(EXERCISE_ROLES),
  sets: z.array(setSchema).min(1),
})

const routineSchema = z.object({
  dayNumber: z.number().int().min(1),
  title: z.string().min(1),
  notes: z.string().default(''),
  exercises: z.array(exerciseSchema).min(1),
})

/**
 * First build input: plan + required Periodization wave + week 1 routines.
 * No expandHevyShareSeed (Andy grid path) — host authors week 1 in the call.
 */
const BuildProgramObject = z.object({
  title: z
    .string()
    .min(1)
    .max(200)
    .optional()
    .describe(
      'Proxima program title. Defaults to goal when omitted.'
    ),
  durationWeeks: z.number().int().min(1).max(52),
  goal: z.string().min(1).max(500),
  daysPerWeek: z.number().int().min(1).max(7),
  blocks: z.array(planBlockSchema).min(1),
  periodizationWave: periodizationWaveSchema,
  notes: z.array(z.string()).optional(),
  totalDays: z.number().int().min(1).max(7),
  routines: z.array(routineSchema).min(1),
})

type TBuildProgramObject = z.infer<typeof BuildProgramObject>

function refineBuildProgram(
  data: TBuildProgramObject,
  ctx: z.RefinementCtx
): void {
  refinePeriodizationWave(data, ctx)
  if (data.routines.length !== data.totalDays) {
    ctx.addIssue({
      code: 'custom',
      message: `routines length (${data.routines.length}) must equal totalDays (${data.totalDays})`,
      path: ['routines'],
    })
  }
  if (data.routines.length !== data.daysPerWeek) {
    ctx.addIssue({
      code: 'custom',
      message: `routines length (${data.routines.length}) must equal daysPerWeek (${data.daysPerWeek})`,
      path: ['routines'],
    })
  }
}

export const BuildProgramInput = BuildProgramObject.superRefine(refineBuildProgram)

export type TBuildProgramInput = z.infer<typeof BuildProgramInput>
export type TPeriodizationWaveInput = TPeriodizationWave
export type TExerciseRole = (typeof EXERCISE_ROLES)[number]
