'use client';

/**
 * @module BolaoPredictorForm
 *
 * Client form for bolao score prediction. POSTs match config to /api/bolao-predictor.
 *
 * Depends on: @/lib/bolao-predictor types, shared UI components
 * Used by: (app)/bolao/page
 */

import { useState } from 'react';
import type {
    IBolaoMatchConfig,
    IBolaoPredictionResult,
} from '@/lib/bolao-predictor';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type TMatchRow = {
    scored: string;
    conceded: string;
};

const EMPTY_MATCH_ROW: TMatchRow = { scored: '', conceded: '' };

function parseHistoryRows(rows: TMatchRow[]): [number, number][] {
    return rows
        .map((row) => {
            const scored = Number(row.scored);
            const conceded = Number(row.conceded);
            if (
                Number.isNaN(scored) ||
                Number.isNaN(conceded) ||
                row.scored.trim() === '' ||
                row.conceded.trim() === ''
            ) {
                return null;
            }
            return [scored, conceded] as [number, number];
        })
        .filter((row): row is [number, number] => row !== null);
}

function MatchHistorySection({
    label,
    rows,
    onChange,
}: {
    label: string;
    rows: TMatchRow[];
    onChange: (rows: TMatchRow[]) => void;
}) {
    const updateRow = (index: number, field: keyof TMatchRow, value: string) => {
        const next = rows.map((row, rowIndex) =>
            rowIndex === index ? { ...row, [field]: value } : row,
        );
        onChange(next);
    };

    const addRow = () => {
        onChange([...rows, { scored: '', conceded: '' }]);
    };

    const removeRow = (index: number) => {
        if (rows.length <= 1) {
            return;
        }
        onChange(rows.filter((_, rowIndex) => rowIndex !== index));
    };

    return (
        <div className="space-y-3">
            <Label className="text-base font-medium">{label}</Label>
            <div className="space-y-2">
                {rows.map((row, index) => (
                    <div key={index} className="flex items-end gap-2">
                        <div className="grid flex-1 grid-cols-2 gap-2">
                            <div className="space-y-1">
                                {index === 0 && (
                                    <span className="text-xs text-muted-foreground">
                                        Scored
                                    </span>
                                )}
                                <Input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={row.scored}
                                    onChange={(event) =>
                                        updateRow(index, 'scored', event.target.value)
                                    }
                                    placeholder="0"
                                />
                            </div>
                            <div className="space-y-1">
                                {index === 0 && (
                                    <span className="text-xs text-muted-foreground">
                                        Conceded
                                    </span>
                                )}
                                <Input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={row.conceded}
                                    onChange={(event) =>
                                        updateRow(index, 'conceded', event.target.value)
                                    }
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="touch-manipulation"
                            onClick={() => removeRow(index)}
                            disabled={rows.length <= 1}
                        >
                            Remove
                        </Button>
                    </div>
                ))}
            </div>
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="touch-manipulation"
                onClick={addRow}
            >
                Add match
            </Button>
        </div>
    );
}

