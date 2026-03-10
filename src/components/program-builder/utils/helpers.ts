/**
 * @module helpers
 *
 * General-purpose utilities for the program builder feature. Responsibilities:
 *
 * 1. **NLP inference** – Extracts structured parameters (days-per-week, program
 *    length) from free-text user messages using regex heuristics with an NLP
 *    fallback (compromise.js).
 * 2. **Message classification** – Determines whether a chat message is
 *    "about the program" (fuzzy-matched via Fuse.js) to decide if the current
 *    Hevy program should be sent as tool context.
 * 3. **Schema conversion** – Converts between the Proxima schedule format
 *    (TScheduleWorkouts) and the Hevy routine format (THevyRoutine), including
 *    set generation with support for reps, ranges, time, RPE, and AMRAP.
 * 4. **JSON Patch helpers** – Human-readable description of patch operations
 *    and safe application of AI-generated patches to the live program state
 *    with undo support (via fast-json-patch).
 *
 * Depends on: compromise (NLP), fuse.js (fuzzy), fast-json-patch, sonner (toasts), ai (UIMessage)
 * Used by: Agent chat (Chat.tsx), ProgramEditor, useChat hooks
 */

import { UIMessage } from "ai";
import nlp from "compromise";
import { applyPatch, compare, validate as validatePatch, type Operation } from "fast-json-patch";
import Fuse from "fuse.js";
import { toast } from "sonner";
import type { IOption } from "@/components/ui/multi-select";



/**
 * Returns the highest folder_id across all routines, which corresponds to the
 * last week index in the program. Returns 0 for an empty array.
 *
 * @param routines - Flat array of Hevy routines
 * @returns Maximum folder_id value (0-indexed week number)
 */
export const getMaxFolderId = (routines: THevyRoutine[]): number => {

    if (routines.length === 0) return 0;

    return routines.reduce((max, routine) => {
        return routine.folder_id > max ? routine.folder_id : max;
        }, routines[0].folder_id);
};

/**
 * Builds empty THevyRoutine[] with one routine per week/day; folder_id = week index, order = day. Used to initialize program before buildRoutine fills it.
 */
export const generateEmptyHevyProgram = (weeksValue: string, daysValue: string): THevyRoutine[] => {
    const weeks = weeksValue ? Number(weeksValue) : 0;
    const days = daysValue ? Number(daysValue) : 0;

    if (!weeks || !days || weeks <= 0 || days <= 0) {
        return [];
    }

    const now = new Date().toISOString();
    const routines: THevyRoutine[] = [];
    let routineIndex = 0;

    for (let weekIndex = 0; weekIndex < weeks; weekIndex++) {
        for (let dayIndex = 1; dayIndex <= days; dayIndex++) {
            routines.push({
                id: String(routineIndex + 1),
                title: "",
                folder_id: weekIndex,
                order: String(dayIndex),
                exercises: [],
                notes: "",
                created_at: now,
                updated_at: now,
            });
            routineIndex++;
        }
    }

    return routines;
};

/**
 * Attempts to extract the number of training days per week (1–7) from
 * free-text user input. Uses a cascade of regex patterns for common phrasings
 * (e.g. "3x/week", "every day", "couple times") and falls back to compromise
 * NLP tokenization when regexes fail.
 *
 * @param text - Raw user message text
 * @returns String representation of days-per-week ("1"–"7"), or "" if not found
 */
export const inferDaysPerWeek = (text: string) => {
    if (!text) return "";
    // Normalize various hyphen/dash characters to ASCII hyphen
    const normalized = text.toLowerCase().replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-');

    // Hardcoded common expressions
    if (/every\s+day/.test(normalized)) return "7";
    if (/every\s+other\s+day/.test(normalized))  return "3";
    if (/weekends\s+only/.test(normalized)) return "2";
    if (/couple\s+(times|days)/.test(normalized)) return "2";
    if (/(few|several)\s+(days|times)/.test(normalized)) return "3";
    if (/once\s+(a|per)?\s*week/.test(normalized)) return "1";

    // Pattern: 3x/week, 4x/wk, 5x per week
    const xPerWeekMatch = normalized.match(/(\d)\s*x\s*(\/|\s*(a|per)\s*)?(week|wk)/);
    if (xPerWeekMatch) {
        const num = parseInt(xPerWeekMatch[1], 10);
        if (!isNaN(num) && num >= 1 && num <= 7) {
            return num.toString();
        }
    }

    // Other direct patterns
    const directMatch = normalized.match(/(\d)\s*(x|\*)?\s*(day(s)?|times)?\s*(a|per)?\s*(week|program)?/);
    if (directMatch) {
        const num = parseInt(directMatch[1], 10);
        if (!isNaN(num) && num >= 1 && num <= 7) {
            return num.toString();
        }
    }

    // Pattern like "program should be 5 days" or "build a 4 day program"
    const programMatch = normalized.match(/(?:build|program|train|should be)\s*(a\s*)?(\d)\s*(day|times)?/);
    if (programMatch) {
        const num = parseInt(programMatch[2], 10);
        if (!isNaN(num) && num >= 1 && num <= 7) {
            return num.toString();
        }
    }

    // NLP fallback
    const doc = nlp(text);
    const json = doc.json();

    for (const sentence of json) {
        for (const term of sentence.terms) {
            if (term.tags.includes("Value")) {
                const val = term.number || parseInt(term.normal, 10);
                if (!isNaN(val) && val >= 1 && val <= 7) {
                    const termIndex = sentence.terms.indexOf(term);
                    const nextFew = sentence.terms.slice(termIndex, termIndex + 4).map((t: { normal: string; }) => t.normal).join(" ");
                    if (/(day|days|times).*(week|program)?/.test(nextFew)) {
                        return val.toString();
                    }
                }
            }
        }
    }

    return "";
};

