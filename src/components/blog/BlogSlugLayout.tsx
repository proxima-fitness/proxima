
import { useBlogByIdSSR } from "@/api/hooks";
import { convertSupabaseDateToReadable } from "@/utils/general/helpers";
import { FC } from "react";
// import { RichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { RichText } from "../rich-text/RichText";

interface IProps {
    id: string;
}

export const BlogSlugLayout: FC<IProps> = async (props) => {

    const { id } = props;
  // eslint-disable-next-line
    const blog = await useBlogByIdSSR(id);

    return (
        <>
            <div className="grid grid-cols-3 gap-12">
                <div className="col-span-2">
                    <div className="text-4xl font-bold py-2">
                        {blog.title}
                    </div>
                    <div className="py-2 text-sm">
                        Created by the Proxima Fitness Team
                    </div>
                    <div className="italic text-sm">
                        { convertSupabaseDateToReadable(blog.created_at) } | {blog.time} Mins | 205 Views
                    </div>
                    <div className="py-8">
                        <RichText data={ blog.content as SerializedEditorState  } />
                    </div>
                </div>
                {/* Temporarily deprecated - mobile app download */}
                {/* <div className="rounded-xl bg-gray-900 h-[500px] border-l border-gray-300 flex flex-col text-center justify-center items-center px-8">
                    <div className="flex flex-col">
                        <h2 className={ styles.heading2 }>Download the App For Free</h2>
                        <p className={ `${styles.paragraph}` }>
                            It takes less than a minute
                        </p>
                    </div>
                    <div className="pt-4">
                        <GetStarted noBorder={ true } blog={ true } />
                    </div>
                </div> */}
            </div>
        </>
    );
};
