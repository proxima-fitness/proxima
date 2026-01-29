import { BuildProgramSkeletonSSR } from "@/components/program-builder/shared/BuildProgramSkeletonSSR";
import { Suspense } from "react";
import { BuildProgramClient } from "./BuildProgramClient";

export const metadata = {
    title: "Build Program | AI Program Builder",
    description: "Edit your custom program",
  };

export default function BuildProgram() {
    return (
        <div className={ `bg-white dark:bg-darkGray h-screen overflow-hidden` }>
            <Suspense fallback={ <BuildProgramSkeletonSSR /> }>
                <BuildProgramClient />
            </Suspense>
        </div>
    );
}
