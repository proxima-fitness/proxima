
import { corsHeaders } from '../_shared/cors.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import OpenAI from "https://deno.land/x/openai@v4.69.0/mod.ts";

const client = new OpenAI({
    baseURL: "https://api-inference.huggingface.co/v1/",
    apiKey: Deno.env.get('HUGGING_FACE_ACCESS_TOKEN_PROD'),
});

serve(async (req) => {

    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    try {

        if (req.method !== "POST") {
            return new Response(JSON.stringify({ error: "Method not allowed" }), {
                status: 405,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        }

        const body = await req.json();

        if (!body.imageUrl) {
            return new Response(JSON.stringify({ error: "Image URL missing in request" }), {
                status: 400,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        }

        const chatCompletion = await client.chat.completions.create({
            model: "meta-llama/Llama-3.2-11B-Vision-Instruct",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Do not be verbose !!! Extract all the text from this image and return it all as a large string of content. If there's no text in the image, you must return the words 'no text' only",
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: body.imageUrl,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 500,
        });

        const reply = chatCompletion.choices[0].message.content;

        return new Response(JSON.stringify({ reply }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }
  });
