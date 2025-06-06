/* eslint-disable @typescript-eslint/no-explicit-any */
import { qr_code,apple,google, starGold } from "public";


export const metadata = {
    title: "Download App | Proxima Fitness",
    description: "Download the App on iOS and Android or use the Web Builder",
  };

  export default function DownloadPage() {
    return (
        <>
            <div className={ `bg-white flex items-center justify-center flex-col p-24` }>
                <div className="flex-1 flex flex-col text-center items-center justify-center">
                    <h2 className="text-black font-bold text-6xl">Download the App now</h2>
                    <p className={ `text-black text-center max-w-[470px] mt-5 text-3xl` }>
                        It takes less than a minute
                    </p>
                </div>
                <div className="pt-4">
                    <div>
                        <div className="flex flex-row gap-4">
                            <div>
                                <img src={ (qr_code as any).src } alt="Proxima Logo" className="rounded w-auto h-[120px]" />
                            </div>
                            <div style={ { display: "flex", flexDirection: "column", justifyContent: "flex-start", gap: "10px", zIndex: "5" } }>

                                <a href="https://testflight.apple.com/join/dG4SXTTm"
                                    >
                                    <img src={ (apple as any).src } alt="apple"
                                        style={ {
                                            width: "150px",
                                            height: "100%",
                                            borderRadius: "8px",
                                            display: "inline-block",
                                            cursor: "pointer",
                                        } }
                                        />
                                </a>
                                <a href="https://play.google.com/store/apps/details?id=com.proximafitness.app&hl=en_CA">
                                    <img src={ (google as any).src } alt="google"
                                            style={ {
                                                width: "150px",
                                                height: "100%",
                                                borderRadius:"8px",
                                                display: "inline-block",
                                                cursor: "pointer",
                                            } }
                                        />
                                </a>
                            </div>
                        </div>
                        <span className="flex flex-row py-4 text-black">
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
                    </div>
                </div>
            </div>
        </>
    );
}
