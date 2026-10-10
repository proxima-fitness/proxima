// SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @next/next/no-img-element */

/*
 * @module Integrations
 * @description Landing page section that showcases current and upcoming fitness app integrations for Proxima.
 * @dependsOn Shared layout styles, static integration logo assets, and the UI separator primitive.
 * @usedBy Marketing pages that need to communicate ecosystem support and roadmap integrations.
 */

import {
    garmin_logo,
    hevy_logo,
    oura_logo,
    polar_logo,
    proxima_logo,
    strava_logo,
    whoop_logo,
} from "public";
import styles from "../../style";
import { Separator } from "../ui/separator";
import { Card } from "../ui/card";

/**
 * Integrations renders a horizontally grouped list of available and coming-soon fitness integrations.
 */
export const Integrations: React.FC = () => {
    return (
        <section className={ `${styles.flexCenter} ${styles.paddingY}` }>
            <div className="flex flex-col items-center justify-center w-full">
                <h3 className="font-main text-2xl sm:text-3xl md:text-4xl text-black dark:text-white pb-8 sm:pb-10 text-center">
                    Integrated with your <span className="text-lightSecondary">fitness apps</span>
                </h3>

                <Card className="w-full max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8 px-6 py-5 bg-card">
                    {/* Available now */}
                    <div className="flex flex-col items-center sm:items-start gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground uppercase tracking-[0.12em]">
                            Available now
                        </span>
                        <div className="flex flex-row items-center justify-center gap-4 sm:gap-6">
                            <img src={ proxima_logo.src } alt="Proxima" className="h-6 sm:h-7 w-auto" />
                            <img src={ hevy_logo.src } alt="Hevy" className="h-6 sm:h-7 w-auto" />
                        </div>
                    </div>

                    {/* Divider on larger screens */}
                    <Separator orientation="vertical" className="hidden sm:block h-12 bg-border" />

                    {/* Coming soon */}
                    <div className="flex flex-col items-center sm:items-start gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground uppercase tracking-[0.12em]">
                            Coming soon
                        </span>
                        <div className="flex flex-row flex-wrap items-center justify-center gap-4 sm:gap-6">
                            <img src={ strava_logo.src } alt="Strava" className="h-6 sm:h-7 w-auto" />
                            <img src={ oura_logo.src } alt="Oura" className="h-6 sm:h-7 w-auto" />
                            <img src={ polar_logo.src } alt="Polar" className="h-6 sm:h-7 w-auto" />
                            <img src={ garmin_logo.src } alt="Garmin" className="h-6 sm:h-7 w-auto" />
                            <img src={ whoop_logo.src } alt="Whoop" className="h-6 sm:h-7 w-auto" />
                        </div>
                    </div>
                </Card>
            </div>
        </section>
    );
};
