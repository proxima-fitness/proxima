
import { coolQuotes } from "@/assets/constants";
import { Skeleton } from "@/components/ui/skeleton"
import React = require("react");

const RandomQuote = React.memo(() => {
    const getRandomNumber = () => Math.floor(Math.random() * (coolQuotes.length - 1)) + 1;
    const randomNumber = getRandomNumber();

    return <span className="px-8">"{coolQuotes[randomNumber].quote}" - {coolQuotes[randomNumber].author}</span>;
});

export const BuildProgramSkeleton: React.FC = () => {


    return (
        <>
        <div className="py-4 px-4 flex flex-row flex-nowrap overflow-hidden gap-2">
            <div className="min-w-[440px] max-w-[440px] h-[40px]">
                <Skeleton className="rounded-lg h-full w-full" />
            </div>
            <div className="min-w-[440px] max-w-[440px] h-[40px]">
                <Skeleton className="rounded-lg h-full w-full" />
            </div>
            <div className="min-w-[440px] max-w-[440px] h-[40px]">
                <Skeleton className="rounded-lg h-full w-full" />
            </div>
            <div className="min-w-[440px] max-w-[440px] h-[40px]">
                <Skeleton className="rounded-lg h-full w-full" />
            </div>
            <div className="min-w-[440px] max-w-[440px] h-[40px]">
                <Skeleton className="rounded-lg h-full w-full" />
            </div>
            <div className="min-w-[440px] max-w-[440px] h-[40px]">
                <Skeleton className="rounded-lg h-full w-full" />
            </div>
        </div>

        <div className="px-4 pb-4 flex flex-row flex-nowrap gap-2 overflow-hidden">
            <div className="min-w-[440px] max-w-[440px] h-[400px]">
                <Skeleton className="w-[100%] h-[100%] rounded-lg text-center flex items-center justify-center" >
                    <RandomQuote />
                </Skeleton>
            </div>
            <div className="min-w-[440px] max-w-[440px] h-[400px]">
                <Skeleton className="w-[100%] h-[100%] rounded-lg text-center flex items-center justify-center" >
                    <RandomQuote />
                </Skeleton>
            </div>
            <div className="min-w-[440px] max-w-[440px] h-[400px]">
                <Skeleton className="w-[100%] h-[100%] rounded-lg text-center flex items-center justify-center" >
                    <RandomQuote />
                </Skeleton>
            </div>
            <div className="min-w-[440px] max-w-[440px] h-[400px]">
                <Skeleton className="w-[100%] h-[100%] rounded-lg text-center flex items-center justify-center" >
                    <RandomQuote />
                </Skeleton>
            </div>
            <div className="min-w-[440px] max-w-[440px] h-[400px]">
                <Skeleton className="w-[100%] h-[100%] rounded-lg text-center flex items-center justify-center" >
                    <RandomQuote />
                </Skeleton>
            </div>
            <div className="min-w-[440px] max-w-[440px] h-[400px]">
                <Skeleton className="w-[100%] h-[100%] rounded-lg text-center flex items-center justify-center" >
                    <RandomQuote />
                </Skeleton>
            </div>
        </div>
        </>
    );
};
