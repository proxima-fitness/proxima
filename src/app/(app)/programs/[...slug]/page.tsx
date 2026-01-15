import { ProgramFallback } from "@/components/generic/ProgramFallback";
import { ProgramsSlugLayout } from "@/components/programs/ProgramsSlugLayout";
import { Suspense } from "react";

export async function generateMetadata({ params }: { params: { slug: string[] } }) {
    const rawTitle = params.slug[1]?.replace(/-/g, ' ') ?? "Program";
    const formattedTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

    return {
        title: `${formattedTitle} | Proxima Fitness`,
        description: `View details about the ${formattedTitle} program on Proxima Fitness.`,
    };
}

export default function ProgramsSlugPage({
    params,
}: {
    params: { slug: string[] };
}) {
    const slug = params.slug;

    return (
        <div className="bg-white dark:bg-extraDarkGray flex items-start justify-start flex-col px-12 max-sm:px-2 py-6">
            <Suspense fallback={ <ProgramFallback /> }>
                <ProgramsSlugLayout id={slug[0]} />
            </Suspense>
        </div>
    );
}
