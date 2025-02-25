import { BuildProgramClientPage } from "@/components/program-builder/BuildProgramClientPage";

export const metadata = {
    title: "Build Program | AI Program Builder",
    description: "Edit your custom program",
  };

export default function BuildProgram() {

    return (
        <div className={ `bg-white min-h-[1000px] overflow-x-scroll` }>
            <BuildProgramClientPage />
        </div>
    );
}
