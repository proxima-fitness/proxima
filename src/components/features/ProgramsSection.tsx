"use client";

import styles, { layout } from "../../style";
import { Button } from "../generic/Button";
import { motion } from "motion/react";
import { ViewModeThumbnails } from "./ViewModeThumbnails";
import Link from "next/link";
import { ProgramCard } from "../programs/ProgramCard";
import { usePrograms } from "@/api/hooks";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// const FeatureCard = ({id, title, workout_duration, difficulty, equipment }: any) => (
//     <motion.div
//         whileHover={ { scale: 1.05 } }
//         className={ `transition group p-[4px] relative rounded-[20px] ` }
//     >
//         <div className="relative z-10 flex flex-row p-4 rounded-[20px] bg-black h-[280px]">
//             <div className="flex-1 flex flex-col">
//                 <h4 className="font-second font-semibold text-white text-[18px] leading-[23.4px] mb-1"
//             style={ { display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden", textOverflow: "ellipsis" } }
//         >
//                     { title }
//                 </h4>
//                 <p className="font-second font-normal text-dimWhite text-[12px] pt-2 leading-[24px]"
//         >
//                     {equipment} &middot; {workout_duration} minutes &middot; { difficulty[0] }...
//                 </p>
//                 <ViewModeThumbnails programID={ id } />
//             </div>
//         </div>
//     </motion.div>
// );

export const ProgramsSection: React.FC = () => {
  const { data: programs } = usePrograms(6);

  return (
      <section
      id="programs"
      className={ layout.sectionTop }
      data-aos="fade-up"
      data-aos-anchor-placement="top-bottom"
      data-aos-once="true"
    >
          <div
        className={ layout.sectionInfoCentered }
        style={ {
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        } }
      >
              <h2 className={ styles.heading2Programs }>
                  Train Popular <span style={ { color: "#33bbcf" } }>Science Based</span>{" "}
                  Programs
              </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-2 pt-14 px-24 max-sm:px-0">
              {programs && programs.length > 0 ? (
          programs.map((program, _index) => (
            // <FeatureCard key={ program.id } { ...program } index={ index } />
              <Link
              key={ program.id }
              target="_self"
              rel="noopener noreferrer"
              href={ `programs/${program.id}/${program.title.trim().replace(/\s+/g, "-").toLowerCase()}` }
            >
                  <ProgramCard key={ program.id } program={ program } />
              </Link>
          ))
        ) : (
            <p className="text-white">Loading programs...</p> // Loading state
        )}
          </div>
          <div className="flex items-center justify-center">
              <Link href="/programs">
                  <Button text={ "Search Programs" } styles={ `mt-10` } />
              </Link>
          </div>
      </section>
  );
};
