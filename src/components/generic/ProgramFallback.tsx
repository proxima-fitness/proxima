/**
 * @module ProgramFallback
 * Skeleton layout for a single program detail page: hero image, title block, sidebar, week list.
 * Depends on: UI Skeleton.
 * Used by: program detail route while loading.
 */
import { Skeleton } from "../ui/skeleton"

/** No props. Renders full program-detail-shaped skeletons. */
export const ProgramFallback: React.FC = () => {

    return (
        <>
            <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-[1fr_min(340px,32vw)] lg:items-start lg:gap-x-12 lg:gap-y-8">
                <div className="order-1 lg:col-start-1 lg:row-start-1">
                    <Skeleton className="aspect-[16/10] w-full max-h-[420px] rounded-3xl" />
                </div>
                <div className="order-2 lg:col-start-1 lg:row-start-2">
                    <Skeleton className="h-36 w-full rounded-2xl sm:h-40" />
                </div>
                <div className="order-4 lg:col-start-1 lg:row-start-3">
                    <Skeleton className="h-[min(28rem,50vh)] w-full rounded-2xl sm:h-[450px]" />
                </div>
                <aside className="order-3 flex min-h-0 flex-col gap-4 lg:sticky lg:top-0 lg:max-h-[100dvh] lg:overflow-y-auto lg:overscroll-contain lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-start">
                    <Skeleton className="h-[min(20rem,40vh)] w-full rounded-2xl" />
                    <Skeleton className="h-40 w-full rounded-2xl" />
                </aside>
            </div>
            <div className="mt-10 w-full md:mt-12">
                <Skeleton className="mb-4 h-4 w-40 rounded-md" />
                <div className="scrollbar-thin flex w-full flex-row gap-5 overflow-x-auto pb-2">
                    { [1,2, 3, 4].map((i) => (
                        <div className="w-full shrink-0" key={`week-${i}`}>
                            <Skeleton className="mb-2 h-7 w-24 rounded-full" />
                            <Skeleton className="h-64 min-w-[320px] rounded-2xl sm:min-w-[400px]" />
                        </div>
                    )) }
                </div>
            </div>
        </>
    );
};
