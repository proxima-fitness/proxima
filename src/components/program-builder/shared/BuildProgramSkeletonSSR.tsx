/**
 * @module BuildProgramSkeletonSSR
 * Server-renderable loading skeleton for program builder (no quotes, no client hooks). Used for SSR/initial paint.
 * Depends on: Skeleton. Used by: build-program layout (SSR).
 */
import { Skeleton } from "@/components/ui/skeleton";
import { FC } from "react";

/** SSR-safe skeleton: step strips + empty content cells. */
export const BuildProgramSkeletonSSR: FC = () => {

    return (
        <>
            <div className="py-4 rounded-lg flex flex-row flex-nowrap gap-2">
                <div className="min-w-[440px] max-w-[440px] h-[40px]">
                    <Skeleton className="rounded-xl h-full w-full" />
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[40px]">
                    <Skeleton className="rounded-xl h-full w-full" />
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[40px]">
                    <Skeleton className="rounded-xl h-full w-full" />
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[40px]">
                    <Skeleton className="rounded-xl h-full w-full" />
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[40px]">
                    <Skeleton className="rounded-xl h-full w-full" />
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[40px]">
                    <Skeleton className="rounded-xl h-full w-full" />
                </div>
            </div>

            <div className="pb-4 rounded-lg flex flex-row flex-nowrap gap-2">
                <div className="min-w-[440px] max-w-[440px] h-[40px]">
                    <Skeleton className="rounded-xl h-full w-full" />
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[40px]">
                    <Skeleton className="rounded-xl h-full w-full" />
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[40px]">
                    <Skeleton className="rounded-xl h-full w-full" />
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[40px]">
                    <Skeleton className="rounded-xl h-full w-full" />
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[40px]">
                    <Skeleton className="rounded-xl h-full w-full" />
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[40px]">
                    <Skeleton className="rounded-xl h-full w-full" />
                </div>
            </div>
            <div className=" pb-4 flex flex-row flex-nowrap gap-2">
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-full h-full rounded-xl text-center flex items-center justify-center" >
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-full h-full rounded-xl text-center flex items-center justify-center" >
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-full h-full rounded-xl text-center flex items-center justify-center" >
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-full h-full rounded-xl text-center flex items-center justify-center" >
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-full h-full rounded-xl text-center flex items-center justify-center" >
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-full h-full rounded-xl text-center flex items-center justify-center" >
                    </Skeleton>
                </div>
            </div>
            <div className=" pb-4 flex flex-row flex-nowrap gap-2">
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-full h-full rounded-xl text-center flex items-center justify-center" >
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-full h-full rounded-xl text-center flex items-center justify-center" >
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-full h-full rounded-xl text-center flex items-center justify-center" >
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-full h-full rounded-xl text-center flex items-center justify-center" >
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-full h-full rounded-xl text-center flex items-center justify-center" >
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-full h-full rounded-xl text-center flex items-center justify-center" >
                    </Skeleton>
                </div>
            </div>
        </>
    );
};
