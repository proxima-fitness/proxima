import { ProgramFallback } from "@/components/generic/ProgramFallback";
import { ProgramsSlugLayout } from "@/components/programs/ProgramsSlugLayout";
import { Suspense } from "react";

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }) {
    const { slug } = await params;
    const rawTitle = slug[1]?.replace(/-/g, ' ') ?? "Program";
    const formattedTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

    return {
        title: `${formattedTitle} | Proxima Fitness`,
        description: `View details about the ${formattedTitle} program on Proxima Fitness.`,
    };
}

export default async function ProgramsSlugPage({
    params,
}: {
    params: Promise<{ slug: string[] }>;
}) {
    const { slug } = await params;

    return (
        <div className="bg-white dark:bg-extraDarkGray flex items-start justify-start flex-col px-12 max-sm:px-2 py-6">
            <Suspense fallback={ <ProgramFallback /> }>
                <ProgramsSlugLayout id={slug[0]} />
            </Suspense>
        </div>
    );
}
