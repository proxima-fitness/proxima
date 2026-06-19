/**
 * @module (app)/bolao/page
 *
 * Bolao score predictor page. Form collects match data and calls /api/bolao-predictor.
 *
 * Depends on: BolaoPredictorForm
 * Used by: Next.js (route "/bolao")
 */

import { BolaoPredictorForm } from '@/components/bolao/BolaoPredictorForm';
import styles from '@/style';

export const metadata = {
    title: 'Bolao Predictor | Proxima Fitness',
    description:
        'Enter match odds, scoring rules, and recent form to get an optimal bolao scoreline prediction.',
};

export default function BolaoPage() {
    return (
        <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-10 sm:py-16">
            <div className="w-full max-w-3xl mx-auto">
                <div className="text-center mb-10">
                    <h1 className={`${styles.heading2} text-center mb-4`}>
                        Bolao Predictor
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Calibrate Poisson lambdas from market odds and recent form, then
                        maximize expected points for your scoring rules.
                    </p>
                </div>

                <div className="rounded-xl border border-border bg-card p-8 sm:p-12 shadow-sm">
                    <BolaoPredictorForm />
                </div>
            </div>
        </main>
    );
}
