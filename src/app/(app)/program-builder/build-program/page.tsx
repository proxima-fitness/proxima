import { BuildProgramPage } from "@/components/program-builder/shared/BuildProgramPage";
import { BuildProgramSkeletonSSR } from "@/components/program-builder/shared/BuildProgramSkeletonSSR";
import { Suspense } from "react";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
  } from "@/components/ui/resizable";
import { RePrompt } from "@/components/program-builder/shared/RePrompt";
import { Button } from "@/components/ui/button";

export const metadata = {
    title: "Build Program | AI Program Builder",
    description: "Edit your custom program",
  };

export default async function BuildProgram() {

    return (
        <div className={ `bg-white overflow-x-scroll` }>
            <Suspense fallback={ <BuildProgramSkeletonSSR /> }>
                <ResizablePanelGroup
                    direction="horizontal"
                    className="max-h-screen"
                >
                <ResizablePanel defaultSize={30} minSize={30} maxSize={70}>
                    <div className="min-h-12 p-2 border-b flex flex-row gap-2">
                        <Button variant="default" className="bg-lightGray text-black hover:bg-lightGray">Chat</Button>
                        <Button variant="ghost" className="text-black hover:bg-lightGray">Filters</Button>
                    </div>
                    <RePrompt />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={70}>
                    <BuildProgramPage />
                </ResizablePanel>
                </ResizablePanelGroup>
            </Suspense>
        </div>
    );
}
