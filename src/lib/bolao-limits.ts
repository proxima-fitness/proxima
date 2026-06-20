/**
 * @module lib/bolao-limits
 *
 * Shared types and pure helpers for bolao predictor daily usage limits.
 *
 * Depends on: none
 * Used by: api/bolao-limits, lib/server-bolao-limits
 */

export const BOLAO_DAILY_LIMIT = 1;

export type TBolaoPredictorLimits = {
    usedToday: boolean;
    remainingToday: number;
    unlimited: boolean;
};

export type TBolaoPredictorLimitsRow = {
    used_today: boolean;
    remaining_today: number;
};

export type TBolaoConsumeResult = {
    allowed: boolean;
};

export function unlimitedBolaoPredictorLimits(): TBolaoPredictorLimits {
    return {
        usedToday: false,
        remainingToday: BOLAO_DAILY_LIMIT,
        unlimited: true,
    };
}

export function mapBolaoPredictorLimitsRow(
    row: TBolaoPredictorLimitsRow | null | undefined,
): TBolaoPredictorLimits {
    if (!row) {
        return {
            usedToday: false,
            remainingToday: BOLAO_DAILY_LIMIT,
            unlimited: false,
        };
    }

    return {
        usedToday: row.used_today,
        remainingToday: row.remaining_today,
        unlimited: false,
    };
}

export function mapBolaoConsumeRow(
    row: TBolaoConsumeResult | null | undefined,
): boolean {
    return row?.allowed === true;
}
