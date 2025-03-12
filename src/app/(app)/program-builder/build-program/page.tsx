import { BuildProgramClientPage } from "@/components/program-builder/BuildProgramClientPage";

export const metadata = {
    title: "Build Program | AI Program Builder",
    description: "Edit your custom program",
  };

export default async function BuildProgram({ searchParams }: {searchParams: Promise<{ [key: string]: string | string[] | undefined }>}) {

    const encodedQuery = (await searchParams).aiQueryBuilder as string;

    let decodedQuery = "";

    if (encodedQuery) {
        try {
            decodedQuery = JSON.parse(decodeURIComponent(encodedQuery));
        } catch (e) {
            console.error("Failed to parse AI query", e);
        }
    }

    return (
        <div className={ `bg-white min-h-[1000px] overflow-x-scroll` }>
            <BuildProgramClientPage decodedQuery={ decodedQuery } />
        </div>
    );
}
