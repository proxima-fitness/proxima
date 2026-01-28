import { ProgramFallback } from "@/components/generic/ProgramFallback";
import { ProgramsSlugLayout } from "@/components/programs/ProgramsSlugLayout";
import { Suspense } from "react";

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }) {
    const { slug } = await params;
    const rawTitle = slug[0]?.replace(/-/g, ' ') ?? "Program";
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

    // Extract program ID from the last element of the slug array
    // URL pattern is: programs/{...segments}/{id}
    const programId = slug[slug.length - 1];
    if (!programId) {
        return (
            <div className="bg-white dark:bg-extraDarkGray flex items-start justify-start flex-col px-12 max-sm:px-2 py-6">
                <div className="text-center py-8">
                    <h1 className="text-2xl font-bold">Program not found</h1>
                    <p className="text-muted-foreground mt-2">Invalid program URL</p>
                </div>
            </div>
        );
    }

    const programIdInt = parseInt(programId, 10);
    if (isNaN(programIdInt)) {
        return (
            <div className="bg-white dark:bg-extraDarkGray flex items-start justify-start flex-col px-12 max-sm:px-2 py-6">
                <div className="text-center py-8">
                    <h1 className="text-2xl font-bold">Program not found</h1>
                    <p className="text-muted-foreground mt-2">Invalid program ID format</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-extraDarkGray flex items-start justify-start flex-col px-12 max-sm:px-2 py-6">
            <Suspense fallback={ <ProgramFallback /> }>
                <ProgramsSlugLayout id={programIdInt} />
            </Suspense>
        </div>
    );
}
