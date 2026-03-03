/**
 * @module api/edge-functions
 *
 * Client-side wrappers for Supabase Edge Functions that power Proxima's AI
 * features. Each function constructs a fetch request to a specific edge-function
 * endpoint, authenticates with the anon key, and returns the parsed response.
 *
 * Capabilities include:
 * - Streaming chat completions (`postChatPrompt`)
 * - Structured text-to-JSON extraction for workout data (`postTextToJson`)
 * - Image-to-text and speech-to-text transcription
 * - NSFW image detection for user-uploaded content
 *
 * Depends on: ./index (supabaseUrl, supabaseKey)
 * Used by: program-builder Agent/Chat, image upload flows, moderation pipeline
 */
import { supabaseKey, supabaseUrl } from ".";
// import { emptyHevyRoutineProgram } from "@/assets/constants";
// import { aiRequest, buildPrompt } from "@/components/program-builder/utils";
// import { toast } from "sonner";

interface ITextToJsonRequestPayload {
    query: string;
    schemaType: string;
}

interface IImageToTextRequestPayload {
    imageUrl: string;
}

interface ISpeechToTextRequestPayload {
    base64Audio: string;
}

interface IChatRequestPayload {
    prompt: string;
}

const text_to_json = "/functions/v1/text-to-json";
const image_to_text =  "/functions/v1/image-to-text";
const speech_to_text = "/functions/v1/speech-to-text";
const chat = "/functions/v1/chat";
const nsfw_image_detection = "/functions/v1/nsfw-image-detection";

/**
 * Sends a prompt to the `chat` edge function and streams the response
 * chunk-by-chunk via a callback.
 *
 * Uses the ReadableStream API so callers can render tokens incrementally
 * (e.g. in the program-builder chat UI).
 *
 * @param prompt - The user/system prompt to send
 * @param onChunk - Callback invoked with each decoded text chunk as it arrives
 */
export const postChatPrompt = async (prompt: string, onChunk: (chunk: string) => void ): Promise<void> => {

    const url = supabaseUrl + chat;
    const payload: IChatRequestPayload = { prompt };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error('Network response was not ok');
            return;
        }

        if (!response.body) {
            console.error('Response body is null.');
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");


        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }

            const chunk = decoder.decode(value, { stream: true });
            onChunk(chunk);
        }
    } catch (error) {
        console.error('Error posting data:', error);
    }
};

/**
 * Calls the `text-to-json` edge function to convert natural-language text into
 * a structured JSON object conforming to a given schema.
 *
 * Used during program building to parse user descriptions into workout_history,
 * save_workout_schema, or program_details_schema structures.
 *
 * @param query - The natural-language input text
 * @param schemaType - Which JSON schema the edge function should target
 * @returns `{ success, data }` on success or `{ success: false, error }` on failure
 */
export const postTextToJson = async (query: string, schemaType: TTextToJsonSchema) => {

    const url = supabaseUrl + text_to_json;
    const payload: ITextToJsonRequestPayload = { query, schemaType };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ supabaseKey }`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error('Network response was not ok');
            return { success: false, error: `Server error: ${response.statusText}` };
        }

        const json = await response.json();
        return { success: true, data: json["reply" ] };

    } catch (error) {
        console.error('Error posting data:', error);
        return { success: false, error: error || "unknown error" };
    }
};


/**
 * Sends an image URL to the `image-to-text` edge function for OCR / description.
 *
 * @param imageUrl - Publicly accessible URL of the image to analyze
 * @returns The extracted text/description string, or undefined on error
 */
export const postImageToText = async (imageUrl: string) => {

    const url = supabaseUrl + image_to_text;
    const payload: IImageToTextRequestPayload = { imageUrl };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ supabaseKey }`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error('Network response was not ok');
        }

      const data = await response.json();
      return data["reply"];
    } catch (error) {
        console.error('Error posting data:', error);
    }
};

/**
 * Sends base64-encoded audio to the `speech-to-text` edge function for
 * transcription.
 *
 * @param base64Audio - The audio data encoded as a base64 string
 * @returns The transcribed text string, or undefined on error
 */
export const postSpeechToText = async (base64Audio: string) => {

    const url = supabaseUrl + speech_to_text;
    const payload: ISpeechToTextRequestPayload = { base64Audio };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ supabaseKey }`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error('Network response was not ok');
        }

      const data = await response.json();
      return data["text"];
    } catch (error) {
        console.error('Error posting data:', error);
    }
};

/**
 * Sends an image URL to the `nsfw-image-detection` edge function for
 * content-safety classification.
 *
 * @param imageUrl - Publicly accessible URL of the image to check
 * @returns Classification result object from the edge function, or undefined on error
 */
export const postNsfwImageDetection = async (imageUrl: string) => {

    const url = supabaseUrl + nsfw_image_detection;
    const payload: IImageToTextRequestPayload = { imageUrl };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ supabaseKey }`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error('Network response was not ok');
        }

      const data = await response.json();
      return data;

    } catch (error) {
        console.error('Error posting data:', error);
    }
};


// export const buildAiProgram = async (request: TTextToJsonRequest) => {

//     try {

//         if (request.empty === "true") {
//             return emptyHevyRoutineProgram;
//         }

//         const promptBase = buildPrompt(
//             request.search,
//             request.sex,
//             request.age,
//             request.activityLevel,
//             request.goals,
//             request.specialization,
//             request.equipment,
//             request.focusAreas,
//             request.difficultyLevel,
//             request.excludeAreas,
//             request.workoutDuration,
//             // request.excludeEquipment,
//             request.excludeSpecializations,
//             request.healthIssues,
//         );

//         const numberOfDaysPerWeek = Number(request.daysPerWeek);
//         const response = await aiRequest(numberOfDaysPerWeek, promptBase);

//         if (response !== undefined) {
//             const parsedResponse = JSON.parse(response);
//             toast.success("Proxima AI Routines Generated. Building Program Structure...");

//             const program = await buildHevyProgram(parsedResponse, Number(request.programLength), Number(request.daysPerWeek), request.excludeAreas, request.excludeEquipment, request.healthIssues);
//             return program;
//         }

//         if (response === undefined) {
//             toast.warning("Some AI requests failed. Fallback workouts have been added in their place.");
//             console.error("Error, response was undefined when generating routines");
//             return await buildHevyFallbackProgram(Number(request.programLength), numberOfDaysPerWeek);


//         }

//     } catch (error: unknown) {
//         toast.warning("Some AI requests failed. Fallback workouts have been added in their place.");
//         console.error("Error generating routines", error);
//         return await buildHevyFallbackProgram(Number(request.programLength), Number(request.daysPerWeek));
//     }
// };
