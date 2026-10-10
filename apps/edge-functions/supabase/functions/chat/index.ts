// SPDX-License-Identifier: AGPL-3.0-only

import { serve } from "https://deno.land/std@0.171.0/http/server.ts";
import OpenAI from "https://deno.land/x/openai@v4.69.0/mod.ts";
import { corsHeaders } from '../_shared/cors.ts';

// import OpenAI from "https://deno.land/x/openai@v4.50.0/mod.ts";
import { codeBlock } from "https://esm.sh/common-tags@1.8.2";

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});


serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { prompt } = await req.json();

  const authorization = req.headers.get("Authorization");

  if (!authorization) {
    return new Response(
      JSON.stringify({
        error: `No authorization header pas
        ed in the request.`,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const inputQuestion = prompt.replace(/\n/g, " ");

  const completionMessages:
    OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: codeBlock`
              You are an AI Fitness Coach. You will get asked questions about someone's fitness and you can use the data they provide to give them tips and explanations of their fitness.`,
      },
      {
        role: "user",
        content: `${inputQuestion}`,
      },
    ];


  const response = await openai.chat.completions.create({
    messages: completionMessages,
    model: "gpt-4o-mini",
    max_tokens: 1000,
    temperature: 0.8,
    stream: true,
  });

  const readableStream = new ReadableStream({
    async start(controller) {
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      for await (const chunk of response.toReadableStream()) {
        const text = decoder.decode(chunk);
        controller.enqueue(encoder.encode(`${text}`));
      }
      controller.close();
    },
  });

  return new Response(readableStream, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
});