/**
 * Attempts to extract the program length in weeks (1–52) from free-text user
 * input. Uses regex patterns for phrasings like "12 weeks", "8-week program",
 * "for 6 weeks", and falls back to compromise NLP when regexes fail.
 *
 * @param text - Raw user message text
 * @returns String representation of weeks ("1"–"52"), or "" if not found
 */
export const inferProgramLength = (text: string) => {
    if (!text) return "";
    // Normalize various hyphen/dash characters to ASCII hyphen
    const normalized = text.toLowerCase().replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-');

    // Pattern: "12 weeks", "8 week program", "6-week", "for 10 weeks"
    const weeksMatch = normalized.match(/(\d+)\s*[-]?\s*week(s)?/);
    if (weeksMatch) {
        const num = parseInt(weeksMatch[1], 10);
        if (!isNaN(num) && num >= 1 && num <= 52) {
            return num.toString();
        }
    }

    // Pattern: "12 week program", "8 week training", "program for 6 weeks"
    const programWeeksMatch = normalized.match(/(?:program|training|plan|routine)\s*(?:for|of|with)?\s*(\d+)\s*week(s)?/);
    if (programWeeksMatch) {
        const num = parseInt(programWeeksMatch[1], 10);
        if (!isNaN(num) && num >= 1 && num <= 52) {
            return num.toString();
        }
    }

    // Pattern: "build a 12 week", "create 8 week", "make a 6 week"
    const buildWeeksMatch = normalized.match(/(?:build|create|make|generate)\s*(?:a|an)?\s*(\d+)\s*week/);
    if (buildWeeksMatch) {
        const num = parseInt(buildWeeksMatch[1], 10);
        if (!isNaN(num) && num >= 1 && num <= 52) {
            return num.toString();
        }
    }

    // Pattern: "for 12 weeks", "over 8 weeks", "during 6 weeks"
    const forWeeksMatch = normalized.match(/(?:for|over|during|in)\s*(\d+)\s*week(s)?/);
    if (forWeeksMatch) {
        const num = parseInt(forWeeksMatch[1], 10);
        if (!isNaN(num) && num >= 1 && num <= 52) {
            return num.toString();
        }
    }

    // NLP fallback
    const doc = nlp(text);
    const json = doc.json();

    for (const sentence of json) {
        for (const term of sentence.terms) {
            if (term.tags.includes("Value")) {
                const val = term.number || parseInt(term.normal, 10);
                if (!isNaN(val) && val >= 1 && val <= 52) {
                    const termIndex = sentence.terms.indexOf(term);
                    const nextFew = sentence.terms.slice(termIndex, termIndex + 4).map((t: { normal: string; }) => t.normal).join(" ");
                    if (/week(s)?/.test(nextFew)) {
                        return val.toString();
                    }
                }
            }
        }
    }

    return "";
};

/**
 * Returns options whose label or value appears in the normalized text (substring match).
 * Used internally by infer functions that need to match options to free text.
 */
function matchOptionsInText(text: string, options: IOption[]): IOption[] {
    if (!text || !options.length) return [];
    const normalized = text.toLowerCase().replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, "-");
    return options.filter((opt) => {
        const label = (opt.label ?? "").toLowerCase();
        const value = (opt.value ?? "").toLowerCase();
        return (label && normalized.includes(label)) || (value && normalized.includes(value));
    });
}

