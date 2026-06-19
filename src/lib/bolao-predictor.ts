/**
 * @module lib/bolao-predictor
 *
 * Poisson-based bolao score predictor. TypeScript port of docs/bolao_predictor.py.
 *
 * Depends on: none
 */

export interface IBasePointsConfig {
    team1_win: number;
    draw: number;
    team2_win: number;
}

export interface IMarketProbabilities {
    team1_win: number;
    draw: number;
    team2_win: number;
}

export interface IBolaoMatchConfig {
    team1_name: string;
    team2_name: string;
    market_probabilities: IMarketProbabilities;
    base_points: IBasePointsConfig;
    team1_history: [number, number][];
    team2_history: [number, number][];
}

export interface IBolaoPredictionResult {
    team1_name: string;
    team2_name: string;
    team1_lambda: number;
    team2_lambda: number;
    optimal_prediction: {
        team1_goals: number;
        team2_goals: number;
    };
    expected_value: number;
}

function factorial(k: number): number {
    let result = 1;
    for (let i = 2; i <= k; i++) {
        result *= i;
    }
    return result;
}

export function poissonPmf(k: number, lambda: number): number {
    return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

export function calcProbabilities(
    lam1: number,
    lam2: number,
    maxGoals = 10,
): [number, number] {
    let pWin = 0.0;
    let pDraw = 0.0;

    for (let x = 0; x <= maxGoals; x++) {
        for (let y = 0; y <= maxGoals; y++) {
            const prob = poissonPmf(x, lam1) * poissonPmf(y, lam2);
            if (x > y) {
                pWin += prob;
            } else if (x === y) {
                pDraw += prob;
            }
        }
    }

    return [pWin, pDraw];
}

export function marketCalibrationEquations(
    lambdas: [number, number],
    targetPWin: number,
    targetPDraw: number,
    maxGoals = 10,
): [number, number] {
    const [lam1, lam2] = lambdas;
    if (lam1 <= 0 || lam2 <= 0) {
        return [1e6, 1e6];
    }
    const [pWin, pDraw] = calcProbabilities(lam1, lam2, maxGoals);
    return [pWin - targetPWin, pDraw - targetPDraw];
}

function fsolve(
    equations: (
        lambdas: [number, number],
        targetPWin: number,
        targetPDraw: number,
    ) => [number, number],
    initialGuess: [number, number],
    targetPWin: number,
    targetPDraw: number,
): [number, number] {
    const maxIter = 100;
    const tol = 1.49012e-8;
    const h = 1e-8;
    let x: [number, number] = [initialGuess[0], initialGuess[1]];

    for (let iter = 0; iter < maxIter; iter++) {
        const [f0, f1] = equations(x, targetPWin, targetPDraw);
        if (Math.abs(f0) < tol && Math.abs(f1) < tol) {
            break;
        }

        const [f0Dx0, f1Dx0] = equations([x[0] + h, x[1]], targetPWin, targetPDraw);
        const [f0Dx1, f1Dx1] = equations([x[0], x[1] + h], targetPWin, targetPDraw);

        const j00 = (f0Dx0 - f0) / h;
        const j01 = (f0Dx1 - f0) / h;
        const j10 = (f1Dx0 - f1) / h;
        const j11 = (f1Dx1 - f1) / h;

        const det = j00 * j11 - j01 * j10;
        if (Math.abs(det) < 1e-14) {
            break;
        }

        const delta0 = (-f0 * j11 - -f1 * j01) / det;
        const delta1 = (j00 * -f1 - -f0 * j10) / det;

        x = [x[0] + delta0, x[1] + delta1];
    }

    return x;
}

export function calibrateLambdas(
    targetPWin: number,
    targetPDraw: number,
    initialLam1: number,
    initialLam2: number,
): [number, number] {
    const initialGuess: [number, number] = [initialLam1, initialLam2];
    const calibratedLambdas = fsolve(
        marketCalibrationEquations,
        initialGuess,
        targetPWin,
        targetPDraw,
    );
    return [
        Math.max(0.01, calibratedLambdas[0]),
        Math.max(0.01, calibratedLambdas[1]),
    ];
}

export function calculatePayout(
    xP: number,
    yP: number,
    xA: number,
    yA: number,
    basePointsConfig: IBasePointsConfig,
): number {
    if (Math.sign(xP - yP) !== Math.sign(xA - yA)) {
        return 0;
    }

    let points: number;
    if (xP > yP) {
        points = basePointsConfig.team1_win;
    } else if (xP === yP) {
        points = basePointsConfig.draw;
    } else {
        points = basePointsConfig.team2_win;
    }

    if (xP === xA && yP === yA) {
        points += 5;
    }

    if (Math.max(xP, yP) === Math.max(xA, yA)) {
        points += 3;
    }

    if (xP - yP === xA - yA) {
        points += 2;
    }

    if (Math.min(xP, yP) === Math.min(xA, yA)) {
        points += 1;
    }

    if (Math.abs(xA - yA) >= 3) {
        points += 1;
    }

    return points;
}

export function findOptimalPrediction(
    lam1: number,
    lam2: number,
    basePointsConfig: IBasePointsConfig,
    maxGoals = 10,
): [[number, number], number] {
    let bestEv = -1;
    let bestPrediction: [number, number] = [0, 0];

    const probMatrix: number[][] = Array.from({ length: maxGoals + 1 }, () =>
        Array<number>(maxGoals + 1).fill(0),
    );

    for (let xA = 0; xA <= maxGoals; xA++) {
        for (let yA = 0; yA <= maxGoals; yA++) {
            probMatrix[xA][yA] = poissonPmf(xA, lam1) * poissonPmf(yA, lam2);
        }
    }

    for (let xP = 0; xP <= maxGoals; xP++) {
        for (let yP = 0; yP <= maxGoals; yP++) {
            let expectedValue = 0.0;

            for (let xA = 0; xA <= maxGoals; xA++) {
                for (let yA = 0; yA <= maxGoals; yA++) {
                    const pActual = probMatrix[xA][yA];
                    if (pActual < 1e-6) {
                        continue;
                    }

                    const payout = calculatePayout(
                        xP,
                        yP,
                        xA,
                        yA,
                        basePointsConfig,
                    );
                    expectedValue += pActual * payout;
                }
            }

            if (expectedValue > bestEv) {
                bestEv = expectedValue;
                bestPrediction = [xP, yP];
            }
        }
    }

    return [bestPrediction, bestEv];
}

function mean(values: number[]): number {
    if (values.length === 0) {
        return 0;
    }
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function runBolaoPredictor(
    matchConfig: IBolaoMatchConfig,
): IBolaoPredictionResult {
    const t1Sc = matchConfig.team1_history.map((match) => match[0]);
    const t2Sc = matchConfig.team2_history.map((match) => match[0]);

    const lambda1_0 = t1Sc.length > 0 ? mean(t1Sc) : 1.5;
    const lambda2_0 = t2Sc.length > 0 ? mean(t2Sc) : 1.5;

    const targetPW = matchConfig.market_probabilities.team1_win;
    const targetPD = matchConfig.market_probabilities.draw;

    const [lam1, lam2] = calibrateLambdas(
        targetPW,
        targetPD,
        lambda1_0,
        lambda2_0,
    );

    const [optScore, maxEv] = findOptimalPrediction(
        lam1,
        lam2,
        matchConfig.base_points,
    );

    return {
        team1_name: matchConfig.team1_name,
        team2_name: matchConfig.team2_name,
        team1_lambda: lam1,
        team2_lambda: lam2,
        optimal_prediction: {
            team1_goals: optScore[0],
            team2_goals: optScore[1],
        },
        expected_value: maxEv,
    };
}
