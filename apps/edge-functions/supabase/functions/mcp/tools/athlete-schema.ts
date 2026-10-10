/**
 * Zod contracts for Proxima MCP athlete read tools (ADR 0034 / 11).
 * Names pinned in 09-widen-host-surfaces.md.
 */

import { z } from 'npm:zod@4'

export const ListWorkoutsInput = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(30)
    .optional()
    .describe('Page size (default 15, max 30). Newest-first backed-up Workouts.'),
  since: z
    .string()
    .optional()
    .describe('Optional ISO lower bound on started_at.'),
  cursor_started_at: z
    .string()
    .optional()
    .describe('Keyset cursor started_at from a prior next_cursor.'),
  cursor_id: z
    .string()
    .optional()
    .describe('Keyset cursor workout id from a prior next_cursor.'),
  preview: z
    .boolean()
    .optional()
    .describe('When true, cap exercises at 3 per workout (browse preview).'),
})

export const GetProfileStatisticsInput = z.object({
  weeks: z
    .union([z.literal(4), z.literal(12)])
    .optional()
    .describe('Chart window: 4 or 12 Sunday-start weeks (US ET). Default 4.'),
})

export const GetProfileCalendarInput = z.object({
  year: z.number().int().min(1970).max(2100).describe('Local calendar year.'),
  month: z.number().int().min(1).max(12).describe('Local calendar month (1-12).'),
  timezone_offset_minutes: z
    .number()
    .int()
    .min(-840)
    .max(840)
    .describe(
      'Date.getTimezoneOffset() minutes from the athlete locale (positive west of UTC).'
    ),
})

export const ListBodyMeasurementsInput = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(60)
    .optional()
    .describe('Page size (default 30, max 60). Newest-first.'),
  since: z
    .string()
    .optional()
    .describe('Inclusive lower bound on measured_on (YYYY-MM-DD).'),
  until: z
    .string()
    .optional()
    .describe('Inclusive upper bound on measured_on (YYYY-MM-DD).'),
  cursor_measured_on: z
    .string()
    .optional()
    .describe('Keyset cursor measured_on from a prior next_cursor.'),
  cursor_id: z
    .string()
    .optional()
    .describe('Keyset cursor row id from a prior next_cursor.'),
})

export const GetBlindSpotAnalysisInput = z.object({
  exercise_template_ids: z
    .array(z.string())
    .optional()
    .describe(
      'Optional Hevy exercise template ids to analyze. Omit for all templates with backup sessions.'
    ),
})

export type TListWorkoutsInput = z.infer<typeof ListWorkoutsInput>
export type TGetProfileStatisticsInput = z.infer<typeof GetProfileStatisticsInput>
export type TGetProfileCalendarInput = z.infer<typeof GetProfileCalendarInput>
export type TListBodyMeasurementsInput = z.infer<typeof ListBodyMeasurementsInput>
export type TGetBlindSpotAnalysisInput = z.infer<typeof GetBlindSpotAnalysisInput>
