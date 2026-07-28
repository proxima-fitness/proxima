"use client";

/**
 * @module use-mic-transcription
 *
 * Toggle-style mic recording hook: first call starts, second stops and
 * transcribes via POST /api/transcribe. Returns state for button UX.
 *
 * Depends on: MediaRecorder API, /api/transcribe route.
 * Used by: Chat.tsx, PromptTemplate.tsx mic buttons.
 *
 * Very short recordings (immediate stop / cancel) skip the API and return
 * to idle with no toast.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type TMicStatus = "idle" | "recording" | "transcribing";

interface IUseMicTranscriptionOpts {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  /** Max recording duration in ms before auto-stop (default 120 000 = 2 min). */
  maxDurationMs?: number;
}

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

/** Treat as cancel, not a failed transcription. */
const MIN_RECORDING_MS = 500;
const MIN_BLOB_BYTES = 200;

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const mt of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mt)) return mt;
  }
  return "";
}

export function useMicTranscription({
  onTranscript,
  disabled = false,
  maxDurationMs = 120_000,
}: IUseMicTranscriptionOpts) {
  const [status, setStatus] = useState<TMicStatus>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingStartedAtRef = useRef(0);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopTracks();
      clearTimer();
    };
  }, [stopTracks, clearTimer]);

  const transcribe = useCallback(
    async (blob: Blob) => {
      setStatus("transcribing");
      try {
        const form = new FormData();
        form.append("audio", blob, "recording.webm");
        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Transcription failed (${res.status})`);
        }
        const { text } = (await res.json()) as { text: string };
        if (text?.trim()) {
          onTranscript(text.trim());
        } else {
          toast.info("No speech detected - try again.");
        }
      } catch (err) {
        console.error("[mic] transcription error:", err);
        toast.error(
          err instanceof Error ? err.message : "Transcription failed",
        );
      } finally {
        setStatus("idle");
      }
    },
    [onTranscript],
  );

  const stop = useCallback(() => {
    clearTimer();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, [clearTimer]);

  const start = useCallback(async () => {
    const mimeType = pickMimeType();
    if (!mimeType) {
      toast.error("Your browser does not support audio recording.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stopTracks();
        const elapsed = Date.now() - recordingStartedAtRef.current;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        const tooShortToTranscribe =
          elapsed < MIN_RECORDING_MS || blob.size < MIN_BLOB_BYTES;

        if (tooShortToTranscribe || blob.size === 0) {
          setStatus("idle");
          return;
        }
        transcribe(blob);
      };

      recordingStartedAtRef.current = Date.now();
      recorder.start(250);
      setStatus("recording");

      timerRef.current = setTimeout(() => {
        stop();
      }, maxDurationMs);
    } catch (err) {
      stopTracks();
      setStatus("idle");

      if (err instanceof DOMException && err.name === "NotAllowedError") {
        toast.error("Microphone access denied. Check your browser permissions.");
      } else {
        toast.error("Could not start recording.");
        console.error("[mic] start error:", err);
      }
    }
  }, [maxDurationMs, stop, stopTracks, transcribe]);

  const toggle = useCallback(() => {
    if (disabled) return;
    if (status === "recording") {
      stop();
    } else if (status === "idle") {
      start();
    }
  }, [disabled, status, stop, start]);

  return { status, toggle, stop } as const;
}
