/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { qr_code, starGold,apple, google, proxima_logo_small } from "public";

interface IProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    isMobile: boolean;
}

export const DownloadPopup: React.FC<IProps> = (props) => {

    const { isOpen, setIsOpen, isMobile } = props;

    return (
        <Dialog open={ isOpen } onOpenChange={ setIsOpen }>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader className="flex justify-center items-center">
                    { isMobile ?
                        <span className="flex flex-row pt-6 gap-2">
                            <a href="https://testflight.apple.com/join/dG4SXTTm">
                                <img src={ (apple as any).src } alt="apple"
                    style={ {
                        width: "150px",
                        height: "100%",
                        display: "inline-block",
                        cursor: "pointer",
                    } }
                    />
                            </a>
                            <a href="https://app.proximafitness.com/">
                                <img src={ (google as any).src } alt="google"
                        style={ {
                            width: "150px",
                            height: "100%",
                            display: "inline-block",
                            cursor: "pointer",
                        } }
                    />
                            </a>
                        </span>
                :
                        <Button className="cursor-default sm:w-[90%] bg-lightSecondary h-[90px] my-6 hover:bg-lightSecondary">
                            <img src={ (proxima_logo_small as any).src } alt="Proxima Logo" />
                        </Button>
            }

                    <DialogTitle className="text-3xl pb-4">DOWNLOAD THE APP FOR <span className="text-lightSecondary">FREE</span></DialogTitle>
                    <DialogDescription className={ `flex ${ isMobile ? "flex-col" : "flex-row" } justify-between items-start` }>
                        <span className="w-[100%] flex flex-col items-center">
                            { !isMobile &&
                            <>
                                <img src={ (qr_code as any).src } alt="Proxima Logo" className="w-auto h-[200px]" />
                                <span className="font-bold">Scan QR Code to Download</span>
                            </>
                }

                            <span className="flex flex-row py-4">
                                <span>
                                    <img src={ (starGold as any).src } alt="star_gold" className="w-[30px] h-[20px] object-contain" />
                                </span>
                                <span>
                                    <img src={ (starGold as any).src } alt="star_gold" className="w-[30px] h-[20px] object-contain" />
                                </span>
                                <span>
                                    <img src={ (starGold as any).src } alt="star_gold" className="w-[30px] h-[20px] object-contain" />
                                </span>
                                <span>
                                    <img src={ (starGold as any).src } alt="star_gold" className="w-[30px] h-[20px] object-contain" />
                                </span>
                                <span>
                                    <img src={ (starGold as any).src } alt="star_gold" className="w-[30px] h-[20px] object-contain" />
                                </span>
                                4.5 Stars on Apple App Store
                            </span>
                        </span>
                        <span className="w-[100%]">
                            <span className="block font-normal text-lg pb-2 text-start"><span className="font-black pr-2">&middot;</span> Follow <span className="font-bold">100+</span> Proven Workout Programs</span>
                            <span className="block font-normal text-lg pb-2 text-start"><span className="font-black pr-2">&middot;</span> Use the <span className="font-bold">AI Workout Builder</span> to easily upload your notes / spreadsheets</span>
                            <span className="block font-normal text-lg pb-2 text-start"><span className="font-black pr-2">&middot;</span> <span className="font-bold">Generate</span> Workout Programs with AI</span>
                            <span className="block font-normal text-lg pb-2 text-start"><span className="font-black pr-2">&middot;</span> Track your progress</span>
                            <span className="block font-normal text-lg pb-2 text-start"><span className="font-black pr-2">&middot;</span> <span className="font-bold">Share</span> Personal Records with your friends</span>
                        </span>
                    </DialogDescription>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    );
};