/**
 * Attempts to extract body areas to exclude from free-text user input (e.g. "exclude shoulders",
 * "no legs", "avoid lower back"). Looks for exclusion phrases followed by body-part names that
 * match the given options (e.g. focusAreasOptions).
 *
 * @param text - Raw user message text
 * @param options - Body-part options (same set as focus areas: back, arms, shoulders, etc.)
 * @returns Matching IOption[] for areas to exclude
 */
export function inferExcludeAreas(text: string, options: IOption[]): IOption[] {
    if (!text || !options.length) return [];
    const normalized = text.toLowerCase().replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, "-");
    const exclusionRegex = /(?:exclude|no|avoid|skip|without|don't\s+train)\s+/gi;
    const parts = normalized.split(exclusionRegex);
    parts.shift(); // drop segment before first keyword
    const matched = new Map<string, IOption>();
    for (const part of parts) {
        const segment = part.replace(/\s*(?:,|and|&)\s*/g, " ").trim();
        for (const opt of options) {
            const label = (opt.label ?? "").toLowerCase();
            const value = (opt.value ?? "").toLowerCase();
            const re = new RegExp(`\\b${escapeRegexForWord(value)}\\b|\\b${escapeRegexForWord(label)}\\b`);
            if (re.test(segment) && !matched.has(opt.value)) {
                matched.set(opt.value, opt);
            }
        }
    }
    return Array.from(matched.values());
}

/**
 * Attempts to extract equipment to exclude from free-text user input (e.g. "no dumbbells",
 * "without machines", "bodyweight only"). Uses the same split-by-exclusion-keyword approach
 * as inferExcludeAreas, then matches remaining text to equipment options.
 *
 * @param text - Raw user message text
 * @param options - Equipment options (e.g. equipmentOptions or exclude-equipment subset)
 * @returns Matching IOption[] for equipment to exclude
 */
export function inferExcludeEquipment(text: string, options: IOption[]): IOption[] {
    if (!text || !options.length) return [];
    const normalized = text.toLowerCase().replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, "-");
    if (/bodyweight\s+only|no\s+equipment|only\s+bodyweight/.test(normalized)) {
        return options.filter((opt) => (opt.value ?? "").toLowerCase() !== "bodyweight");
    }
    const exclusionRegex = /(?:no|without|don't\s+use|exclude)\s+/gi;
    const parts = normalized.split(exclusionRegex);
    parts.shift();
    const matched = new Map<string, IOption>();
    for (const part of parts) {
        const segment = part.replace(/\s*(?:,|and|&)\s*/g, " ").trim();
        for (const opt of options) {
            const label = (opt.label ?? "").toLowerCase();
            const value = (opt.value ?? "").toLowerCase();
            const re = new RegExp(`\\b${escapeRegexForWord(value)}\\b|\\b${escapeRegexForWord(label)}\\b`);
            if (re.test(segment) && !matched.has(opt.value)) {
                matched.set(opt.value, opt);
            }
        }
    }
    return Array.from(matched.values());
}

/** Escapes a string for use inside a RegExp word-boundary pattern (handles spaces in multi-word values). */
function escapeRegexForWord(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
}

