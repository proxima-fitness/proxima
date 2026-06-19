/**
 * @module (app)/bolao/page
 *
 * Bolao score predictor page. Form collects match data and calls /api/bolao-predictor.
 *
 * Depends on: BolaoPredictorForm
 * Used by: Next.js (route "/bolao")
 */

import { BolaoPredictorForm } from '@/components/bolao/BolaoPredictorForm';

export const metadata = {
    title: 'Bolao Predictor | Proxima Fitness',
    description:
        'Enter match odds, scoring rules, and recent form to get an optimal bolao scoreline prediction.',
};

export default function BolaoPage() {
    return (
        <div className="min-h-screen bg-background px-4 py-10 text-foreground sm:py-16">
            <div className="mx-auto w-full max-w-3xl">
                <div className="mb-10 text-center">
                    <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                        Bolao Predictor
                    </h1>
                    <p className="mx-auto max-w-2xl text-muted-foreground">
                        Calibrate Poisson lambdas from market odds and recent form, then
                        maximize expected points for your scoring rules.
                    </p>
                </div>

                <div className="relative z-10 rounded-xl border border-border bg-card p-8 shadow-sm sm:p-12">
                    <BolaoPredictorForm />
                </div>
            </div>
        </div>
    );
}
