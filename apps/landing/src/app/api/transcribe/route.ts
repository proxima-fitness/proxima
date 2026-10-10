/**
 * @module transcribe
 *
 * Audio-to-text API route using AI SDK `transcribe`.
 * Accepts multipart/form-data with an `audio` file field and returns
 * `{ text }`. Requires OPENAI_API_KEY in the environment.
 *
 * Used by: useMicTranscription hook (program builder + landing prompt)
 */

import {
  transcribe,
  NoTranscriptGeneratedError,
} from "ai";
import { openai } from "@ai-sdk/openai";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB (Whisper limit)
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("audio");

    if (!(file instanceof Blob)) {
      return Response.json(
        { error: "Missing or invalid `audio` field" },
        { status: 400 },
      );
    }

    if (file.size > MAX_AUDIO_BYTES) {
      return Response.json(
        { error: "Audio file exceeds 25 MB limit" },
        { status: 413 },
      );
    }

    const buffer = new Uint8Array(await file.arrayBuffer());

    const transcript = await transcribe({
      model: openai.transcription("whisper-1"),
      audio: buffer,
      abortSignal: AbortSignal.timeout(30_000),
    });

    return Response.json({ text: transcript.text });
  } catch (error) {
    if (NoTranscriptGeneratedError.isInstance(error)) {
      return Response.json(
        { error: "Could not transcribe audio" },
        { status: 422 },
      );
    }
    console.error("[transcribe] unexpected error:", error);
    return Response.json(
      { error: "Transcription failed" },
      { status: 500 },
    );
  }
}
