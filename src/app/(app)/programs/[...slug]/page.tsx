/* eslint-disable @typescript-eslint/no-explicit-any */
import { ProgramsSlugLayout } from "@/components/programs/ProgramsSlugLayout";

export const metadata = {
    title: "Search Programs | Proxima Fitness",
    description: "Search from a list of Free Workout Programs on Proxima",
};

  export default async function ProgramsSlugPage({
    params,
  }: {
    params: Promise < {
      slug: string[]
    } > ;
  }) {

    const {
        slug,
    } = await params;

    return (
        <>
            <div className={ `bg-white flex items-center justify-center flex-col px-12 max-sm:px-2 py-6` }>
                <ProgramsSlugLayout id={ slug[0] } />
            </div>
        </>
    );
};
