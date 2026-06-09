/** Dummy Supabase env so modules that import @/api/index can load in unit tests. */
process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_KEY ??= "test-supabase-anon-key";
process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_BLOG_URL ??= "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_BLOG_KEY ??= "test-supabase-blog-anon-key";
process.env.NEXT_PUBLIC_REACT_APP_CAPTCHA_SITE_KEY ??= "test-captcha-site-key";
