import {withSentryConfig} from '@sentry/nextjs';
import { withPayload } from "@payloadcms/next/withPayload";
import createMDX from '@next/mdx'
import dotenv from 'dotenv';

// Load environment variables from `.env.production` in production mode
if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: '.env.production' });
} else {
  dotenv.config({ path: '.env.local' });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Outputs a Single-Page Application (SPA).
  // distDir: './dist', // Changes the build output directory to `./dist/`.
  images: { unoptimized: true },
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  env: { 
    NEXT_PUBLIC_REACT_APP_SUPABASE_KEY: process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_KEY,
    NEXT_PUBLIC_REACT_APP_SUPABASE_URL: process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_URL,
    NEXT_PUBLIC_REACT_APP_SUPABASE_BLOG_URL: process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_BLOG_URL,
    NEXT_PUBLIC_REACT_APP_SUPABASE_BLOG_KEY: process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_BLOG_KEY,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  }
}

const withMDX = createMDX({
  // Add markdown plugins here, as desired
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },

})

export default withSentryConfig(withPayload(withMDX(nextConfig)), {
// For all available options, see:
// https://www.npmjs.com/package/@sentry/webpack-plugin#options

org: "proxima-fitness-inc",
project: "javascript-nextjs",

// Only print logs for uploading source maps in CI
silent: !process.env.CI,

// For all available options, see:
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

// Upload a larger set of source maps for prettier stack traces (increases build time)
widenClientFileUpload: true,

// Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
// This can increase your server load as well as your hosting bill.
// Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
// side errors will fail.
tunnelRoute: "/monitoring",

// Automatically tree-shake Sentry logger statements to reduce bundle size
disableLogger: true,

// Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
// See the following for more information:
// https://docs.sentry.io/product/crons/
// https://vercel.com/docs/cron-jobs
automaticVercelMonitors: true,
});