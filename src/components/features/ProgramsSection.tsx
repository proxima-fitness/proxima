"use client";

import styles, { layout } from "../../style";
import { Button } from "../generic/Button";
import Link from "next/link";
import { ProgramCard } from "../programs/ProgramCard";
import { useExplorePagePrograms } from "@/api/hooks";
import { ProgramCardLoading } from "../generic/ProgramCardLoading";
import AnimatedRotatingText from "../generic/AnimatedRotatingText";

export const ProgramsSection: React.FC = () => {

    const { data: programs, isLoading: loadingPrograms } = useExplorePagePrograms(undefined,6, undefined);

    return (
        <section
            id="programs"
            className={ layout.sectionTop }
            data-aos="fade-up"
            data-aos-anchor-placement="top-bottom"
            data-aos-once="true"
        >
            <div className={ layout.sectionInfoCentered } style={ { display:"flex", justifyContent: "center", alignItems: "center" }    }>
                <h2 className={ styles.heading2Programs }>
                    <AnimatedRotatingText />
                </h2>
            </div>
            { loadingPrograms ?
                <div className="sm:pt-14 sm:px-24">
                    <ProgramCardLoading />
                </div>
            :   (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-2 pt-14 px-24 max-sm:px-0">

                    { programs !== undefined && programs.map((program) => (
                        <Link
                            key={ program.id }
                            target="_self"
                            rel="noopener noreferrer"
                            href={ `programs/${program.title.trim().toLowerCase().replace(/[\s,/]+/g, '-').replace(/[^a-z0-9-]/g, '')}/${program.id}` }
                        >
                            <ProgramCard
                                key={ program.id }
                                program={ program }
                            />
                        </Link>
                    ) ) }
                </div>
                )
            }
            <div className="flex items-center justify-center">
                <Link href="/programs"><Button text={ "Explore Programs" } styles={ `mt-10 py-2 bg-lightSecondary text-white` } /></Link>
            </div>
        </section>
    );
};
