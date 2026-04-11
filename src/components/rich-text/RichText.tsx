/* eslint-disable @next/next/no-img-element */
/**
 * @module RichText
 *
 * Thin renderer for Payload CMS Lexical rich-text content used in blog
 * posts and marketing pages. Translates the serialized editor state into
 * semantic HTML elements styled with the design system.
 *
 * Depends on:
 * - Payload CMS `SerializedEditorState` for document structure
 * - `getMediaPublicUrl` for resolving uploaded media URLs
 *
 * Used by:
 * - Blog and marketing pages that fetch rich-text content from Payload
 *   and need a React-friendly renderer.
 */

import { getMediaPublicUrl } from '@/api/blog';
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";

const linkAnchorClassName =
    "text-primary underline underline-offset-2 hover:opacity-90";

/** Resolve href for Payload LinkFeature nodes; internal links need a site-specific mapper (fallback `#`). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hrefForLinkNode(node: any): string {
    const fields = node?.fields;
    if (!fields) return "#";
    if (fields.linkType === "internal") {
        return "#";
    }
    return typeof fields.url === "string" ? fields.url : "#";
}

interface IProps {
    /**
     * Serialized Lexical editor state produced by Payload's rich-text field.
     * The renderer walks the `root.children` tree to produce HTML.
     */
    data: SerializedEditorState;
}

/**
 * Render a Payload CMS Lexical rich-text document into semantic HTML
 * elements, including support for lists, headings, quotes, horizontal
 * rules, links, and uploaded media.
 */
export const RichText: React.FC<IProps> = (props) => {

    const { data } = props;

    if (!data || !data.root.children) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderNode = (node:any, index: number) => {
        switch (node.type) {
            case "list": {
                if (node.listType === "check") {
                    return (
                        <div key={ index }>
                            { /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ }
                            {node.children.map((child: any, childIndex: number) => (
                                <div key={ childIndex } style={ { display: "flex", alignItems: "center" } }>
                                    <input type="checkbox" id={ `check-${index}-${childIndex}` } className="text-foreground" />
                                    <label htmlFor={ `check-${index}-${childIndex}` } className="text-foreground" style={ { marginLeft: "8px" } }>
                                        {child.children.map(renderNode)}
                                    </label>
                                </div>
                            ))}
                        </div>
                    );
                } else {
                    const ListTag = node.listType === "bullet" ? "ul" : "ol";
                    return <ListTag key={ index }>{node.children.map(renderNode)}</ListTag>;
                }
            }
            case "listitem":
                return <li className="text-foreground" key={ index }>{node.children.map(renderNode)}</li>;
            case "paragraph":
                return <p className='py-4 text-foreground' key={ index }>{node.children?.map(renderNode)}</p>;
            case "heading":
                { const HeadingTag = node.tag || "h1";
                const fontSize = (HeadingTag === "h6" ? "text-base" : HeadingTag === "h5" ? "text-lg" : HeadingTag === "h4" ? "text-xl" : HeadingTag === "h3" ? "text-2xl" : HeadingTag === "h2" ? "text-3xl" : HeadingTag === "h1" ? "text-4xl" : "text-base");
                return <HeadingTag className={ `${fontSize} text-foreground` } key={ index }>{node.children.map(renderNode)}</HeadingTag>; }
            case "text":
                return <span className="text-foreground" key={ index }>{node.text}</span>;
            case "quote":
                return <blockquote className="text-foreground border-l-4 border-border pl-4 my-4" key={ index }>{node.children.map(renderNode)}</blockquote>;
            case "horizontalrule":
                return <hr className="border-border" key={ index } />;
            case "upload":
                return <img key={ index } src={ getMediaPublicUrl(node.fields?.media_url) } alt="uploaded content" />;
            case "autolink": {
                const rel = node.fields?.newTab ? "noopener noreferrer" : undefined;
                const target = node.fields?.newTab ? "_blank" : undefined;
                return (
                    <a
                        key={ index }
                        href={ node.fields?.url ?? "#" }
                        rel={ rel }
                        target={ target }
                        className={ linkAnchorClassName }
                    >
                        { node.children?.map(renderNode) }
                    </a>
                );
            }
            case "link": {
                const rel = node.fields?.newTab ? "noopener noreferrer" : undefined;
                const target = node.fields?.newTab ? "_blank" : undefined;
                return (
                    <a
                        key={ index }
                        href={ hrefForLinkNode(node) }
                        rel={ rel }
                        target={ target }
                        className={ linkAnchorClassName }
                    >
                        { node.children?.map(renderNode) }
                    </a>
                );
            }
            default:
                return null;
            }
    };

    return <div>{data.root.children.map(renderNode)}</div>;
};
