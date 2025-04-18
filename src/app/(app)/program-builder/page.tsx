import styles from "@/style";
import { BicepsFlexedIcon, BookOpenIcon, Calculator, FootprintsIcon, MessageSquareWarningIcon, SquarePowerIcon } from "lucide-react";
import { AvatarStack } from "@/components/avatar-stack";
import { jack, people02, people03, people04, people05 } from "public";
import { Prompt } from "@/components/program-builder/Prompt";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata = {
    title: "AI Program Builder | Proxima Fitness",
    description: "Generate a custom program with AI. Build your ideal program fast.",
  };

  export default function AiProgramBuilder() {

    return (
        <div className={ `bg-white ${styles.flexCenter} flex-col` }>
            <div className={ `${styles.boxWidth}` }>
                <div className="sm:mt-[200px] sm:mb-[300px] max-sm:h-full max-sm:mt-[150px] max-sm:mb-[150px] flex flex-col max-sm:gap-0 items-center justify-center gap-6">
                    <div className="text-center">
                        <div className="font-main text-4xl font-bold uppercase">The AI Workout Program Builder</div>
                        <div className="text-lg font-normal">Get a tailored workout program in seconds</div>
                    </div>
                    <div className="flex flex-col max-sm:flex-col max-sm:pt-8 justify-center items-center w-full">
                        <Prompt />
                        <div className="pt-2 flex flex-wrap justify-center gap-2 md:gap-3">
                            <Link
                                target="_self"
                                rel="noopener noreferrer"
                                href={ `/program-builder/build-program?empty=true` }
                            >
                                <Button variant="outline" className="rounded-full flex items-center gap-2 h-auto text-xs">
                                    <BookOpenIcon  />
                                    Empty Template
                                </Button>
                            </Link>
                            <Button variant="outline" className="rounded-full flex items-center gap-2 h-auto text-xs">
                                <BicepsFlexedIcon />
                                PPL Program
                            </Button>

                            <Button variant="outline" className="rounded-full flex items-center gap-2 h-auto text-xs">
                                <SquarePowerIcon />
                                Smolov Jr.
                            </Button>

                            <Button variant="outline" className="rounded-full flex items-center gap-2 h-auto text-xs">
                                <FootprintsIcon />
                                Athletic Training
                            </Button>

                            <Button variant="outline" className="rounded-full flex items-center gap-2 h-auto text-xs">
                                <Calculator />
                                Weight loss Program
                            </Button>
                        </div>
                    </div>
                    <div className="pt-4 flex flex-col justify-center items-center">
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
