"use client";

import { Button } from "@/components/ui/button";
import { DayCard } from "./DayCard";
import { WeeksBar } from "./WeeksBar";
import { PlusIcon } from "lucide-react";
import { exampleProximaProgram } from "@/assets/constants";
import { useCallback, useState } from "react";

interface IProps {
    program: TProgramCreatorDay[][];
}

export const ProximaProgram: React.FC<IProps> = (props) => {

    const {
        program,
    } = props;


    const [newProgram, setNewProgram] = useState<TProgramCreatorDay[][]>(program);

    // const handleDuplicateWeek = (currentWeek: number, duplicatedToWeeks: number[], newProgram: TProgramCreatorDay[][]) => {

    // };

    // const handleDuplicateDay = (currentDay: number, duplicatedToDays: number[], duplicatedToWeek: number[], newProgram: TProgramCreatorDay[][]) => {

    // };

    // const handleAddDay = (currentWeek: number) => {

    // };



    return (
        <>
            <div className="flex flex-row gap-4">
                { newProgram.map((week, index) => {
                    return (
                        <div key={ index + 1 } className="flex flex-col min-w-[440px] max-w-[440px] gap-4 items-center">
                            <WeeksBar week={ index + 1  } programLength={ exampleProximaProgram.length } />
                            { week.map((day, idx) => (
                                <DayCard key={ day.order } day={ day } days={ week.length } week={ index + 1 } programLength={ exampleProximaProgram.length } />
                            ) ) }
                            <Button className="mb-4 w-44 font-bold uppercase h-12 rounded-[40px] bg-lightSecondary hover:bg-lightSecondary text-white"><PlusIcon />Add Day</Button>
                        </div>
                    )
                } ) }
            </div>
        </>
    );
};
