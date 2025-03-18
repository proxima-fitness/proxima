import { BuildProgramClientPage } from "@/components/program-builder/BuildProgramClientPage";

export const metadata = {
    title: "Build Program | AI Program Builder",
    description: "Edit your custom program",
  };

export default async function BuildProgram({ searchParams }: {searchParams: Promise<{ [key: string]: string | undefined }>}) {

    const queryParams = await searchParams;

    return (
        <div className={ `bg-white min-h-[1000px] overflow-x-scroll` }>
            <BuildProgramClientPage
                empty={ queryParams?.["empty"] ?? "" }
                search={ queryParams?.["search"] ?? "" }
                sex={ queryParams?.["sex"] ?? "" }
                age={ queryParams?.["age"] ?? "" }
                daysPerWeek={ queryParams?.["daysPerWeek"] ?? "" }
                specificDays={ queryParams?.["specificDays"] ?? "" }
                programLength={ queryParams?.["programLength"] ?? "" }
                workoutDuration={ queryParams?.["workoutDuration"] ?? "" }
                activityLevel={ queryParams?.["activityLevel"] ?? "" }
                goals={ queryParams?.["goals"] ?? "" }
                specialization={ queryParams?.["specialization"] ?? "" }
                equipment={ queryParams?.["equipment"] ?? "" }
                focusAreas={ queryParams?.["focusAreas"] ?? "" }
                difficultyLevel={ queryParams?.["difficultyLevel"] ?? "" }
                excludeAreas={ queryParams?.["excludeAreas"] ?? "" }
                excludeEquipment={ queryParams?.["excludeEquipment"] ?? "" }
                excludeSpecializations={ queryParams?.["excludeSpecializations"] ?? "" }
                healthIssues={ queryParams?.["healthIssues"] ?? "" }
            />
        </div>
    );
}
