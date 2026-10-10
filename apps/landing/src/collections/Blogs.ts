/**
 * @module Blogs
 *
 * Defines the Payload CMS collection schema for blog posts. Each blog entry
 * includes a title, subtitle, rich-text content (powered by the Lexical editor),
 * an estimated reading time, and a hero media URL. The rich-text editor is
 * configured with a curated set of formatting features and inline media uploads
 * via the Media collection.
 *
 * Depends on: @payloadcms/richtext-lexical (Lexical editor features), Media collection (upload target)
 * Used by: Payload CMS admin panel, blog listing/detail pages
 */
import { BoldFeature, FixedToolbarFeature, HeadingFeature, HorizontalRuleFeature, InlineToolbarFeature, ItalicFeature, lexicalEditor, LinkFeature, ParagraphFeature, UnderlineFeature, UploadFeature } from '@payloadcms/richtext-lexical';
import type { CollectionConfig } from 'payload';

/**
 * Blog post collection configuration for Payload CMS.
 *
 * Publicly readable; timestamps are auto-managed by Payload. The Lexical
 * rich-text editor is customized to support headings (h1-h6), basic
 * formatting, links, horizontal rules, and inline media uploads that
 * reference the `media` collection.
 */
export const Blogs: CollectionConfig = {
    slug: 'blogs',
    access: {
        read: () => true,
    },
    fields: [
        {
            name: 'title',
            type: 'text',
            label: 'Title',
            required: true,
        },
        {
            name: 'subtitle',
            type: 'text',
            label: 'SubTitle',
            required: true,

        },
        {
            name: 'content',
            type: 'richText',
            editor: lexicalEditor({
                features: ({rootFeatures}) => {
                    return [
                        ...rootFeatures,
                        HeadingFeature({ enabledHeadingSizes: ['h1','h2','h3','h4','h5','h6']}),
                        BoldFeature(),
                        ItalicFeature(),
                        UnderlineFeature(),
                        LinkFeature(),
                        ParagraphFeature(),
                        FixedToolbarFeature(),
                        InlineToolbarFeature(),
                        HorizontalRuleFeature(),
                        UploadFeature({
                            collections: {
                                media: {
                                    fields: [
                                        {
                                            name: 'media_url',
                                            type: 'text',
                                            label: 'Media URL',
                                        },
                                    ],
                                },
                            },
                        }),
                    ];
                },
            }),
            label: "Content",
            required: true,
        },
        {
            name: 'time',
            type: 'number',
            label: "Time",
            required: true,
        },
        {
            name: 'media_url',
            type: 'text',
            label: "Media URL",
            required: true,
        },
    ],
    timestamps: true,
  };

