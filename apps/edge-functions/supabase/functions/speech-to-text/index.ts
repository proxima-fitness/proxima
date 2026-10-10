
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

import { HfInference } from "https://esm.sh/@huggingface/inference";
const hf = new HfInference(Deno.env.get("HUGGING_FACE_ACCESS_TOKEN_PROD"));

serve(async (req) => {

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
      }

    try {
      // Ensure Content-Type is correct
      const contentType = req.headers.get("Content-Type");
      if (contentType !== "application/json") {
        return new Response("Invalid Content-Type. Expected 'application/json'.", { status: 400, headers: corsHeaders  });
      }

      // Parse the JSON body
      const { base64Audio } = await req.json();
      if (!base64Audio) {
        return new Response("Missing 'base64Audio' in request body.", { status: 400, headers: corsHeaders  });
      }

      // Decode base64 to binary data
      const audioData = Uint8Array.from(atob(base64Audio), (char) => char.charCodeAt(0));

      // Call Hugging Face API
      const result = await hf.automaticSpeechRecognition({
        data: audioData,
        model: "openai/whisper-large-v3",
      });

      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } catch (err) {
      console.error("Error processing request:", err);
      return new Response("An error occurred while processing the request.", { status: 500, ...corsHeaders});
    }
  });


// serve(async (req) => {
//   try {
//     // Ensure Content-Type is correct
//     const contentType = req.headers.get("Content-Type");
//     if (contentType !== "audio/flac") {
//       return new Response("Invalid Content-Type. Expected 'audio/flac'.", { status: 400 });
//     }

//     // Read the raw binary data from the request
//     const audioData = new Uint8Array(await req.arrayBuffer());

//     // Call Hugging Face API
//     const result = await hf.automaticSpeechRecognition({
//       data: audioData,
//       model: "openai/whisper-large-v3",
//     });

//     return new Response(JSON.stringify(result), {
//       headers: { "Content-Type": "application/json" },
//     });
//   } catch (err) {
//     console.error("Error processing request:", err);
//     return new Response("An error occurred while processing the request.", { status: 500 });
//   }
// });

/* To invoke locally:
  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:
*/