/** Phrase synonyms that map user wording to healthIssuesOptions values. */
const HEALTH_ISSUE_SYNONYMS: Array<{ pattern: RegExp; value: string }> = [
    { pattern: /(?:bad|lower|hurt|injured|pain)\s+back|back\s+(?:pain|issue|problem)|hernia/gi, value: "back or hernia" },
    { pattern: /(?:can't|cannot)\s+jump|no\s+jump/gi, value: "cannot jump" },
    { pattern: /post[- ]?covid|covid\s+recovery/gi, value: "post-covid recovery" },
    { pattern: /(?:arm|shoulder)s?\s+(?:and|&|or)\s+(?:arm|shoulder)|arms\s+and\s+shoulders/gi, value: "arms and shoulders" },
    { pattern: /hip\s+(?:joint|problem|issue|pain)/gi, value: "hip joints" },
    { pattern: /knee\s+(?:injur|problem|issue|pain)/gi, value: "knee injuries" },
];

/**
 * Attempts to extract health issues from free-text user input (e.g. "bad back", "knee issues",
 * "can't jump", "post covid"). Uses a generic matcher plus phrase synonyms that map to
 * healthIssuesOptions values.
 *
 * @param text - Raw user message text
 * @param options - Health issue options (healthIssuesOptions)
 * @returns Matching IOption[] for health issues to consider
 */
export function inferHealthIssues(text: string, options: IOption[]): IOption[] {
    if (!text || !options.length) return [];
    const normalized = text.toLowerCase().replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, "-");
    const matched = new Map<string, IOption>();
    const valueToOption = new Map(options.map((o) => [(o.value ?? "").toLowerCase(), o]));
    for (const { pattern, value } of HEALTH_ISSUE_SYNONYMS) {
        if (pattern.test(normalized)) {
            const opt = valueToOption.get(value);
            if (opt && !matched.has(opt.value)) matched.set(opt.value, opt);
        }
    }
    const fromGeneric = matchOptionsInText(normalized, options);
    for (const opt of fromGeneric) {
        if (!matched.has(opt.value)) matched.set(opt.value, opt);
    }
    return Array.from(matched.values());
}

/**
 * Safely extracts and normalizes text from a chat message payload.
 * Returns empty string if the message has no string `text` property.
 *
 * @param message - Arbitrary message payload (expected shape: `{ text: string }`)
 * @returns Trimmed, lowercased text content, or "" if extraction fails
 */
export function getTextFromChatMessage(message: unknown): string {
    if (message == null || typeof message !== "object" || !("text" in message)) return "";
    const t = (message as { text: unknown }).text;
    return typeof t === "string" ? t.trim().toLowerCase() : "";
}

/**
 * Returns trimmed text from a message, supporting both top-level `text` and `parts[].text` (UIMessage shape).
 * Use for prompt/title extraction where original casing is desired.
 */
export function getMessageText(message: unknown): string {
    if (message == null || typeof message !== "object") return "";
    const m = message as { text?: string; parts?: { text?: string }[] };
    if (typeof m.text === "string") return m.text.trim();
    if (Array.isArray(m.parts)) {
        return m.parts
            .map((p) => (typeof p?.text === "string" ? p.text : ""))
            .join(" ")
            .trim();
    }
    return "";
}

/** Short acknowledgements that should NOT be classified as program-related. */
const SHORT_ACKS = ["cool", "thanks", "thank you", "ok", "okay", "sure", "nice", "great", "got it", "sounds good"];
/** Verb stems that signal the user wants to act on the program. */
const PROGRAM_VERB_NORMALS = new Set(["build", "create", "modify", "change", "generate", "explain"]);
/** Nouns that indicate program-related discussion. */
const PROGRAM_NOUN_LOOKUP = ["program", "workout", "routine", "exercise", "exercises"];
const DAY_1_TO_7_REGEX = /\bday\s*[1-7]\b/;

const RETRY_PHRASES = ["try again", "retry", "try once more", "try one more time", "do it again", "start over", "run it again"];
const ANGRY_PHRASES = ["doesn't work", "not working", "does not work"];
const ANGRY_WORDS = ["angry", "frustrated", "mad", "terrible", "awful", "hate", "useless", "wrong", "broken", "frustrating", "annoying", "ridiculous", "stupid", "worst", "waste", "fail", "failed"];
const SWEAR_WORDS = ["damn", "dammit", "crap", "hell", "sucks", "bs", "bullshit", "screw", "screwed", "freaking", "fricking", "bloody", "bollocks", "fucking", "fuck"];

const FUZZY_WORD_THRESHOLD = 0.45;
const FUZZY_PHRASE_THRESHOLD = 0.5;

/**
 * Returns true if any token fuzzy-matches any word in the list (via Fuse.js).
 *
 * @param tokens - Lowercased tokens from the user's message
 * @param list - Vocabulary list to match against
 * @param threshold - Fuse.js distance threshold (0 = exact, 1 = anything)
 * @returns Whether at least one token matches at least one list entry
 */
function anyTokenMatchesList(tokens: string[], list: string[], threshold: number): boolean {
    if (list.length === 0 || tokens.length === 0) return false;
    const fuse = new Fuse(list.map((w) => ({ w })), { keys: ["w"], threshold, includeScore: false });
    return tokens.some((token) => fuse.search(token).length > 0);
}

/**
 * Returns true if the full normalized string fuzzy-matches any phrase in the list.
 *
 * @param normalized - The entire lowercased, trimmed user message
 * @param phrases - Multi-word phrases to match against (e.g. "try again")
 * @param threshold - Fuse.js distance threshold
 * @returns Whether the message as a whole matches any phrase
 */
function fuzzyMatchesPhrase(normalized: string, phrases: string[], threshold: number): boolean {
    if (phrases.length === 0 || !normalized) return false;
    const fuse = new Fuse(phrases.map((p) => ({ p })), { keys: ["p"], threshold, includeScore: false });
    return fuse.search(normalized).length > 0;
}

/**
 * Extracts lowercase tokens from a compromise NLP document, falling back to
 * whitespace split when the NLP pipeline yields no terms.
 *
 * @param doc - A compromise document instance
 * @returns Array of lowercased token strings
 */
function getTokensFromDoc(doc: ReturnType<typeof nlp>): string[] {
    const tokens: string[] = [];
    const json = doc.json();
    for (const chunk of json) {
        for (const term of chunk.terms || []) {
            const norm = (term as { normal?: string }).normal;
            if (typeof norm === "string" && norm.trim()) tokens.push(norm.toLowerCase());
        }
    }
    return tokens.length > 0 ? tokens : (doc.text() || "").toLowerCase().split(/\s+/).filter(Boolean);
}

const PROGRAM_VERB_LIST = Array.from(PROGRAM_VERB_NORMALS);

/**
 * Returns true when the message text clearly indicates the user is talking about
 * the program (building, modifying, or asking about it), or when the user says
 * something like "try again" or "retry", or when the message contains angry or
 * frustrated language (including common swear words). Uses compromise for tokenization/NLP
 * and Fuse.js for spelling-tolerant (fuzzy) matching on all list-based checks.
 * Default false when uncertain to avoid sending hevyProgram unnecessarily.
 */
export function isMessageAboutProgram(text: string): boolean {
    const normalized = (text || "").trim().toLowerCase().replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, "-");
    if (!normalized) return false;

    if (normalized.length < 20 && SHORT_ACKS.some((ack) => normalized === ack || normalized.startsWith(ack + " ") || normalized.endsWith(" " + ack))) {
        return false;
    }

    const doc = nlp(normalized);
    const tokens = getTokensFromDoc(doc);

    if (fuzzyMatchesPhrase(normalized, RETRY_PHRASES, FUZZY_PHRASE_THRESHOLD)) return true;
    if (fuzzyMatchesPhrase(normalized, ANGRY_PHRASES, FUZZY_PHRASE_THRESHOLD)) return true;
    if (anyTokenMatchesList(tokens, ANGRY_WORDS, FUZZY_WORD_THRESHOLD)) return true;
    if (anyTokenMatchesList(tokens, SWEAR_WORDS, FUZZY_WORD_THRESHOLD)) return true;
    if (anyTokenMatchesList(tokens, PROGRAM_NOUN_LOOKUP, FUZZY_WORD_THRESHOLD)) return true;
    if (anyTokenMatchesList(tokens, PROGRAM_VERB_LIST, FUZZY_WORD_THRESHOLD)) return true;
    if (DAY_1_TO_7_REGEX.test(normalized)) return true;

    if (doc.sentences().isQuestion().found) {
        if (anyTokenMatchesList(tokens, PROGRAM_NOUN_LOOKUP, FUZZY_WORD_THRESHOLD) || DAY_1_TO_7_REGEX.test(normalized)) return true;
        if (normalized.length < 50 && anyTokenMatchesList(tokens, ["explain", "what", "how"], FUZZY_WORD_THRESHOLD)) return true;
    }

    return false;
}

