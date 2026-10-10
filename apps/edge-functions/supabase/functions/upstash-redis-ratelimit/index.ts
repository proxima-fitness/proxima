
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { createClient } from "@supabase/supabase-js";

serve(async (req) => {
  try {
    // Create a Supabase client with the Auth context of the logged in user.
    const supabaseClient = createClient(
      // Supabase API URL - env var exported by default.
      Deno.env.get("SUPABASE_URL") ?? "",
      // Supabase API ANON KEY - env var exported by default.
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      // Create client with Auth context of the user that called the function.
      // This way your row-level-security (RLS) policies are applied.
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );
    // Now we can get the session or user object
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("no user");
    console.log(user.id);

    const redis = new Redis({
      url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
      token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
    });

    // Create a new ratelimiter, that allows 10 requests per 10 seconds
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(2, "10 s"),
      analytics: true,
    });

    // Use a constant string to limit all requests with a single ratelimit
    // Or use a userID, apiKey or ip address for individual limits.
    const identifier = user.id;
    const { success } = await ratelimit.limit(identifier);

    if (!success) {
      throw new Error("limit exceeded");
    }

    return new Response(JSON.stringify({ success }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
    });
  }
});
