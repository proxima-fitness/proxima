import { aiRequest, buildFallbackProgram, buildProgram, buildPrompt } from "@/utils/program-builder";
import { supabaseKey, supabaseUrl } from ".";
import { emptyHevyRoutineProgram } from "@/assets/constants";
import { toast } from "sonner";

interface TextToJsonRequestPayload {
    query: string;
    schemaType: string;
}

interface ImageToTextRequestPayload {
    imageUrl: string;
}

interface SpeechToTextRequestPayload {
    base64Audio: string;
}

interface ChatRequestPayload {
    prompt: string;
}

const text_to_json = "/functions/v1/text-to-json";
const image_to_text =  "/functions/v1/image-to-text";
const speech_to_text = "/functions/v1/speech-to-text";
const chat = "/functions/v1/chat";
const nsfw_image_detection = "/functions/v1/nsfw-image-detection";

// Takes in a Prompt and returns a Stream Chat Response
export const postChatPrompt = async (prompt: string, onChunk: (chunk: string) => void ): Promise<void> => {

    const url = supabaseUrl + chat;
    const payload: ChatRequestPayload = { prompt };

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

        // eslint-disable-next-line no-constant-condition
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

// Text to JSON Edge function, can create workout_history, save_workout_schema, program_details_schema
export const postTextToJson = async (query: string, schemaType: TTextToJsonSchema) => {

    const url = supabaseUrl + text_to_json;
    const payload: TextToJsonRequestPayload = { query, schemaType };

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


// Image to Text Edge function
export const postImageToText = async (imageUrl: string) => {

    const url = supabaseUrl + image_to_text;
    const payload: ImageToTextRequestPayload = { imageUrl };

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
            throw new Error('Network response was not ok');
        }

      const data = await response.json();
      return data["reply"];
    } catch (error) {
        console.error('Error posting data:', error);
    }
};

// Speech to Text Edge function,
export const postSpeechToText = async (base64Audio: string) => {

    const url = supabaseUrl + speech_to_text;
    const payload: SpeechToTextRequestPayload = { base64Audio };

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
            throw new Error('Network response was not ok');
        }

      const data = await response.json();
      return data["text"];
    } catch (error) {
        console.error('Error posting data:', error);
    }
};

// NSFW Image Detection
export const postNsfwImageDetection = async (imageUrl: string) => {

    const url = supabaseUrl + nsfw_image_detection;
    const payload: ImageToTextRequestPayload = { imageUrl };

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
            throw new Error('Network response was not ok');
        }

      const data = await response.json();
      return data;

    } catch (error) {
        console.error('Error posting data:', error);
    }
};


export const buildAiProgram = async (request: TTextToJsonRequest, isHevy: boolean) => {

    console.log("isHevy",isHevy);

    if (request.empty === "true") {
        return emptyHevyRoutineProgram;
    }

    const promptBase = buildPrompt(
        request.search,
        request.sex,
        request.age,
        request.activityLevel,
        request.goals,
        request.specialization,
        request.equipment,
        request.focusAreas,
        request.difficultyLevel,
        request.excludeAreas,
        request.excludeEquipment,
        request.excludeSpecializations,
        request.healthIssues,
    );

    const numberOfDaysPerWeek = Number(request.daysPerWeek);
    const response = await aiRequest(numberOfDaysPerWeek, promptBase);

    if (response !== undefined) {
        const parsedResponse = JSON.parse(response);

        const program = await buildProgram(parsedResponse, Number(request.programLength), Number(request.daysPerWeek));
        return program;
    }

    if (response === undefined) {
        toast.warning("Some AI requests failed. Fallback workouts have been added in their place.");
        return await buildFallbackProgram(Number(request.programLength), numberOfDaysPerWeek);
    }

    toast.error("Unable to generate a routine.");
    return emptyHevyRoutineProgram;
};
