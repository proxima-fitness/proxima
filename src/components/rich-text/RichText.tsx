import { getMediaPublicUrl } from '@/api/blog';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';

interface IProps {
    data: SerializedEditorState;
}

export const RichText: React.FC<IProps> = (props) => {

    const { data } = props;

    if (!data || !data.root.children) return null;

    const renderNode = (node, index) => {
        switch (node.type) {
            case "list": {
                if (node.listType === "check") {
                    return (
                        <div key={ index }>
                            {node.children.map((child, childIndex) => (
                                <div key={ childIndex } style={ { display: "flex", alignItems: "center" } }>
                                    <input type="checkbox" id={ `check-${index}-${childIndex}` } />
                                    <label htmlFor={ `check-${index}-${childIndex}` } style={ { marginLeft: "8px" } }>
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
                return <li key={ index }>{node.children.map(renderNode)}</li>;
            case "paragraph":
                return <p className='py-4' key={ index }>{node.children?.map(renderNode)}</p>;
            case "heading":
                const HeadingTag = node.tag || "h1";
                const fontSize = (HeadingTag === "h6" ? "text-base" : HeadingTag === "h5" ? "text-lg" : HeadingTag === "h4" ? "text-xl" : HeadingTag === "h3" ? "text-2xl" : HeadingTag === "h2" ? "text-3xl" : HeadingTag === "h1" ? "text-4xl" : "text-base");
                return <HeadingTag className={ `${fontSize}` } key={ index }>{node.children.map(renderNode)}</HeadingTag>;
            case "text":
                return <span key={ index }>{node.text}</span>;
            case "quote":
                return <blockquote key={ index }>{node.children.map(renderNode)}</blockquote>;
            case "horizontalrule":
                return <hr key={ index } />;
            case "upload":
                return <img key={ index } src={ getMediaPublicUrl(node.fields?.media_url) } alt="uploaded content" />;
            default:
                return null;
            }
    };

    return <div>{data.root.children.map(renderNode)}</div>;
};
