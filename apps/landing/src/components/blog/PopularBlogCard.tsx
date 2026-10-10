// SPDX-License-Identifier: AGPL-3.0-only

/*
 * @module PopularBlogCard
 * @description Compact list item for a popular blog post, optimized for sidebar presentation.
 * @dependsOn The shared `TBlog` type for blog metadata.
 * @usedBy Blog layouts to surface popular or recommended posts alongside main content.
 */

/**
 * Props for `PopularBlogCard`.
 * @property blog Blog metadata of the popular article to display in the sidebar.
 */
interface IProps {
    blog: TBlog;
}

/**
 * PopularBlogCard renders a minimal title-only representation of a blog post.
 */
export const PopularBlogCard: React.FC<IProps> = (props) => {

    const  {
        blog,
    } = props;

    return (
        <div key={ blog.id }>
            <div className="pb-8 text-foreground">
                { blog.title }
            </div>
        </div>
    );
};