/**
 * Converts Proxima schedule workouts into Hevy routine format.
 *
 * Takes a 2D array of schedule workouts (organized by week and day) and converts
 * them into Hevy routines. Each workout day becomes a separate routine, with
 * exercises mapped to Hevy exercise templates. Routines are organized by week
 * using folder IDs.
 *
 * @param scheduleWorkouts - A 2D array where each inner array represents a week,
 *                           and each element in the week represents a workout day
 * @returns A promise that resolves to an array of Hevy routines, where each routine
 *          represents a workout day with its exercises, sets, and metadata
 */
export const convertToHevyRoutine = async (scheduleWorkouts: TScheduleWorkouts[][]): Promise<THevyRoutine[]> => {

    const routines = await Promise.all(
        scheduleWorkouts.flatMap((week, weekIndex) =>
            week.map(async (day, dayIndex) => {

                const exercises = await Promise.all(
                    day.program_workout_exercises.map(async (exercise, exIndex) => ({
                        index: exIndex,
                        title: exercise.hevy_exercise_templates?.title || "Unknown Exercise",
                        notes: "",
                        rest_seconds: null,
                        exercise_template_id: exercise.hevy_exercise_templates?.id || "",
                        supersets_id: null,
                        sets: generateHevySets(exercise),
                    })),
                );

                return {
                    id: "",
                    title: day.day_title ? `${dayIndex + 1} - ${day.day_title}` : `Day ${dayIndex + 1}`,
                    folder_id: weekIndex, // Assign week number as folder ID
                    updated_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    notes: "",
                    exercises,
                    order: String(dayIndex + 1), // 1-indexed day order
                };
            }),
        ),
    );

    for(let i = 0; i < routines.length; i++) {
        routines[i].id = String(i + 1);
    }

    return routines;
};

