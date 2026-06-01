/**
 * @module (app)/(with-toolbar)/build-program/page
 *
 * Build-program route. Wraps BuildProgramClient in Suspense with skeleton
 * fallback. Sits at src/app/(app)/(with-toolbar)/build-program/page.tsx; route "/build-program".
 *
 * Depends on: BuildProgramSkeletonSSR, BuildProgramClient.
 * Used by: Next.js (route "/build-program").
 */

import { BuildProgramSkeletonSSR } from "@/components/program-builder/shared/BuildProgramSkeletonSSR";
import { Suspense } from "react";
import { BuildProgram } from "./BuildProgram";

export const metadata = {
    title: "Build Program | AI Program Builder",
    description: "Edit your custom program",
};

/** Build-program page; client builder with skeleton fallback. Bare-arrival redirect lives in BuildProgram (client). */
export default function BuildProgramPage() {
    return (
        <div className="bg-white sm:bg-extraLightGray dark:bg-extraDarkGray flex flex-col flex-1 min-h-0 overflow-hidden">
            <Suspense fallback={<BuildProgramSkeletonSSR />}>
                <BuildProgram />
            </Suspense>
        </div>
    );
}
