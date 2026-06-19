/**
 * @module bolao-predictor/route
 *
 * POST endpoint for bolao score prediction via Poisson calibration + EV maximization.
 * Port of docs/bolao_predictor.py.
 *
 * Depends on: @/lib/bolao-predictor
 */

import { NextResponse } from 'next/server';
import {
    type IBolaoMatchConfig,
    runBolaoPredictor,
} from '@/lib/bolao-predictor';

function isScoreTuple(value: unknown): value is [number, number] {
    return (
        Array.isArray(value) &&
        value.length === 2 &&
        typeof value[0] === 'number' &&
        typeof value[1] === 'number'
    );
}

function isBasePointsConfig(
    value: unknown,
): value is IBolaoMatchConfig['base_points'] {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const config = value as Record<string, unknown>;
    return (
        typeof config.team1_win === 'number' &&
        typeof config.draw === 'number' &&
        typeof config.team2_win === 'number'
    );
}

function isMarketProbabilities(
    value: unknown,
): value is IBolaoMatchConfig['market_probabilities'] {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const probabilities = value as Record<string, unknown>;
    return (
        typeof probabilities.team1_win === 'number' &&
        typeof probabilities.draw === 'number' &&
        typeof probabilities.team2_win === 'number'
    );
}

function parseMatchConfig(body: unknown): IBolaoMatchConfig | null {
    if (!body || typeof body !== 'object') {
        return null;
    }

    const payload = body as Record<string, unknown>;

    if (
        typeof payload.team1_name !== 'string' ||
        typeof payload.team2_name !== 'string' ||
        !isMarketProbabilities(payload.market_probabilities) ||
        !isBasePointsConfig(payload.base_points) ||
        !Array.isArray(payload.team1_history) ||
        !Array.isArray(payload.team2_history) ||
        !payload.team1_history.every(isScoreTuple) ||
        !payload.team2_history.every(isScoreTuple)
    ) {
        return null;
    }

    return {
        team1_name: payload.team1_name,
        team2_name: payload.team2_name,
        market_probabilities: payload.market_probabilities,
        base_points: payload.base_points,
        team1_history: payload.team1_history,
        team2_history: payload.team2_history,
    };
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const matchConfig = parseMatchConfig(body);

        if (!matchConfig) {
            return NextResponse.json(
                { error: 'Missing or invalid required fields' },
                { status: 400 },
            );
        }

        const result = runBolaoPredictor(matchConfig);
        return NextResponse.json(result);
    } catch (error) {
        if (error instanceof Error && error.message.includes('Market calibration failed')) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        console.error('Error in bolao predictor:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 },
        );
    }
}