/**
 * Generates Hevy sets from a Proxima saved workout exercise.
 *
 * Converts Proxima exercise data (reps, weights, time, RPE, etc.) into Hevy set format.
 * Handles various Proxima data formats including single values, ranges, and arrays.
 * The number of sets is determined by the maximum length of any exercise property array.
 *
 * @param exercise - The Proxima saved workout exercise containing sets data
 * @returns An array of Hevy sets with weight, reps, duration, RPE, and other metrics
 */
export const generateHevySets = (exercise: TSavedWorkoutExercise): THevySets[] => {
    const sets: THevySets[] = [];
    const maxSets = Math.max(
        exercise?.reps?.length || 0,
        exercise?.weights?.length || 0,
        exercise?.time_taken?.length || 0,
        exercise?.reps_range?.length || 0,
        exercise?.reps_max?.length || 0,
        exercise?.amrap?.length || 0,
        exercise?.percent_rm?.length || 0,
        exercise?.rpe?.length || 0,
        exercise?.rpe_range?.length || 0,
        exercise?.time_range?.length || 0,
    );

    for (let i = 0; i < maxSets; i++) {
        sets.push({
            index: i,
            type: "normal", // Assuming all sets are normal
            weight_kg: exercise.weights?.[i] || 0,
            reps: exercise?.reps ? exercise.reps?.[i] || 0 : exercise?.reps_range && exercise?.reps_range?.[i]?.[1] || 0,
            distance_meters: 0, // No distance tracking by default
            duration_seconds: exercise?.time_taken ? exercise.time_taken?.[i] || 0 : exercise?.time_range && exercise.time_range?.[i]?.[1] || 0,
            rpe: exercise?.rpe ? (exercise.rpe[i] ?? null) : (exercise?.rpe_range?.[i]?.[1] ?? null),
            custom_metric: 0, // Placeholder for custom metric
        });
    }

    return sets;
};

/** Shape of the AI modifyProgram tool's JSON output (patch array or error). */
interface IModifyProgramOutput {
    patch?: Array<{ op: string; path: string; value?: unknown; from?: string }>;
    error?: string;
    message?: string;
}

/** Patch operation shape for describePatchOperation */
export type PatchOperationForDescribe = { op: string; path: string; value?: unknown; from?: string };

/**
 * Formats a patch operation value for display in human-readable change summaries.
 *
 * @param value - The JSON Patch operation value (any type)
 * @returns A quoted string for strings, stringified primitives, or JSON for objects
 */
