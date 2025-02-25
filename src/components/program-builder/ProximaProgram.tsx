"use client";

import { Button } from "@/components/ui/button";
import { DayCard } from "./DayCard";
import { WeeksBar } from "./WeeksBar";
import { PlusIcon } from "lucide-react";

export const ProximaProgram: React.FC = () => {

    const weeks = [1,2,3,4,5,6,7,8,9,10,11,12];
    const days = [1,2,3,4,5,6];

    return (
        <>
            <div className="flex flex-row gap-8">
                { weeks.map((week) => (
                    <div key={ week } className="flex flex-col min-w-[440px] max-w-[440px] gap-8 items-center">
                        <WeeksBar week={ week } weeks={ weeks } />
                    { days.map((day) => (
                        <DayCard key={ day } day={ day } days={ days } week={ week } />
                    ))}
                    <Button className="mb-4 w-44 font-bold uppercase h-12 rounded-[40px] bg-lightSecondary hover:bg-lightSecondary text-white"><PlusIcon />Add Day</Button>
                    </div>
                ))}
            </div>
        </>
    );
};
