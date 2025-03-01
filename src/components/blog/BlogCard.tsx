"use client";

import { convertSupabaseDateToReadable } from "@/utils/helpers";
import Image from "next/image";

interface IProps {
    blog: TBlog;
}

export const BlogCard: React.FC<IProps> = (props) => {

    const {
        blog,
    } = props;

    return (
        <div key={ blog.id } className="py-8 border-b border-gray-300 flex flex-row items-center justify-between">
            <div className="flex-[3] pr-4">
                <div className="font-bold pb-2 text-3xl">
                    { blog.title }
                </div>
                <div className="pb-2 text-lg">
                    { blog.subtitle }
                </div>
                <div className="italic">
                    { convertSupabaseDateToReadable(blog.created_at) } | { blog.time } Mins
                </div>
            </div>
            <div className="flex-[1]">
                <Image className="h-[200px] w-[200px] rounded-lg" src={ blog.image_url } width={ 500 } height={ 500 }></Image>
            </div>

        </div>
    );
};
