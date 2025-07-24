
import { coolQuotes } from "@/assets/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { FC, memo } from "react";

const RandomQuote = memo(() => {
    const getRandomNumber = () => Math.floor(Math.random() * (coolQuotes.length - 1)) + 1;
    const randomNumber = getRandomNumber();

    return <span className="px-8">&quot;{coolQuotes[randomNumber].quote}&quot; - {coolQuotes[randomNumber].author}</span>;
});

RandomQuote.displayName = "RandomQuote";

export const BuildProgramSkeleton: FC = () => {

    return (
        <div className="overflow-auto sm:pl-8">
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
                    <Skeleton className="italic w-[100%] h-[100%] rounded-xl text-center flex items-center justify-center" >
                        <RandomQuote />
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-[100%] h-[100%] rounded-xl text-center flex items-center justify-center" >
                        <RandomQuote />
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-[100%] h-[100%] rounded-xl text-center flex items-center justify-center" >
                        <RandomQuote />
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-[100%] h-[100%] rounded-xl text-center flex items-center justify-center" >
                        <RandomQuote />
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-[100%] h-[100%] rounded-xl text-center flex items-center justify-center" >
                        <RandomQuote />
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-[100%] h-[100%] rounded-xl text-center flex items-center justify-center" >
                        <RandomQuote />
                    </Skeleton>
                </div>
            </div>
            <div className=" pb-4 flex flex-row flex-nowrap gap-2">
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-[100%] h-[100%] rounded-xl text-center flex items-center justify-center" >
                        <RandomQuote />
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-[100%] h-[100%] rounded-xl text-center flex items-center justify-center" >
                        <RandomQuote />
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-[100%] h-[100%] rounded-xl text-center flex items-center justify-center" >
                        <RandomQuote />
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-[100%] h-[100%] rounded-xl text-center flex items-center justify-center" >
                        <RandomQuote />
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-[100%] h-[100%] rounded-xl text-center flex items-center justify-center" >
                        <RandomQuote />
                    </Skeleton>
                </div>
                <div className="min-w-[440px] max-w-[440px] h-[400px]">
                    <Skeleton className="italic w-[100%] h-[100%] rounded-xl text-center flex items-center justify-center" >
                        <RandomQuote />
                    </Skeleton>
                </div>
            </div>
        </div>
    );
};
