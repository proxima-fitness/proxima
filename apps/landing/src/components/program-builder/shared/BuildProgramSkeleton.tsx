// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module BuildProgramSkeleton
 * Client-side loading skeleton for the program builder (steps + quote placeholders). Shown while build-program content loads.
 * Depends on: Skeleton, coolQuotes. Used by: build-program page (client).
 */
import { coolQuotes } from "@/assets/constants/nav-links";
import { Skeleton } from "@/components/ui/skeleton";
import { FC, memo } from "react";

const RandomQuote = memo(({ index }: { index: number }) => {
    const quote = coolQuotes[index % coolQuotes.length];
    return <span className="px-8">&quot;{quote.quote}&quot; - {quote.author}</span>;
});

RandomQuote.displayName = "RandomQuote";

/** Full-width skeleton matching builder layout (step strips + large quote cells). */
export const BuildProgramSkeleton: FC = () => {

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
                        <RandomQuote index={0} />
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-full h-full rounded-xl text-center flex items-center justify-center" >
                        <RandomQuote index={1} />
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-full h-full rounded-xl text-center flex items-center justify-center" >
                        <RandomQuote index={2} />
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-full h-full rounded-xl text-center flex items-center justify-center" >
                        <RandomQuote index={3} />
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-full h-full rounded-xl text-center flex items-center justify-center" >
                        <RandomQuote index={4} />
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-full h-full rounded-xl text-center flex items-center justify-center" >
                        <RandomQuote index={5} />
                    </Skeleton>
                </div>
            </div>
            <div className=" pb-4 flex flex-row flex-nowrap gap-2">
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-full h-full rounded-xl text-center flex items-center justify-center" >
                        <RandomQuote index={6} />
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-full h-full rounded-xl text-center flex items-center justify-center" >
                        <RandomQuote index={7} />
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-full h-full rounded-xl text-center flex items-center justify-center" >
                        <RandomQuote index={8} />
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-full h-full rounded-xl text-center flex items-center justify-center" >
                        <RandomQuote index={9} />
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-full h-full rounded-xl text-center flex items-center justify-center" >
                        <RandomQuote index={10} />
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-full h-full rounded-xl text-center flex items-center justify-center" >
                        <RandomQuote index={11} />
                    </Skeleton>
                </div>
            </div>
        </>
    );
};
