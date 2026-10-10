// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module (app)/(with-toolbar)/build-program/layout
 *
 * Layout for the build-program route. Sticky toolbar (sm+): breadcrumbs, program title
 * (portaled from BuildProgram), set-types popover, undo, and Save (Sign in to save when anonymous).
 *
 * Depends on: Breadcrumbs, BuildProgramFeedbackDialog, BuildProgramSetTypesPopover.
 * Used by: build-program/page and its BuildProgramClient.
 */

import { Breadcrumbs } from "@/components/program-builder/shared/Breadcrumbs";
import { BuildProgramFeedbackDialog } from "@/components/program-builder/shared/BuildProgramFeedbackDialog";
import { BuildProgramSetTypesPopover } from "@/components/program-builder/shared/BuildProgramSetTypesPopover";
import { ReactNode } from "react";

/**
 * Program builder toolbar layout; breadcrumbs, title portal, set-types, undo/step area.
 *
 * @param props.children - Build-program page content (BuildProgramClient).
 */
export default function ProgramBuilderLayout({ children }: { children: ReactNode }) {
    return (
        <div className="h-screen max-sm:h-[calc(100dvh-4rem)] flex flex-col overflow-hidden">
            <div className="max-sm:hidden shrink-0 z-30 p-2 bg-extraLightGray dark:bg-extraDarkGray border-b-2 dark:border-darkGray border-white flex flex-row items-center gap-2 text-xl text-black dark:text-white">
                <div className="min-w-0 flex-1 overflow-hidden">
                    <Breadcrumbs />
                </div>

                <div className="flex min-w-0 flex-[1.1] justify-center px-2">
                    <div id="toolbar-program-title-portal" className="flex w-fit min-w-0 max-w-[20ch] justify-center" />
                </div>

                <div className="flex min-w-0 flex-1 flex-row items-center justify-end gap-2">
                    <div className="hidden md:flex shrink-0 items-center gap-2">
                        <BuildProgramFeedbackDialog />
                        <BuildProgramSetTypesPopover />
                    </div>
                    <div id="toolbar-undo-portal" className="empty:hidden" />
                    <div id="toolbar-save-portal" className="empty:hidden" />
                </div>
            </div>

            {children}
        </div>
    );
}
