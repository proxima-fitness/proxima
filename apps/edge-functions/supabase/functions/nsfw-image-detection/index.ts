// SPDX-License-Identifier: AGPL-3.0-only

import { corsHeaders } from '../_shared/cors.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const hf_token = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN_PROD");

const IMAGE_FETCH_TIMEOUT_MS = 15_000;
const IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize) as unknown as number[]);
    }
    return btoa(binary);
}

function jsonResponse(body: unknown, status: number, extra: Record<string, string> = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json", ...corsHeaders, ...extra },
    });
}

serve(async (req) => {
    const requestId = crypto.randomUUID();
    let debug = false;
    const log = (msg: string, data?: Record<string, unknown>) =>
        console.log(`[nsfw-image-detection ${requestId}] ${msg}`, data ?? "");

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        log("Request received", { method: req.method });

        if (req.method !== "POST") {
            log("Method not allowed", { method: req.method });
            return jsonResponse(
                { error: "Method not allowed", code: "METHOD_NOT_ALLOWED", requestId, method: req.method },
                405
            );
        }

        let body: { imageUrl?: string; debug?: string };
        try {
            body = await req.json();
        } catch (parseError) {
            const err = parseError as Error;
            console.error(`[nsfw-image-detection ${requestId}] Invalid JSON body`, {
                message: err?.message,
                name: err?.name,
            });
            return jsonResponse(
                {
                    error: "Invalid request body",
                    code: "INVALID_JSON",
                    requestId,
                    message: err?.message ?? String(parseError),
                },
                400
            );
        }

        debug = body?.debug === "true";
        const hasImageUrl = body != null && "imageUrl" in body && body.imageUrl != null;
        log("Body parsed", { hasImageUrl, imageUrlLength: typeof body?.imageUrl === "string" ? body.imageUrl.length : 0 });

        if (!body?.imageUrl) {
            log("Missing imageUrl");
            return jsonResponse(
                { error: "Image URL missing in request", code: "MISSING_IMAGE_URL", requestId },
                400
            );
        }

        let imageBase64: string;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);
            const imageResponse = await fetch(body.imageUrl, {
                signal: controller.signal,
                headers: { Accept: "image/*" },
            });
            clearTimeout(timeoutId);

            if (!imageResponse.ok) {
                log("Image fetch failed", { status: imageResponse.status, statusText: imageResponse.statusText });
                return jsonResponse(
                    {
                        error: "Failed to fetch image",
                        code: "IMAGE_FETCH_FAILED",
                        requestId,
                        status: imageResponse.status,
                        statusText: imageResponse.statusText,
                    },
                    502
                );
            }

            const contentType = imageResponse.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase();
            if (contentType && !ALLOWED_IMAGE_TYPES.includes(contentType)) {
                log("Image type not allowed", { contentType });
                return jsonResponse(
                    {
                        error: "Image type not allowed",
                        code: "IMAGE_TYPE_NOT_ALLOWED",
                        requestId,
                        contentType: contentType ?? "unknown",
                    },
                    400
                );
            }

            const contentLength = imageResponse.headers.get("Content-Length");
            if (contentLength) {
                const length = parseInt(contentLength, 10);
                if (!Number.isNaN(length) && length > IMAGE_MAX_BYTES) {
                    return jsonResponse(
                        {
                            error: "Image too large",
                            code: "IMAGE_TOO_LARGE",
                            requestId,
                            maxBytes: IMAGE_MAX_BYTES,
                        },
                        400
                    );
                }
            }

            const imageBuffer = await imageResponse.arrayBuffer();
            if (imageBuffer.byteLength > IMAGE_MAX_BYTES) {
                return jsonResponse(
                    {
                        error: "Image too large",
                        code: "IMAGE_TOO_LARGE",
                        requestId,
                        maxBytes: IMAGE_MAX_BYTES,
                    },
                    400
                );
            }

            imageBase64 = arrayBufferToBase64(imageBuffer);
            log("Image fetched and encoded", { bytes: imageBuffer.byteLength, base64Length: imageBase64.length });
        } catch (e) {
            const err = e as Error;
            if (err?.name === "AbortError") {
                log("Image fetch timeout");
                return jsonResponse(
                    { error: "Image fetch timeout", code: "IMAGE_FETCH_TIMEOUT", requestId },
                    504
                );
            }
            console.error(`[nsfw-image-detection ${requestId}] Image fetch error`, {
                message: err?.message,
                name: err?.name,
            });
            return jsonResponse(
                {
                    error: "Failed to fetch image",
                    code: "IMAGE_FETCH_FAILED",
                    requestId,
                    message: err?.message ?? String(e),
                },
                502
            );
        }

        log("Calling Hugging Face NSFW API");

        const payload = JSON.stringify({
            inputs: imageBase64,
        });

        const response = await fetch(
            "https://router.huggingface.co/hf-inference/models/Falconsai/nsfw_image_detection",
            {
                headers: {
                    Authorization: `Bearer ${hf_token}`,
                    "Content-Type": "application/json",
                    ...corsHeaders,
                },
                method: "POST",
                body: payload,
            },
        );

        log("Hugging Face response", { status: response.status, ok: response.ok });

        if (!response.ok) {
            let details: unknown;
            try {
                const text = await response.text();
                try {
                    details = JSON.parse(text);
                } catch {
                    details = { _raw: text.slice(0, 500) };
                }
            } catch (e) {
                details = { _parseError: String(e) };
            }
            console.error(`[nsfw-image-detection ${requestId}] HF API error`, {
                status: response.status,
                statusText: response.statusText,
                details,
            });
            return jsonResponse(
                {
                    error: "Hugging Face API error",
                    code: "HF_API_ERROR",
                    requestId,
                    status: response.status,
                    statusText: response.statusText,
                    details,
                },
                502
            );
        }

        let result: unknown;
        try {
            result = await response.json();
        } catch (e) {
            console.error(`[nsfw-image-detection ${requestId}] Failed to parse HF response as JSON`, {
                message: (e as Error)?.message,
            });
            return jsonResponse(
                {
                    error: "Invalid response from Hugging Face",
                    code: "HF_INVALID_JSON",
                    requestId,
                    message: (e as Error)?.message ?? String(e),
                },
                502
            );
        }

        if (!Array.isArray(result)) {
            console.error(`[nsfw-image-detection ${requestId}] HF result is not array`, { rawResult: result });
            return jsonResponse(
                {
                    error: "Unexpected API result",
                    code: "HF_UNEXPECTED_RESULT",
                    requestId,
                    rawResult: result,
                },
                502
            );
        }

        const nsfw = (result as { label: string; score?: number }[]).find((item) => item.label === "nsfw")?.score;
        log("HF result summary", {
            labels: (result as { label: string }[]).map((r) => r.label),
            scores: (result as { score?: number }[]).map((r) => r.score),
            nsfwScore: nsfw,
        });

        if (nsfw == null || Number.isNaN(Number(nsfw))) {
            console.error(`[nsfw-image-detection ${requestId}] No NSFW score in result`, { rawResult: result });
            return jsonResponse(
                {
                    error: "Unexpected API result",
                    code: "HF_UNEXPECTED_RESULT",
                    requestId,
                    rawResult: result,
                },
                502
            );
        }

        const nsfwScore = Number(nsfw);
        log("Success", { nsfwScore });

        return jsonResponse({ nsfwScore }, 200);
    } catch (error) {
        const err = error as Error;
        console.error(`[nsfw-image-detection ${requestId}] Internal error`, {
            message: err?.message ?? String(error),
            name: err?.name,
            stack: err?.stack,
        });
        const body: Record<string, unknown> = {
            error: "Internal Server Error",
            code: "INTERNAL_ERROR",
            requestId,
            message: err?.message ?? String(error),
            name: err?.name,
        };
        if (debug && err?.stack) body.stack = err.stack;
        return jsonResponse(body, 500);
    }
});
