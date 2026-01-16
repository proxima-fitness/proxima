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
    NEXT_PUBLIC_REACT_APP_CAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_REACT_APP_CAPTCHA_SITE_KEY,
  },
  async redirects() {
    return [
      {
        source: '/program-builder',
        destination: '/',
        permanent: true, // use false for temporary (307), true for permanent (308)
      },
    ]
  }
}

const withMDX = createMDX({
  // Add markdown plugins here, as desired
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },

})

export default withPayload(withMDX(nextConfig));