export function BolaoPredictorForm() {
    const [team1Name, setTeam1Name] = useState('');
    const [team2Name, setTeam2Name] = useState('');
    const [team1WinProb, setTeam1WinProb] = useState('');
    const [drawProb, setDrawProb] = useState('');
    const [team2WinProb, setTeam2WinProb] = useState('');
    const [team1WinPoints, setTeam1WinPoints] = useState('');
    const [drawPoints, setDrawPoints] = useState('');
    const [team2WinPoints, setTeam2WinPoints] = useState('');
    const [team1History, setTeam1History] = useState<TMatchRow[]>([
        { ...EMPTY_MATCH_ROW },
    ]);
    const [team2History, setTeam2History] = useState<TMatchRow[]>([
        { ...EMPTY_MATCH_ROW },
    ]);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<IBolaoPredictionResult | null>(null);

    const probabilitySum =
        Number(team1WinProb) + Number(drawProb) + Number(team2WinProb);
    const hasProbabilityInput =
        team1WinProb.trim() !== '' ||
        drawProb.trim() !== '' ||
        team2WinProb.trim() !== '';
    const showProbabilityWarning =
        hasProbabilityInput &&
        !Number.isNaN(probabilitySum) &&
        (probabilitySum < 0.99 || probabilitySum > 1.01);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        setResult(null);
        setIsLoading(true);

        try {
            const team1Win = Number(team1WinProb);
            const draw = Number(drawProb);
            const team2Win = Number(team2WinProb);
            const baseTeam1Win = Number(team1WinPoints);
            const baseDraw = Number(drawPoints);
            const baseTeam2Win = Number(team2WinPoints);

            if (
                !team1Name.trim() ||
                !team2Name.trim() ||
                Number.isNaN(team1Win) ||
                Number.isNaN(draw) ||
                Number.isNaN(team2Win) ||
                Number.isNaN(baseTeam1Win) ||
                Number.isNaN(baseDraw) ||
                Number.isNaN(baseTeam2Win)
            ) {
                setError('Fill in all required fields with valid numbers.');
                return;
            }

            const parsedTeam1History = parseHistoryRows(team1History);
            const parsedTeam2History = parseHistoryRows(team2History);

            const matchConfig: IBolaoMatchConfig = {
                team1_name: team1Name.trim(),
                team2_name: team2Name.trim(),
                market_probabilities: {
                    team1_win: team1Win,
                    draw,
                    team2_win: team2Win,
                },
                base_points: {
                    team1_win: baseTeam1Win,
                    draw: baseDraw,
                    team2_win: baseTeam2Win,
                },
                team1_history: parsedTeam1History,
                team2_history: parsedTeam2History,
            };

            const response = await fetch('/api/bolao-predictor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(matchConfig),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(
                    typeof data.error === 'string'
                        ? data.error
                        : 'Prediction failed. Please try again.',
                );
                return;
            }

            setResult(data as IBolaoPredictionResult);
        } catch (submitError) {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : 'Something went wrong. Please try again.',
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <form onSubmit={handleSubmit} className="space-y-8">
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Teams
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="team1-name">Team 1 (home)</Label>
                            <Input
                                id="team1-name"
                                value={team1Name}
                                onChange={(event) => setTeam1Name(event.target.value)}
                                disabled={isLoading}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="team2-name">Team 2 (away)</Label>
                            <Input
                                id="team2-name"
                                value={team2Name}
                                onChange={(event) => setTeam2Name(event.target.value)}
                                disabled={isLoading}
                                required
                            />
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Market probabilities
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Enter each probability as a decimal between 0 and 1 (e.g. 0.46
                            for 46%).
                        </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="team1-win-prob">Team 1 win</Label>
                            <Input
                                id="team1-win-prob"
                                type="number"
                                min={0}
                                max={1}
                                step={0.01}
                                value={team1WinProb}
                                onChange={(event) =>
                                    setTeam1WinProb(event.target.value)
                                }
                                disabled={isLoading}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="draw-prob">Draw</Label>
                            <Input
                                id="draw-prob"
                                type="number"
                                min={0}
                                max={1}
                                step={0.01}
                                value={drawProb}
                                onChange={(event) => setDrawProb(event.target.value)}
                                disabled={isLoading}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="team2-win-prob">Team 2 win</Label>
                            <Input
                                id="team2-win-prob"
                                type="number"
                                min={0}
                                max={1}
                                step={0.01}
                                value={team2WinProb}
                                onChange={(event) =>
                                    setTeam2WinProb(event.target.value)
                                }
                                disabled={isLoading}
                                required
                            />
                        </div>
                    </div>
                    {showProbabilityWarning && (
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                            Probabilities sum to {probabilitySum.toFixed(2)} — expected
                            close to 1.0.
                        </p>
                    )}
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Base points
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="team1-win-points">Team 1 win</Label>
                            <Input
                                id="team1-win-points"
                                type="number"
                                min={0}
                                step={1}
                                value={team1WinPoints}
                                onChange={(event) =>
                                    setTeam1WinPoints(event.target.value)
                                }
                                disabled={isLoading}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="draw-points">Draw</Label>
                            <Input
                                id="draw-points"
                                type="number"
                                min={0}
                                step={1}
                                value={drawPoints}
                                onChange={(event) => setDrawPoints(event.target.value)}
                                disabled={isLoading}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="team2-win-points">Team 2 win</Label>
                            <Input
                                id="team2-win-points"
                                type="number"
                                min={0}
                                step={1}
                                value={team2WinPoints}
                                onChange={(event) =>
                                    setTeam2WinPoints(event.target.value)
                                }
                                disabled={isLoading}
                                required
                            />
                        </div>
                    </div>
                </section>

                <section className="space-y-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Recent form
                    </h2>
                    <MatchHistorySection
                        label={`${team1Name || 'Team 1'} matches (scored, conceded)`}
                        rows={team1History}
                        onChange={setTeam1History}
                    />
                    <MatchHistorySection
                        label={`${team2Name || 'Team 2'} matches (scored, conceded)`}
                        rows={team2History}
                        onChange={setTeam2History}
                    />
                </section>

                {error && (
                    <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 text-base bg-lightSecondary font-semibold touch-manipulation"
                    size="lg"
                >
                    {isLoading ? (
                        <span className="inline-flex items-center gap-2">
                            <Spinner size="small" className="text-current" />
                            Predicting...
                        </span>
                    ) : (
                        'Get prediction'
                    )}
                </Button>
            </form>

            {result && (
                <Card>
                    <CardHeader>
                        <CardTitle>Prediction</CardTitle>
                        <CardDescription>
                            Calibrated from market odds and recent form
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    {result.team1_name} lambda
                                </p>
                                <p className="text-lg font-semibold">
                                    {result.team1_lambda.toFixed(3)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    {result.team2_name} lambda
                                </p>
                                <p className="text-lg font-semibold">
                                    {result.team2_lambda.toFixed(3)}
                                </p>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Optimal scoreline
                            </p>
                            <p className="text-2xl font-bold">
                                {result.team1_name} {result.optimal_prediction.team1_goals}{' '}
                                – {result.optimal_prediction.team2_goals}{' '}
                                {result.team2_name}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Expected value
                            </p>
                            <p className="text-lg font-semibold">
                                {result.expected_value.toFixed(3)} points
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
