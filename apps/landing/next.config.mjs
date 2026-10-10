import { withPayload } from "@payloadcms/next/withPayload";
import createMDX from '@next/mdx'
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(appDir, '../..');

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
  // Monorepo workspace packages (ADR 0035).
  transpilePackages: [
    '@proxima/program-mutation-schemas',
    '@proxima/exercise-identity',
    '@proxima/mutation-constraint-gate',
  ],
  // Monorepo: keep Next/Turbopack rooted on this app, not the workspace root.
  outputFileTracingRoot: monorepoRoot,
  // Inline critical CSS to reduce render-blocking; trade-off: repeat visits lose stylesheet caching.
  experimental: {
    inlineCss: true,
    optimizePackageImports: ['lucide-react', 'motion', '@radix-ui/react-icons'],
  },
  env: { 
    NEXT_PUBLIC_REACT_APP_SUPABASE_KEY: process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_KEY,
    NEXT_PUBLIC_REACT_APP_SUPABASE_URL: process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_URL,
    NEXT_PUBLIC_REACT_APP_SUPABASE_BLOG_URL: process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_BLOG_URL,
    NEXT_PUBLIC_REACT_APP_SUPABASE_BLOG_KEY: process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_BLOG_KEY,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_REACT_APP_CAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_REACT_APP_CAPTCHA_SITE_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID: process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID,
    NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID_DARK: process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID_DARK,
    NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL_URL: process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL_URL,
  },
  async redirects() {
    return [
      {
        source: '/program-builder',
        destination: '/',
        permanent: true, // use false for temporary (307), true for permanent (308)
      },
      // Legacy program URL (UUID + slug) -> new URL (slug + numeric id)
      {
        source: "/programs/61944abe-1126-4ada-b72d-d1b22cadce10/phrak's-greyskull-lp",
        destination: "/programs/phraks-greyskull-linear-progression/1035",
        permanent: true,
      },
      {
        source: "/programs/61944abe-1126-4ada-b72d-d1b22cadce10/phrak%27s-greyskull-lp",
        destination: "/programs/phraks-greyskull-linear-progression/1035",
        permanent: true,
      },
      {
        source: '/waitlist',
        destination: '/',
        permanent: true,
      },
      {
        source: '/dashboard',
        destination: '/profile',
        permanent: true,
      },
      {
        source: '/scalar',
        destination: '/developers',
        permanent: true,
      }
    ]
  },
  outputFileTracingIncludes: {
    '/api/chat': ['./.agents/**/*'],
  },
  turbopack: {
    root: appDir,
    rules: {
      '*.wgsl': {
        loaders: ['@vgpu/wgsl/loader-webpack'],
        as: '*.js',
      },
    },
  },
  webpack(config) {
    config.module ??= {};
    config.module.rules ??= [];
    config.module.rules.push({
      test: /\.wgsl$/,
      loader: '@vgpu/wgsl/loader-webpack',
    });
    return config;
  },
}

const withMDX = createMDX({
  // Add markdown plugins here, as desired
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },

})

export default withPayload(withMDX(nextConfig));
