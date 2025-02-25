/* eslint-disable @typescript-eslint/no-explicit-any */
import { BuildProgramSkeleton } from "@/components/program-builder/BuildProgramSkeleton";
import styles from "@/style";

export const metadata = {
    title: "Build Program | AI Program Builder",
    description: "Edit your custom program",
  };

  export default function BuildProgram() {
    return (
        <div className={ `bg-white` }>
            <BuildProgramSkeleton />
        </div>
    );
}