function formatOpValue(value: unknown): string {
    if (value === undefined || value === null) return "";
    if (typeof value === "string") return `'${value}'`;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

/**
 * Builds a human-readable sentence for a simple field-level patch operation.
 *
 * @param opType - JSON Patch verb ("replace", "add", "remove", etc.)
 * @param fieldName - The field being changed (e.g. "title", "notes")
 * @param value - Pre-formatted display string for the new value
 * @returns Human-friendly description like "Set title to 'Push Day'"
 */
function formatSimpleFieldOp(opType: string, fieldName: string, value: string): string {
    if (opType === "replace") return `Set ${fieldName} to ${value}`;
    if (opType === "add") return `Add ${fieldName} ${value}`;
    return `${opType} ${fieldName}`;
}

/**
 * Parses a JSON Patch path segment as a 1-based display index, or "?" if not numeric.
 *
 * @param seg - A single path segment from a JSON Patch path (e.g. "0", "exercises")
 * @returns 1-based numeric index for display, or "?" when the segment isn't a number
 */
function parseSegmentNum(seg: string): number | "?" {
    const n = parseInt(seg, 10);
    return Number.isNaN(n) ? "?" : n + 1;
}

/** Configuration for rendering set-level property changes in human-readable form. */
type SetPropConfig =
    | { label: string; suffix?: string; fallback: string }
    | { replaceText: string; fallback: string };

/** Maps THevySets property names to display labels and units for change descriptions. */
const SET_PROP_DESCRIPTIONS: Record<string, SetPropConfig> = {
    reps: { label: "reps", fallback: "reps" },
    weight: { label: "weight", fallback: "weight" },
    weight_kg: { label: "weight", suffix: " kg", fallback: "weight" },
    duration: { label: "duration", fallback: "duration" },
    duration_seconds: { label: "duration", suffix: " s", fallback: "duration" },
    rpe: { label: "RPE", fallback: "RPE" },
    type: { label: "type", fallback: "set type" },
    distance_meters: { label: "distance", suffix: " m", fallback: "distance" },
    custom_metric: { label: "custom metric", fallback: "custom metric" },
    index: { replaceText: "Updated", fallback: "set index" },
};

/**
 * Returns the value at a JSON Pointer path (RFC 6901) in the document.
 * Used to read the "old" value when describing a replace operation.
 *
 * @param doc - Root document (e.g. THevyRoutine[] for program)
 * @param path - JSON Pointer string (e.g. /0/exercises/1/sets/2/reps)
 * @returns The value at path, or undefined if path is invalid or missing
 */
function getValueAtPath(doc: unknown, path: string): unknown {
    if (typeof path !== "string" || !path.startsWith("/")) return undefined;
    const segments = path.slice(1).split("/").filter(Boolean);
    let current: unknown = doc;
    for (const seg of segments) {
        if (current === undefined || current === null) return undefined;
        const key = /^\d+$/.test(seg) ? parseInt(seg, 10) : seg;
        current = Array.isArray(current) || typeof current === "object"
            ? (current as Record<string, unknown>)[key as string]
            : undefined;
    }
    return current;
}

/**
 * Returns a short human-readable description of a single JSON Patch operation
 * (e.g. "Set title to 'Push Day'", "Exercise 2, Set 1: Set reps to 10").
 */
export function describePatchOperation(op: PatchOperationForDescribe, hevyProgram?: THevyRoutine[]): string {
    const { op: opType, path, value } = op;
    if (typeof path !== "string" || !path.startsWith("/")) return "Updated program";
    const segments = path.slice(1).split("/").filter(Boolean);
    const withinRoutine = segments.slice(1);
    if (segments.length <= 1 || withinRoutine.length === 0) return "Updated program";

    if (withinRoutine[0] === "title") {
        return formatSimpleFieldOp(opType, "title", formatOpValue(value));
    }
    if (withinRoutine[0] === "notes") {
        return formatSimpleFieldOp(opType, "notes", formatOpValue(value));
    }

    if (withinRoutine[0] !== "exercises" || withinRoutine.length < 2) return "Updated program";

    const routineIndex = parseInt(segments[0], 10);
    const exerciseNum = parseSegmentNum(withinRoutine[1]);
    const exerciseLabel = ((): string => {
        if (!hevyProgram?.length || Number.isNaN(routineIndex)) return `Exercise ${exerciseNum}`;
        const exerciseIndex = parseInt(withinRoutine[1], 10);
        if (Number.isNaN(exerciseIndex)) return `Exercise ${exerciseNum}`;
        const title = hevyProgram[routineIndex]?.exercises?.[exerciseIndex]?.title;
        return (typeof title === "string" && title) ? title : `Exercise ${exerciseNum}`;
    })();

    if (withinRoutine.length === 2) {
        if (opType === "add") return `Add exercise ${exerciseNum}`;
        if (opType === "remove") return `Remove exercise ${exerciseNum}`;
        return `${opType} exercise ${exerciseNum}`;
    }
    if (withinRoutine[2] === "name" || withinRoutine[2] === "title") {
        const v = formatOpValue(value);
        return opType === "replace"
            ? `${exerciseLabel}: Set name to ${v}`
            : `${opType} exercise ${exerciseNum} name`;
    }
    if (withinRoutine[2] !== "sets" || withinRoutine.length < 4) {
        return `${exerciseLabel}: Updated`;
    }

    const setNum = parseSegmentNum(withinRoutine[3]);
    const v = formatOpValue(value);
    const setProp = withinRoutine[4];
    const config = setProp !== undefined ? SET_PROP_DESCRIPTIONS[setProp] : undefined;

    if (config) {
        if ("replaceText" in config) {
            return opType === "replace"
                ? `${exerciseLabel}, Set ${setNum}: ${config.replaceText}`
                : `${opType} ${config.fallback}`;
        }
        if (opType === "replace") {
            const oldVal = hevyProgram ? getValueAtPath(hevyProgram, path) : undefined;
            const oldStr = oldVal === undefined || oldVal === null ? "—" : String(oldVal);
            return `${exerciseLabel}, Set ${setNum}: ${config.label} ${oldStr} → ${v}${config.suffix ?? ""}`;
        }
        return `${opType} ${config.fallback}`;
    }

    const propLabel = (setProp ?? "").replace(/_/g, " ");
    if (opType === "replace" && v) {
        const oldVal = hevyProgram ? getValueAtPath(hevyProgram, path) : undefined;
        const oldStr = oldVal === undefined || oldVal === null ? "—" : String(oldVal);
        return `${exerciseLabel}, Set ${setNum}: ${propLabel} ${oldStr} → ${v}`;
    }
    return `${exerciseLabel}, Set ${setNum}: Updated`;
}

export type TModifyProgramRoutineObjective = {
    routineIndex: number;
    routineLabel: string;
    count: number;
    details: string[];
    /** folder_id (week, 0-indexed) for grouping; undefined when program not available */
    folder_id?: number;
};

/**
 * Groups patch operations by routine index and returns one entry per routine
 * with a summary label and full list of human-readable change descriptions.
 * When hevyProgram is provided, labels use "Week X Day Y" for clarity.
 *
 * @param patch - Array of JSON Patch operations from the AI modifyProgram tool
 * @param hevyProgram - Optional current program state, used to resolve Week/Day labels
 * @returns Per-routine summary objects with change counts and human-readable details
 */
export function getModifyProgramObjectivesByRoutine(
    patch: Array<{ op: string; path: string; value?: unknown; from?: string }> | undefined,
    hevyProgram?: THevyRoutine[]
): TModifyProgramRoutineObjective[] {
    if (!patch || !Array.isArray(patch) || patch.length === 0) return [];

    const byRoutine = new Map<number, string[]>();
    for (const op of patch) {
        const path = op.path;
        if (typeof path !== "string" || !path.startsWith("/")) continue;
        const segments = path.slice(1).split("/").filter(Boolean);
        const routineIndex = segments.length > 0 ? parseInt(segments[0], 10) : 0;
        if (Number.isNaN(routineIndex)) continue;
        const list = byRoutine.get(routineIndex) ?? [];
        list.push(describePatchOperation(op, hevyProgram));
        byRoutine.set(routineIndex, list);
    }

    const routineIndices = Array.from(byRoutine.keys()).sort((a, b) => a - b);
    return routineIndices.map((routineIndex) => {
        const details = byRoutine.get(routineIndex) ?? [];
        const count = details.length;
        const label = count === 1 ? "1 change" : `${count} changes`;
        const routine = hevyProgram?.[routineIndex];

        const routineLabel = `Week ${routine?.folder_id != null ? routine.folder_id + 1 : "?"} Day ${routine?.order ?? "?"}: ${label}`
        return {
            routineIndex,
            routineLabel,
            count,
            details,
            folder_id: routine?.folder_id,
        };
    });
}

/**
 * Collects unapplied modifyProgram tool results from messages, validates and applies
 * patches to the current program, pushes inverse patches to undo, and updates
 * the applied-keys set. Intended to be called from a useEffect when messages or
 * hevyProgram change.
 *
 * @param messages - Chat message history containing tool-modifyProgram parts
 * @param hevyProgram - Current program state to apply patches against
 * @param appliedKeysRef - Mutable set of already-applied patch keys (prevents double-apply)
 * @param applyPatchWithUndo - Callback to commit patched program and record inverse for undo (atomic)
 * @returns true if at least one patch was successfully applied, false otherwise
 */
export const applyModifyProgramPatchesFromMessages = (
    messages: UIMessage[],
    hevyProgram: THevyRoutine[],
    appliedKeysRef: React.MutableRefObject<Set<string>>,
    applyPatchWithUndo: (newDocument: THevyRoutine[], inversePatch: Operation[]) => void
): boolean => {

    if (!hevyProgram || hevyProgram.length === 0) return false;

    const toApply: { key: string; patch: IModifyProgramOutput["patch"] }[] = [];

    for (const message of messages) {
        const parts = message.parts ?? [];
        for (let partIndex = 0; partIndex < parts.length; partIndex++) {
            const part = parts[partIndex];
            if (part.type !== "tool-modifyProgram") continue;

            const toolOutput = (part as { output?: IModifyProgramOutput }).output;
            const patch = toolOutput?.patch;
            if (!patch || !Array.isArray(patch) || patch.length === 0 || toolOutput?.error) continue;

            const key = `${message.id ?? partIndex}-${partIndex}`;
            if (appliedKeysRef.current.has(key)) continue;

            toApply.push({ key, patch });
        }
    }

    let currentDoc: THevyRoutine[] = hevyProgram;
    let appliedAny = false;

    for (const { key, patch } of toApply) {
        const patchOps = patch as Operation[];
        const err = validatePatch(patchOps, currentDoc as object);
        if (err) {
            toast.error("Program modification failed: patch is invalid for current program.");
            console.error("Program modification failed: patch is invalid for current program",err);
            appliedKeysRef.current.add(key);
            break;
        }

        try {
            const result = applyPatch(
                currentDoc as object,
                patchOps,
                true,
                false
            ) as { newDocument: THevyRoutine[] };
            const newDocument = result.newDocument as THevyRoutine[];
            const inversePatch = compare(newDocument as object, currentDoc as object);
            applyPatchWithUndo(newDocument, inversePatch);
            currentDoc = newDocument;
            appliedKeysRef.current.add(key);
            appliedAny = true;
        } catch {
            toast.error("Program modification failed: could not apply patch.");
            appliedKeysRef.current.add(key);
            break;
        }
    }

    return appliedAny;
}
