import { BoldFeature, FixedToolbarFeature, HeadingFeature, HorizontalRuleFeature, InlineToolbarFeature, ItalicFeature, lexicalEditor, LinkFeature, ParagraphFeature, UnderlineFeature, UploadFeature } from '@payloadcms/richtext-lexical';
import type { CollectionConfig } from 'payload';

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

