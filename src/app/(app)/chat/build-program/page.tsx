import { BuildProgramPage } from "@/components/program-builder/shared/BuildProgramPage";
import { BuildProgramSkeletonSSR } from "@/components/program-builder/shared/BuildProgramSkeletonSSR";
import { Suspense } from "react";

export const metadata = {
    title: "Build Program | AI Program Builder",
    description: "Edit your custom program",
  };

export default async function BuildProgram() {

    return (
        <div className={ `bg-white min-h-[1000px] overflow-x-scroll` }>
            <Suspense fallback={ <BuildProgramSkeletonSSR /> }>
                <div className="flex flex-col justify-start items-start">
                    <BuildProgramPage />
                </div>
            </Suspense>
        </div>
    );
}
