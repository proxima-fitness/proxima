import { AiSearchDialog } from "@/components/program-builder/AiSearchDialog";
import styles from "@/style";
import { FileTextIcon, MessageSquareWarningIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TitleSwapper } from "@/components/program-builder/TitleSwapper";
import { AvatarStack } from "@/components/avatar-stack";
import { jack, people02, people03, people04, people05 } from "public";

export const metadata = {
    title: "AI Program Builder | Proxima Fitness",
    description: "Generate a custom program with AI. Build your ideal program fast.",
  };

  export default function AiProgramBuilder() {

    return (
        <div className={ `bg-white ${styles.flexCenter} flex-col` }>
            <div className={ `${styles.boxWidth}` }>
                <div className="h-[80vh] flex flex-col max-sm:gap-0 items-center justify-center gap-6">
                    <div className="font-main text-4xl font-bold text-center text-swapper">
                        <TitleSwapper />
                    </div>
                    <div className="flex flex-row max-sm:flex-col max-sm:pt-8 justify-center items-center gap-6">
                        <AiSearchDialog />
                        <Link
                            target="_self"
                            rel="noopener noreferrer"
                            href={ `/program-builder/build-program?empty=true` }
                        >
                            <Button
                                className="font-main w-[200px] rounded-xl group relative h-16 border-2 border-gray-300 hover:border-gray-400 bg-white text-gray-700 hover:bg-gray-50 shadow-md transition-all duration-300 hover:shadow-lg"
                            >
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="absolute bottom-0 left-0 w-0 h-1 bg-gray-300 group-hover:w-full transition-all duration-300"></div>
                                </div>
                                <span className="relative flex items-center justify-center gap-2 text-lg font-medium">
                                <FileTextIcon />
                                Empty Template
                                </span>
                            </Button>
                        </Link>
                    </div>
                    <div className="pt-4 flex flex-col justify-center items-center">
                        <AvatarStack
                            avatars={[
                                {name: "jack.hanlon", image:  jack.src},
                                {name: "scottlhanlon", image: people03.src},
                                {name: "jordan.vandesande", image: people04.src},
                                {name: "marcola", image: people05.src},
                                {name: "sina", image: people02.src}] }
                        />
                        3000+ lifters are building with Proxima
                    </div>

                </div>
                <div className="bg-red-400 py-4 text-white hidden max-sm:flex max-sm:flex-col max-sm:justify-center max-sm:items-center text-center">
                    <MessageSquareWarningIcon />
                    Please use on a desktop computer for best experience
                </div>
            </div>
        </div>

    );
}
