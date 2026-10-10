// SPDX-License-Identifier: AGPL-3.0-only

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2';

const hf = new HfInference(Deno.env.get('HUGGING_FACE_ACCESS_TOKEN_DEV'));

serve(async (req) => {
  const { prompt } = await req.json();

  const image = await hf.textToImage(
    {
      inputs: prompt,
      model: 'stabilityai/stable-diffusion-2',
    },
    {
      use_cache: false,
    },
  );

  return new Response(image);
});
