/**
 * @module api/index
 *
 * Central Supabase client initialization and environment configuration for the
 * Proxima app. Exports two Supabase clients - one for the main application
 * database (with SSR-aware cookie-based auth) and one for the separate blog
 * database - along with shared environment constants such as the captcha site key.
 *
 * All other API modules (`authentication`, `programs`, `users`, etc.) import
 * their Supabase client from this file, making it the single source of truth
 * for connection configuration.
 *
 * Depends on: @supabase/supabase-js, @/utils/supabase/client, environment variables
 * Used by: all src/api/* modules, React Query hooks
 */
import { createClient } from '@supabase/supabase-js';
import { createClient as createClientLocal } from "@/utils/supabase/client";

if (!process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_URL) {
    console.error('Supabase url is missing. Check your environment variables.');
    throw new Error('Supabase url is missing. Check your environment variables.');
}

if (!process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_KEY) {
    console.error('Supabase key is missing. Check your environment variables.');
    throw Error('Supabase key is missing. Check your environment variables.');
}

if (!process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_BLOG_URL) {
    console.error('Supabase blog url is missing. Check your environment variables.');
    throw Error('Supabase blog url is missing. Check your environment variables.');}

if (!process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_BLOG_KEY) {
    console.error('Supabase blog key is missing. Check your environment variables.');
    throw Error('Supabase blog key is missing. Check your environment variables.');}

if (!process.env.NEXT_PUBLIC_REACT_APP_CAPTCHA_SITE_KEY) {
    console.error('captcha sitekey is missing. Check your environment variables.');
    throw Error('captcha sitekey is missing. Check your environment variables.');
}


/** Base URL for the main Supabase project (used to construct edge-function endpoints). */
export const supabaseUrl = process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_URL ?? "";

/** Base URL for the separate blog Supabase project. */
export const supabaseBlogUrl = process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_BLOG_URL ?? "";

/** Anon/public API key for the main Supabase project. */
export const supabaseKey = process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_KEY ?? "";
/** Anon/public API key for the blog Supabase project. */
export const supabaseBlogKey = process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_BLOG_KEY ?? "";

// export const hevyApiKey = process.env.NEXT_PUBLIC_REACT_APP_HEVY_API_KEY;

/** SSR-aware Supabase client for the main app (uses cookie-based auth via @/utils/supabase/client). */
export const supabase = createClientLocal();
/** Standard Supabase client for the blog project (no auth/cookie handling needed). */
export const supablog = createClient(supabaseBlogUrl, supabaseBlogKey);

/** hCaptcha site key used by authentication forms to generate captcha tokens. */
export const sitekey = process.env.NEXT_PUBLIC_REACT_APP_CAPTCHA_SITE_KEY ?? "";
