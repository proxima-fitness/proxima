// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module payload.config
 *
 * Central Payload CMS configuration. Defines the admin panel settings,
 * content collections (Users, Media, Blogs), rich-text editor, database
 * connection, and active plugins. This is the single source of truth for
 * Payload's runtime behaviour and auto-generated TypeScript types.
 *
 * Depends on: @payloadcms/db-postgres, @payloadcms/richtext-lexical,
 *             @payloadcms/payload-cloud, sharp, collections/*
 * Used by: Payload CMS runtime, Next.js API routes
 */

// storage-adapter-import-placeholder
import { postgresAdapter } from '@payloadcms/db-postgres';
import { payloadCloudPlugin } from '@payloadcms/payload-cloud';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import path from 'path';
import { buildConfig } from 'payload';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

import { Users } from './collections/Users';
import { Media } from './collections/Media';
import { Blogs } from './collections/Blogs';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Blogs],
  editor: lexicalEditor({}),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),
  sharp,
  plugins: [
    payloadCloudPlugin(),
    // storage-adapter-placeholder
  ],
});
