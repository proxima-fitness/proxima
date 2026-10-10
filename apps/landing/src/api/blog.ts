/**
 * @module api/blog
 *
 * Data-fetching layer for the Proxima blog. Reads from a separate Supabase
 * project (`supablog`) that stores blog posts and their associated media.
 * Each blog entry can have a cover image stored in the `media` storage bucket;
 * fetching functions resolve the public URL and attach it to the returned object.
 *
 * Depends on: ./index (supablog client)
 * Used by: hooks.ts (useBlogs, useBlogByIdSSR, useBlogsSSR), blog pages
 */
import { supablog } from ".";

/**
 * Fetches a paginated list of blog posts, ordered newest-first, with resolved
 * cover-image URLs attached.
 *
 * @param limit - Maximum number of posts to return (default 10)
 * @param offset - Zero-based offset for pagination (default 0)
 * @returns An array of blog objects with `image_url` populated, or undefined on error
 */
export const getBlogs = async (limit: number = 10, offset: number = 0) => {
    try {
        const { data: blogs, error: blogError } = await supablog
        .from('blogs')
        .select('*').order("created_at", {ascending: false})
        .range(offset, offset + limit - 1);

        if (blogError) {
            console.error('Error fetching blogs:', blogError);
        }

        if (blogs){
            const imageUrls = await Promise.all(blogs.map(async (blog) => {
                if (blog.media_url) {
                    return getMediaPublicUrl(blog.media_url);
                }
                return undefined;
            }));

            const blogsWithImage = blogs.map((blog, index) => ({
                ...blog,
                image_url: imageUrls[index],
            }));

            return blogsWithImage as TBlog[];

        }
    } catch (error: unknown) {
        console.error('Error fetching blogs:', error);
    }
};


/**
 * Fetches a single blog post by its numeric ID.
 *
 * @param id - The blog post's primary key
 * @returns The matching blog object, or undefined if not found
 */
export const getBlogById = async (id: number) => {
    try {
        const { data: blogs, error: blogError } = await supablog
        .from('blogs')
        .select('*').eq("id", id);

        if (blogError || blogs === null) {
            console.error('Error fetching blogs by id', blogError);
        }

        return blogs ? blogs[0] as TBlog : undefined;

    } catch (error: unknown) {
        console.error('Error fetching blog by id', error);
    }
};

/**
 * Retrieves a media record from the `media` table by filename.
 *
 * @param filename - The exact filename stored in the media table
 * @returns The matching media row, or undefined on error
 */
export const getMediaByFileName = async (filename: string) => {
    try {
        const { data: mediaImage, error: mediaImageError } = await supablog
        .from('media')
        .select('*').eq("filename",filename);

        if (mediaImageError) {
            console.error('Error fetching Media Image:', mediaImageError);
        }

        return mediaImage?.[0];

    } catch (error: unknown) {
        console.error('Error fetching Media Image:', error);
    }
};

/**
 * Resolves the publicly accessible URL for a file in the blog `media` storage bucket.
 *
 * @param filename - Path/name of the file within the `media` bucket
 * @returns The public URL string, or undefined on error
 */
export const getMediaPublicUrl = (filename: string) => {
    try {
        const { data: publicUrl } = supablog.storage
        .from('media')
        .getPublicUrl(filename);

        return publicUrl.publicUrl as string;

    } catch (error: unknown) {
        console.error('Error fetching Public Url:', error);
    }
};
