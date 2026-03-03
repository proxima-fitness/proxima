/**
 * @module Media
 *
 * Defines the Payload CMS collection for uploaded media assets (images, files).
 * Acts as the central file-upload store referenced by other collections such as
 * Blogs (via the Lexical UploadFeature) and any content that embeds media.
 *
 * Depends on: payload (CollectionConfig)
 * Used by: Blogs collection (inline uploads), Payload CMS admin panel
 */
import type { CollectionConfig } from 'payload';

/**
 * Media asset collection with public read access and file upload enabled.
 * Requires an `alt` text field for accessibility on every uploaded asset.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: true,
};
