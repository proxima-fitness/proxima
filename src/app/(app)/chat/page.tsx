import styles from "@/style";
import { MessageSquareWarningIcon } from "lucide-react";
import { Prompt } from "@/components/program-builder/shared/Prompt";
import { AiProgramGrid } from "@/components/program-builder/shared/AiProgramGrid";
import { RecentProgramsGrid } from "@/components/program-builder/shared/RecentProgramsGrid";
import { createClient } from "@/utils/supabase/server";
import { ConditionalHevyGrid } from "@/components/program-builder/hevy/ConditionalHevyGrid";
import Chat from "@/components/program-builder/shared/Chat";

export const metadata = {
    title: "AI Program Builder | Proxima Fitness",
    description: "Create a workout program by chatting with AI",
};

export default async function AiChat() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div className={ `bg-white ${styles.flexCenter} flex-col` }>
            <div className={ `${styles.boxWidth}` }>
                <div className="sm:mt-[120px] sm:mb-[100px] max-sm:h-full max-sm:mt-[50px] max-sm:mb-[150px] flex flex-col max-sm:gap-0 items-center justify-center gap-6">
                    <div className="text-center">
                        <div className="font-main text-4xl font-bold uppercase">What do you want to train?</div>
                        <div className="text-lg font-normal">Create a workout program by chatting with AI</div>
                    </div>
                    <div className="flex flex-col max-sm:flex-col max-sm:pt-8 justify-center items-center w-full">
                        <Prompt userData={ user } />
                        <Chat />
                    </div>
                </div>
                <div className="bg-red-400 py-4 text-white hidden max-sm:flex max-sm:flex-col max-sm:justify-center max-sm:items-center text-center">
                    <MessageSquareWarningIcon />
                    Please use on a desktop computer for best experience
                </div>
                <RecentProgramsGrid />
                <ConditionalHevyGrid />
                <AiProgramGrid />
            </div>
        </div>
    );
}
