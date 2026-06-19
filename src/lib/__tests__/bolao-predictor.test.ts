import { describe, expect, it } from 'vitest';

import {
    calibrateLambdas,
    normalizeMarketProbabilities,
    runBolaoPredictor,
} from '@/lib/bolao-predictor';

const NETHERLANDS_CONFIG = {
    team1_name: 'Netherlands',
    team2_name: 'Sweden',
    market_probabilities: { team1_win: 0.55, draw: 0.25, team2_win: 0.2 },
    base_points: { team1_win: 3, draw: 6, team2_win: 6 },
    team1_history: [[2, 0], [1, 1], [3, 0], [2, 1], [1, 0]] as [number, number][],
    team2_history: [[0, 1], [1, 2], [0, 0], [1, 1], [0, 2]] as [number, number][],
};

describe('bolao-predictor calibration', () => {
    it('matches Python output for decimal probabilities', () => {
        const result = runBolaoPredictor(NETHERLANDS_CONFIG);

        expect(result.team1_lambda).toBeCloseTo(1.601, 2);
        expect(result.team2_lambda).toBeCloseTo(0.855, 2);
        expect(result.optimal_prediction).toEqual({
            team1_goals: 1,
            team2_goals: 0,
        });
        expect(result.expected_value).toBeCloseTo(3.724, 2);
    });

    it('normalizes percentage-scale probabilities to decimals', () => {
        const normalized = normalizeMarketProbabilities({
            team1_win: 55,
            draw: 25,
            team2_win: 20,
        });

        expect(normalized).toEqual({
            team1_win: 0.55,
            draw: 0.25,
            team2_win: 0.2,
        });

        const result = runBolaoPredictor({
            ...NETHERLANDS_CONFIG,
            market_probabilities: {
                team1_win: 55,
                draw: 25,
                team2_win: 20,
            },
        });

        expect(result.team1_lambda).toBeCloseTo(1.601, 2);
        expect(result.optimal_prediction).toEqual({
            team1_goals: 1,
            team2_goals: 0,
        });
    });

    it('throws when probabilities are outside 0-1', () => {
        expect(() => calibrateLambdas(46, 29, 1.6, 0.85)).toThrow(
            /must be between 0 and 1/,
        );
    });

    it('calibrates when recent form average is zero', () => {
        const result = runBolaoPredictor({
            ...NETHERLANDS_CONFIG,
            team1_history: [[0, 1], [0, 2], [0, 0]],
            team2_history: [[0, 1], [1, 0]],
        });

        expect(result.team1_lambda).toBeCloseTo(1.601, 2);
        expect(result.optimal_prediction).toEqual({
            team1_goals: 1,
            team2_goals: 0,
        });
    });
});
