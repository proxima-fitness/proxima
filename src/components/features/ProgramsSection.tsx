"use client";

import styles, { layout } from "../../style";
import { Button } from "../generic/Button";
import Link from "next/link";
import { ProgramCard } from "../programs/ProgramCard";
import { useExplorePagePrograms } from "@/api/hooks";
import { ProgramCardLoading } from "../generic/ProgramCardLoading";


export const ProgramsSection: React.FC = () => {

    const { data: programs } = useExplorePagePrograms({ "specialization": ["Bodybuilding"] }, 6, 10);
    const loadingPrograms = false;

    return (
        <section id="programs" className={ layout.sectionTop } data-aos="fade-up"
        data-aos-anchor-placement="top-bottom" data-aos-once="true"
        >
            <div className={ layout.sectionInfoCentered } style={ { display:"flex", justifyContent: "center", alignItems: "center" }    }>
                <h2 className={ styles.heading2Programs }>
                    Train Popular <span style={ { color: "#33bbcf" } }>Science Based</span> Programs
                </h2>
            </div>
            { loadingPrograms ?
                <div className="pt-14 px-24">
                    <ProgramCardLoading />
                </div>
            :   (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-2 pt-14 px-24 max-sm:px-0">

                    { programs.map((program) => (
                        <Link
                            key={ program.id }
                            target="_self"
                            rel="noopener noreferrer"
                            href={ `programs/${program.id}/${program.title.trim().replace(/\s+/g, '-').toLowerCase()}` }
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
                <Link href="/programs"><Button text={ "Search Programs" } styles={ `mt-10` } /></Link>
            </div>
        </section>
    );
};
