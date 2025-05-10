import { BuildProgramPage } from "@/components/program-builder/shared/BuildProgramPage";
import { BuildProgramSkeleton } from "@/components/program-builder/shared/BuildProgramSkeleton";
import { SetTypesLegend } from "@/components/program-builder/shared/SetTypesLegend";
import { Suspense } from "react";

export const metadata = {
    title: "Build Program | AI Program Builder",
    description: "Edit your custom program",
  };

export default async function BuildProgram() {

    return (
        <div className={ `bg-white min-h-[1000px] overflow-x-scroll` }>
            <Suspense fallback={ <BuildProgramSkeleton /> }>
                <div className="flex flex-col justify-start items-start">
                    <BuildProgramPage />
                    <SetTypesLegend />
                </div>
            </Suspense>
        </div>
    );
}
