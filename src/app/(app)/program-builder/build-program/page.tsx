import { BuildProgramPage } from "@/components/program-builder/BuildProgramPage";

export const metadata = {
    title: "Build Program | AI Program Builder",
    description: "Edit your custom program",
  };

export default async function BuildProgram() {

    return (
        <div className={ `bg-white min-h-[1000px] overflow-x-scroll` }>
            <BuildProgramPage />
        </div>
    );
}
