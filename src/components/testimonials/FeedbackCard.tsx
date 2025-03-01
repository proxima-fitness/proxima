/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { motion } from "motion/react";
import quotes from "../../../public/quotes.svg";
import starGold from "../../../public/StarGold.svg";
import Image from "next/image";

interface IProps {
    content: string;
    name: string;
    title: string;
    img: any;
}

export const FeedbackCard: React.FC<IProps> = (props) => {

    const {
        content,
        name,
        title,
        img,
    } = props;

    return (
        <motion.div
            whileHover={ { scale: 1.08 } }
            onHoverStart={ e => {} }
            onHoverEnd={ e => {} }
            className="flex justify-around flex-col px-6 rounded-[20px] max-w-[370px] m-6 feedback-card"
        >
            <Image src={ (quotes as any).src } width={ 500 } height={ 500 } alt="double_quotes" className="w-[42.6px] h-[27.6px] object-contain" />
            <div className="font-second font-normal text-[16px] leading-[32.4px] text-white py-4">
                {content}
                <div className="flex flex-row py-4">
                    <div>
                        <Image src={ (starGold as any).src } width={ 500 } height={ 500 } alt="star_gold" className="w-[30px] h-[20px] object-contain" />
                    </div>
                    <div>
                        <Image src={ (starGold as any).src } width={ 500 } height={ 500 } alt="star_gold" className="w-[30px] h-[20px] object-contain" />
                    </div>
                    <div>
                        <Image src={ (starGold as any).src } width={ 500 } height={ 500 } alt="star_gold" className="w-[30px] h-[20px] object-contain" />
                    </div>
                    <div>
                        <Image src={ (starGold as any).src } width={ 500 } height={ 500 } alt="star_gold" className="w-[30px] h-[20px] object-contain" />
                    </div>
                    <div>
                        <Image src={ (starGold as any).src } width={ 500 } height={ 500 } alt="star_gold" className="w-[30px] h-[20px] object-contain" />
                    </div>
                </div>
            </div>

            <div className="flex flex-row">
                <Image src={ img } width={ 500 } height={ 500 } alt={ name } className="w-[48px] h-[48px] rounded-full" />
                <div className="flex flex-col ml-4">
                    <h4 className="font-second font-semibold text-[20px] leading-[32px] text-white">
                        {name}
                    </h4>
                    <p className="font-second font-normal text-[16px] leading-[24px] text-dimWhite">
                        {title}
                    </p>
                </div>
            </div>
        </motion.div>
    );
};
