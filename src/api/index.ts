import { createClient } from '@supabase/supabase-js';

let url = "";
try {
    url = process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_URL;
} catch (error: unknown) {
    console.error("Supabase url is missing", error);
    throw new Error('Supabase url is missing. Check your environment variables.');
}
// if (!process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_URL) {
//     console.error('Supabase url is missing. Check your environment variables.');
//     throw new Error('Supabase url is missing. Check your environment variables.');

// }

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

if (!process.env.NEXT_PUBLIC_REACT_APP_HEVY_API_KEY) {
    console.error('Hevy API key is missing. Check your environment variables.');
}


export const supabaseUrl = url;

export const supabaseBlogUrl = process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_BLOG_URL;

export const supabaseKey = process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_KEY ?? "";
export const supabaseBlogKey = process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_BLOG_KEY ?? "";

// export const hevyApiKey = process.env.NEXT_PUBLIC_REACT_APP_HEVY_API_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
export const supablog = createClient(supabaseBlogUrl, supabaseBlogKey);
