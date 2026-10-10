// SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @next/next/no-img-element */

/**
 * @module CredibilityBand
 * Trust signals row: Hevy, League of Innovators, Product Hunt, athlete avatars.
 */

import {
    hevy_logo,
    hevy_logo_black,
    jack_small,
    league_of_innovators_logo,
    people02,
    people03,
    people04,
    people05,
} from "public";
import { AvatarStack } from "@/components/avatar-stack";
import { ProductHunt } from "@/components/program-builder/shared/ProductHunt";

export const CredibilityBand: React.FC = () => {
    return (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-6">
            <div className="flex flex-col items-center gap-4">
                <span className="font-tertiary text-[10px] font-bold text-muted-foreground sm:text-xs">
                    Integrated with
                </span>
                <a
                    href="https://www.hevyapp.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Visit Hevy website"
                >
                    <img
                        src={hevy_logo.src}
                        alt="Hevy"
                        className="hidden h-7 w-auto object-contain dark:block sm:h-8"
                    />
                    <img
                        src={hevy_logo_black.src}
                        alt="Hevy"
                        className="block h-7 w-auto object-contain dark:hidden sm:h-8"
                    />
                </a>
            </div>
            <div className="flex flex-col items-center gap-4">
                <span className="font-tertiary text-[10px] font-bold text-muted-foreground sm:text-xs">
                    Backed by
                </span>
                <a
                    href="https://www.loi.ac/"
                    target="_blank"
                    rel="noreferrer noopener"
                >
                    <img
                        src={(league_of_innovators_logo).src}
                        alt="League of Innovators"
                        className="h-7 w-auto object-contain sm:h-8"
                    />
                </a>
            </div>
            <div className="flex flex-col items-center gap-4">
                <span className="font-tertiary text-[10px] font-bold text-muted-foreground sm:text-xs">
                    Featured on
                </span>
                <ProductHunt />
            </div>
            <div className="flex flex-col items-center gap-4">
                <span className="font-tertiary whitespace-nowrap text-[10px] font-bold text-muted-foreground sm:text-xs">
                    <span className="sm:hidden">2,000+ athletes</span>
                    <span className="hidden sm:inline">Join 2,000+ athletes</span>
                </span>
                <AvatarStack
                    avatars={[
                        { name: "jack.hanlon", image: jack_small.src },
                        { name: "scottlhanlon", image: people03.src },
                        { name: "jordan.vandesande", image: people04.src },
                        { name: "robroyjr", image: people05.src },
                        { name: "marcola", image: people02.src },
                        { name: "john.gardiner", image: people02.src },
                        { name: "josh.rubis", image: people02.src },
                        { name: "calvin.sytsma", image: people02.src },
                        { name: "mark.shaio", image: people02.src },
                        { name: "sigilai", image: people02.src },
                        { name: "thomas.genet", image: people02.src },
                        { name: "lukcamp", image: people02.src },
                        { name: "alexabcj", image: people02.src },
                        { name: "kalamataspartan", image: people02.src },
                        { name: "alexalydiarose", image: people02.src },
                    ]}
                    maxAvatarsAmount={5}
                />
            </div>
        </div>
    );
};
