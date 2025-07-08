"use client";

import { MessageSquareWarningIcon, PlayIcon } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useUserContext } from "@/contexts/UserContext";
import { User } from "@supabase/supabase-js";
import { jack, people02, people03, people04, people05 } from "public";
import { AvatarStack } from "@/components/avatar-stack";
import { AiProgramGrid } from "./AiProgramGrid";
import { ConditionalHevyGrid } from "../hevy/ConditionalHevyGrid";
import { RecentProgramsGrid } from "./RecentProgramsGrid";
import { PromptTemplate } from "./PromptTemplate";

interface IProps {
    userData: User | null;
}

export const Prompt: React.FC<IProps> = ({ userData }) => {

    const { setUser } = useUserContext();

    // DO NOT TOUCH THIS -- SETS REACT CONTEXT FOR USERS THAT SIGNED IN WITH AN SSR METHOD
    useEffect(() => {
        if (userData) {
            setUser(userData);
        }
    }, [userData, setUser]);

    return (
        <>
            <div className="sm:mt-[120px] sm:mb-[100px] max-sm:h-full max-sm:mt-[50px] max-sm:mb-[150px] flex flex-col max-sm:gap-0 items-center justify-center gap-6">
                <div className="text-center">
                    <div className="font-main text-4xl font-bold uppercase">What do you want to train?</div>
                    <div className="text-lg font-normal px-12">Create a workout program by chatting with AI</div>
                </div>
                <div className="flex flex-col max-sm:flex-col max-sm:pt-8 justify-center items-center w-full">
                    <div className="flex flex-col gap-2 w-full items-center">
                        <div className="w-full">
                            <span className="flex items-center justify-center">
                                <Button className="my-12 sm:hidden h-[60px] text-white rounded-xl w-[200px] bg-lightSecondary hover:bg-lightSecondary font-main uppercase flex items-center justify-center gap-4"><PlayIcon />Start</Button>
                            </span>
                                <PromptTemplate />
                                <div className="pt-12 flex flex-col justify-center items-center">
                                    <AvatarStack
                                        avatars={[
                                            {name: "jack.hanlon", image:  jack.src},
                                            {name: "scottlhanlon", image: people03.src},
                                            {name: "jordan.vandesande", image: people04.src},
                                            {name: "marcola", image: people05.src},
                                            {name: "sina", image: people02.src},
                                            {name: "john.gardiner", image: people02.src},
                                            {name: "josh.rubis", image: people02.src},
                                            {name: "calvin.sytsma", image: people02.src},
                                            {name: "mark.shaio", image: people02.src},
                                            {name: "sigilai", image: people02.src},
                                            {name: "thomas.genet", image: people02.src},
                                            {name: "lukcamp", image: people02.src},
                                            {name: "alexabcj", image: people02.src},
                                            {name: "kalamataspartan", image: people02.src},
                                            {name: "alexalydiarose", image: people02.src},
                                        ] }
                                    />
                                    6,000+ lifters are building with Proxima
                                </div>
                        </div>

                    </div>
                </div>
            </div>
            <div className="bg-red-400 py-4 text-white hidden max-sm:flex max-sm:flex-col max-sm:justify-center max-sm:items-center text-center">
                <MessageSquareWarningIcon />
                Please use on a desktop computer for best experience
            </div>
                <RecentProgramsGrid />
                <ConditionalHevyGrid />
                <AiProgramGrid />
            </>

    );
};
