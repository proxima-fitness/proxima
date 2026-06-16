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
 * 4. **Program mutation helpers** – Human-readable operation summaries and client-side
 *    apply of agent mutateProgram tool results with undo support.
 *
 * Depends on: compromise (NLP), fuse.js (fuzzy), sonner (toasts), ai (UIMessage)
 * Used by: Agent chat (Chat.tsx), ProgramEditor, useChat hooks
 */

import { UIMessage } from "ai";
import nlp from "compromise";
import Fuse from "fuse.js";
import { toast } from "sonner";
import { applyOperations } from "@/components/program-builder/mutations/apply";
import type { TAgentProgramOperation } from "@/components/program-builder/mutations/agentSchema";
import { isApplyBatchFailure, type TCommitWithUndoOptions } from "@/components/program-builder/mutations/types";



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
        const folderId = routine.folder_id ?? 0;
        return folderId > max ? folderId : max;
        }, routines[0].folder_id ?? 0);
};

/**
 * Builds empty THevyRoutine[] with one routine per week/day; folder_id = week index, order = day. Used to initialize program before buildWeek fills it.
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
function matchOptionsInText(text: string, options: TSelectOption[]): TSelectOption[] {
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
 * @returns Matching TSelectOption[] for areas to exclude
 */
export function inferExcludeAreas(text: string, options: TSelectOption[]): TSelectOption[] {
    if (!text || !options.length) return [];
    const normalized = text.toLowerCase().replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, "-");
    const exclusionRegex = /(?:exclude|no|avoid|skip|without|don't\s+train)\s+/gi;
    const parts = normalized.split(exclusionRegex);
    parts.shift(); // drop segment before first keyword
    const matched = new Map<string, TSelectOption>();
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
 * @returns Matching TSelectOption[] for equipment to exclude
 */
export function inferExcludeEquipment(text: string, options: TSelectOption[]): TSelectOption[] {
    if (!text || !options.length) return [];
    const normalized = text.toLowerCase().replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, "-");
    if (/bodyweight\s+only|no\s+equipment|only\s+bodyweight/.test(normalized)) {
        return options.filter((opt) => (opt.value ?? "").toLowerCase() !== "bodyweight");
    }
    const exclusionRegex = /(?:no|without|don't\s+use|exclude)\s+/gi;
    const parts = normalized.split(exclusionRegex);
    parts.shift();
    const matched = new Map<string, TSelectOption>();
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
 * @returns Matching TSelectOption[] for health issues to consider
 */
export function inferHealthIssues(text: string, options: TSelectOption[]): TSelectOption[] {
    if (!text || !options.length) return [];
    const normalized = text.toLowerCase().replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, "-");
    const matched = new Map<string, TSelectOption>();
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
        const rr = exercise.reps_range?.[i];
        const hasRepRange = rr != null && Array.isArray(rr) && rr.length >= 2;
        const weight = exercise.weights?.[i];
        const rpeVal = exercise?.rpe
            ? (exercise.rpe[i] ?? null)
            : (exercise?.rpe_range?.[i]?.[1] ?? null);
        sets.push({
            index: i,
            type: "normal", // Assuming all sets are normal
            weight_kg: weight == null || weight <= 0 ? null : weight,
            reps: hasRepRange
                ? null
                : exercise?.reps
                  ? exercise.reps[i] ?? null
                  : null,
            distance_meters: 0, // No distance tracking by default
            duration_seconds: exercise?.time_taken ? exercise.time_taken?.[i] || 0 : exercise?.time_range && exercise.time_range?.[i]?.[1] || 0,
            rpe: rpeVal == null || rpeVal <= 0 ? null : rpeVal,
            custom_metric: 0, // Placeholder for custom metric
            rep_range: hasRepRange ? { start: rr[0], end: rr[1] } : null,
        });
    }

    return sets;
};

/** Shape of the AI mutateProgram tool's JSON output (operations batch or error). */
export interface IMutateProgramOutput {
    operations?: TAgentProgramOperation[];
    error?: string;
    failures?: Array<{ index: number; op: string; reason: string }>;
}

export type TModifyProgramRoutineObjective = {
    routineIndex: number;
    routineLabel: string;
    count: number;
    details: string[];
    /** folder_id (week, 0-indexed) for grouping; undefined when program not available */
    folder_id?: number;
};

/** Short human-readable label for one registry operation (mutateProgram UI). */
export function describeProgramOperation(operation: TAgentProgramOperation): string {
    const weeks =
        "folderIds" in operation && Array.isArray(operation.folderIds)
            ? operation.folderIds.map((id) => id + 1).join(", ")
            : null;

    switch (operation.op) {
        case "edit_day_title":
            return `Week${weeks ? ` ${weeks}` : ""} day ${operation.dayOrder}: rename to "${operation.title}"`;
        case "add_day_notes":
            return `Week${weeks ? ` ${weeks}` : ""} day ${operation.dayOrder}: set day notes`;
        case "insert_exercise": {
            const ex = "exercise" in operation ? operation.exercise : undefined;
            const label = ex?.title ?? ex?.exercise_template_id ?? "…";
            const day = operation.dayOrder ?? "?";
            const idx = operation.exerciseIndex ?? "?";
            return `Week${weeks ? ` ${weeks}` : ""} day ${day}: insert "${label}" at index ${idx}`;
        }
        case "edit_exercise": {
            const day = operation.dayOrder ?? "?";
            const idx =
                operation.exerciseIndex != null ? operation.exerciseIndex + 1 : "?";
            return `Week${weeks ? ` ${weeks}` : ""} day ${day}: replace exercise ${idx}`;
        }
        case "delete_exercise":
            return `Week${weeks ? ` ${weeks}` : ""} day ${operation.dayOrder}: remove exercise ${operation.exerciseIndex + 1}`;
        case "update_set":
            return `Week${weeks ? ` ${weeks}` : ""} day ${operation.dayOrder}: update set ${operation.setIndex + 1} on exercise ${operation.exerciseIndex + 1}`;
        case "add_exercise_notes":
            return `Week${weeks ? ` ${weeks}` : ""} day ${operation.dayOrder}: set exercise ${operation.exerciseIndex + 1} notes`;
        case "delete_day":
            return `Week${weeks ? ` ${weeks}` : ""} day ${operation.dayOrder}: delete day`;
        case "add_day":
            return weeks ? `Add day to week ${weeks}` : "Add day";
        case "delete_week":
            return weeks ? `Delete week ${weeks}` : "Delete week";
        case "create_superset": {
            const indexes =
                operation.exerciseIndexes?.map((i) => i + 1).join(", ") ?? "…";
            const day = operation.dayOrder ?? "?";
            return `Week${weeks ? ` ${weeks}` : ""} day ${day}: create superset (exercises ${indexes})`;
        }
        case "remove_from_superset":
            return `Week${weeks ? ` ${weeks}` : ""} day ${operation.dayOrder}: remove exercise ${operation.exerciseIndex + 1} from superset`;
        case "swap_exercise_template": {
            const scope =
                operation.folderIds || operation.dayOrder
                    ? ` (scoped${weeks ? ` weeks ${weeks}` : ""}${operation.dayOrder ? ` day ${operation.dayOrder}` : ""})`
                    : " (all weeks/days)";
            const to = operation.to;
            const toTitle =
                to?.title ??
                (to && "exercise_template_id" in to ? String(to.exercise_template_id) : "…");
            return `Swap ${operation.from_exercise_template_id} → ${toTitle}${scope}`;
        }
        default: {
            const unknownOp: never = operation;
            return unknownOp;
        }
    }
}

/** Progress list shape for mutateProgram tool UI (single summary group). */
export function getMutateProgramObjectives(
    operations: TAgentProgramOperation[] | undefined,
): TModifyProgramRoutineObjective[] {
    if (!operations?.length) return [];
    const details = operations.map(describeProgramOperation);
    const label = details.length === 1 ? "1 change" : `${details.length} changes`;
    return [
        {
            routineIndex: 0,
            routineLabel: label,
            count: details.length,
            details,
        },
    ];
}

function getLastSuccessfulBuildWeekFlatIndex(messages: UIMessage[]): number {
    const segment = getAssistantMessagesSinceLastUser(messages);
    const flat = flattenAssistantParts(segment);
    let lastBwIdx = -1;
    for (let i = 0; i < flat.length; i++) {
        const { part } = flat[i];
        if (part.type !== "tool-buildWeek") continue;
        const out = (part as { output?: { routines?: THevyRoutine[]; error?: string } }).output;
        if (out?.routines && !out?.error) lastBwIdx = i;
    }
    return lastBwIdx;
}

function buildFlatPartIndexByKey(messages: UIMessage[]): Map<string, number> {
    const segment = getAssistantMessagesSinceLastUser(messages);
    const flat = flattenAssistantParts(segment);
    const indexByKey = new Map<string, number>();
    for (let i = 0; i < flat.length; i++) {
        const { messageId, partIndex } = flat[i];
        indexByKey.set(`${messageId}-${partIndex}`, i);
    }
    return indexByKey;
}

function exerciseNeedsGridNormalization(exercise: THevyExercise): boolean {
    const sets = exercise.sets ?? [];
    return (
        exercise.title === undefined ||
        exercise.notes === undefined ||
        exercise.exercise_template_id === undefined ||
        exercise.sets === undefined ||
        sets.some((s) => s == null)
    );
}

function normalizeExerciseForGrid(exercise: THevyExercise): THevyExercise {
    return {
        ...exercise,
        title: exercise.title ?? "",
        notes: exercise.notes ?? "",
        exercise_template_id: exercise.exercise_template_id ?? "",
        supersets_id: exercise.supersets_id ?? null,
        rest_seconds: exercise.rest_seconds ?? null,
        sets: (exercise.sets ?? []).filter((s): s is THevySets => s != null),
    };
}

/**
 * Ensures every routine has an exercises array and every exercise has coalesced
 * string fields and a sets array (null exercise/set slots dropped). Prevents grid
 * render crashes after mutate/hydrate gaps.
 */
export const normalizeProgramForGrid = (routines: THevyRoutine[]): THevyRoutine[] => {
    let mutated = false;
    const next = routines
        .filter((routine): routine is THevyRoutine => {
            if (routine == null) {
                mutated = true;
                return false;
            }
            return true;
        })
        .map((routine) => {
            const rawExercises = routine.exercises ?? [];
            let exercisesChanged = routine.exercises === undefined;
            const exercises: THevyExercise[] = [];

            for (const ex of rawExercises) {
                if (ex == null) {
                    exercisesChanged = true;
                    continue;
                }
                if (exerciseNeedsGridNormalization(ex)) {
                    exercises.push(normalizeExerciseForGrid(ex));
                    exercisesChanged = true;
                } else {
                    exercises.push(ex);
                }
            }

            const title = routine.title ?? "";
            const notes = routine.notes ?? "";
            const routineChanged =
                exercisesChanged || routine.title === undefined || routine.notes === undefined;

            if (routineChanged) {
                mutated = true;
                return { ...routine, title, notes, exercises };
            }
            return routine;
        });

    return mutated ? next : routines;
};

/** Grid shape normalization then rep_range coercion for commit/hydrate paths. */
export const normalizeProgramState = (routines: THevyRoutine[]): THevyRoutine[] =>
    normalizeRepRanges(normalizeProgramForGrid(routines));

/**
 * Coerces degenerate rep_range objects (start === end) to null across an entire
 * program, setting reps to the fixed value when it wasn't already set.
 * rep_range supersedes reps in the UI, so {start:5,end:5} would display "5-5".
 */
export const normalizeRepRanges = (routines: THevyRoutine[]): THevyRoutine[] => {
    let mutated = false;
    for (const routine of routines) {
        for (const exercise of routine.exercises ?? []) {
            for (const set of exercise.sets ?? []) {
                if (
                    set.rep_range != null &&
                    set.rep_range.start === set.rep_range.end
                ) {
                    const fixedReps = set.rep_range.start;
                    set.rep_range = null;
                    if (set.reps == null) set.reps = fixedReps;
                    mutated = true;
                }
            }
        }
    }
    return mutated ? [...routines] : routines;
};

/**
 * Assistant messages in the current user turn (everything after the last user message).
 */
export const getAssistantMessagesSinceLastUser = (messages: UIMessage[]): UIMessage[] => {
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
            return messages.slice(i + 1);
        }
    }
    return messages;
};

type TFlatPart = { messageId: string; partIndex: number; part: NonNullable<UIMessage["parts"]>[number] };

const flattenAssistantParts = (segment: UIMessage[]): TFlatPart[] => {
    const out: TFlatPart[] = [];
    for (const message of segment) {
        if (message.role !== "assistant") continue;
        const messageId = message.id ?? "";
        (message.parts ?? []).forEach((part, partIndex) => {
            out.push({ messageId, partIndex, part });
        });
    }
    return out;
};

/** Snapshot of the last successful buildWeek in the current turn plus merged mutateProgram ops after it. */
export interface IMergedBuildMutateSnapshot {
    baseWeekRoutines: THevyRoutine[];
    totalDays: number;
    mergedOperations: TAgentProgramOperation[];
    mutateKeys: string[];
    /** From the newest successful `tool-planProgram` before the last `tool-buildWeek`, when present. */
    durationWeeksFromPlan?: number;
}

/**
 * Reads `planProgram.durationWeeks` from the latest successful plan tool call strictly before the flattened buildWeek index.
 */
function getDurationWeeksFromPlanBeforeBuildWeek(flat: TFlatPart[], lastBuildWeekFlatIndex: number): number | undefined {
    for (let i = lastBuildWeekFlatIndex - 1; i >= 0; i--) {
        const { part } = flat[i];
        if (part.type !== "tool-planProgram") continue;
        const out = (part as { output?: { plan?: { durationWeeks?: number }; error?: string } }).output;
        if (!out || out.error) continue;
        const w = out.plan?.durationWeeks;
        if (typeof w === "number" && Number.isFinite(w) && w >= 1) {
            return Math.floor(w);
        }
    }
    return undefined;
}

/** Weeks to duplicate for atomic build: prefer plan so mutate ops stay valid; else UI; else 1. */
export const resolveEffectiveWeeksForAtomicCommit = (
    snap: IMergedBuildMutateSnapshot,
    programLengthFromUi?: number
): number => Math.max(1, snap.durationWeeksFromPlan ?? programLengthFromUi ?? 1);

/**
 * Finds the last successful buildWeek in the current assistant turn and concatenates
 * all mutateProgram operations that appear after it (one batch for periodization).
 * Ops apply in message order; client does not reorder.
 */
export const getMergedBuildAndMutateSnapshot = (messages: UIMessage[]): IMergedBuildMutateSnapshot | null => {
    const segment = getAssistantMessagesSinceLastUser(messages);
    const flat = flattenAssistantParts(segment);
    let lastBwIdx = -1;
    let routines: THevyRoutine[] | null = null;
    let totalDays = 0;

    for (let i = 0; i < flat.length; i++) {
        const { part } = flat[i];
        if (part.type !== "tool-buildWeek") continue;
        const out = (part as { output?: { routines?: THevyRoutine[]; totalDays?: number; error?: string } }).output;
        if (out?.routines && !out?.error) {
            lastBwIdx = i;
            routines = out.routines;
            totalDays = out.totalDays ?? out.routines.length;
        }
    }

    if (lastBwIdx < 0 || !routines?.length) return null;

    const durationWeeksFromPlan = getDurationWeeksFromPlanBeforeBuildWeek(flat, lastBwIdx);

    const mergedOperations: TAgentProgramOperation[] = [];
    const mutateKeys: string[] = [];

    for (let i = lastBwIdx + 1; i < flat.length; i++) {
        const { messageId, partIndex, part } = flat[i];
        if (part.type !== "tool-mutateProgram") continue;
        const toolOutput = (part as { output?: IMutateProgramOutput }).output;
        const operations = toolOutput?.operations;
        if (!operations?.length || toolOutput?.error) continue;
        mergedOperations.push(...operations);
        mutateKeys.push(`${messageId}-${partIndex}`);
    }

    return {
        baseWeekRoutines: routines,
        totalDays,
        mergedOperations,
        mutateKeys,
        durationWeeksFromPlan,
    };
};

/**
 * Duplicates the first week across programLength weeks (same rules as MessageBubbles buildWeek effect).
 */
export const buildFullProgramFromFirstWeek = (
    weekRoutines: THevyRoutine[],
    totalDays: number,
    programLength: number
): THevyRoutine[] => {
    const sorted = [...weekRoutines].sort((a, b) => Number(a.order) - Number(b.order));
    if (sorted.length !== totalDays) {
        console.warn("buildFullProgramFromFirstWeek: routine count does not match totalDays");
    }
    const weeks = Math.max(1, programLength || 1);
    const fullProgram: THevyRoutine[] = [];
    let routineId = 1;
    for (let weekIndex = 0; weekIndex < weeks; weekIndex++) {
        for (const routine of sorted) {
            fullProgram.push({
                ...routine,
                id: String(routineId++),
                folder_id: weekIndex,
            });
        }
    }
    return fullProgram;
};

/**
 * Stable key for idempotent atomic commit of a build+modify turn (avoids duplicate setState in Strict Mode).
 */
export const getAtomicBuildCommitKey = (
    snapshot: IMergedBuildMutateSnapshot,
    messages: UIMessage[],
    effectiveWeeks: number
): string => {
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
            lastUserIdx = i;
            break;
        }
    }
    const tailIds = messages.slice(lastUserIdx + 1).map((m) => m.id ?? "");
    return `${tailIds.join("|")}|${snapshot.baseWeekRoutines.length}|${snapshot.mergedOperations.length}|${snapshot.mutateKeys.join(",")}|${effectiveWeeks}`;
};

export type TChatStatusForAtomic = "streaming" | "ready" | (string & {});

/**
 * When the assistant turn includes a successful buildWeek, duplicates week 1 across all weeks,
 * applies all mutateProgram operations after that buildWeek in one shot, and commits.
 * Only runs when status is ready (stream finished).
 * When the program was empty, commits with `recordUndo: false` so the user cannot undo back to an empty grid.
 *
 * Duplication week count prefers **planProgram.durationWeeks** from the same turn, then **programLengthFromUi**.
 */
export const tryCommitAtomicBuildWeekAndMutations = (
    messages: UIMessage[],
    status: TChatStatusForAtomic | undefined,
    programLengthFromUi: number | undefined,
    hevyProgram: THevyRoutine[],
    appliedMutateProgramKeysRef: React.RefObject<Set<string>>,
    lastAtomicCommitKeyRef: React.RefObject<string | null>,
    commitWithUndo: (next: THevyRoutine[], options?: TCommitWithUndoOptions) => void,
): { committed: boolean; effectiveWeeks?: number } => {
    if (status === "streaming") return { committed: false };

    const snap = getMergedBuildAndMutateSnapshot(messages);
    if (!snap) return { committed: false };

    const effectiveWeeks = resolveEffectiveWeeksForAtomicCommit(snap, programLengthFromUi);
    if (
        snap.durationWeeksFromPlan != null &&
        programLengthFromUi != null &&
        snap.durationWeeksFromPlan !== programLengthFromUi
    ) {
        console.warn("[tryCommitAtomicBuildWeekAndMutations] planProgram.durationWeeks differs from UI programLength", {
            durationWeeksFromPlan: snap.durationWeeksFromPlan,
            programLengthFromUi,
            effectiveWeeks,
        });
    }

    const commitKey = getAtomicBuildCommitKey(snap, messages, effectiveWeeks);
    if (lastAtomicCommitKeyRef.current === commitKey) return { committed: false };

    let doc = buildFullProgramFromFirstWeek(snap.baseWeekRoutines, snap.totalDays, effectiveWeeks);

    if (snap.mergedOperations.length > 0) {
        const result = applyOperations(doc, snap.mergedOperations);
        if (isApplyBatchFailure(result)) {
            const reason = result.failures[0]?.reason ?? "Program modification failed.";
            toast.error(reason);
            console.error("Atomic build mutate batch failed", result.failures);
            return { committed: false };
        }
        doc = result.program;
    }

    commitWithUndo(doc, { recordUndo: hevyProgram.length > 0 });
    snap.mutateKeys.forEach((k) => appliedMutateProgramKeysRef.current.add(k));
    lastAtomicCommitKeyRef.current = commitKey;
    return { committed: true, effectiveWeeks };
};

/**
 * Applies standalone mutateProgram tool batches (live-grid edits). Skips parts after
 * buildWeek in the same turn (handled by atomic commit in 2c). Fail-all batch semantics.
 */
export const applyMutateProgramFromMessages = (
    messages: UIMessage[],
    status: TChatStatusForAtomic | undefined,
    hevyProgram: THevyRoutine[],
    appliedKeysRef: React.RefObject<Set<string>>,
    commitWithUndo: (next: THevyRoutine[], options?: TCommitWithUndoOptions) => void,
): boolean => {
    if (status === "streaming") return false;
    if (!hevyProgram?.length) return false;

    const lastBuildWeekIdx = getLastSuccessfulBuildWeekFlatIndex(messages);
    const flatIndexByKey = buildFlatPartIndexByKey(messages);

    const pendingKeys: string[] = [];
    const mergedOperations: TAgentProgramOperation[] = [];

    for (const message of messages) {
        const parts = message.parts ?? [];
        for (let partIndex = 0; partIndex < parts.length; partIndex++) {
            const part = parts[partIndex];
            if (part.type !== "tool-mutateProgram") continue;

            const key = `${message.id ?? partIndex}-${partIndex}`;
            if (appliedKeysRef.current.has(key)) continue;

            const flatIdx = flatIndexByKey.get(key);
            if (flatIdx != null && lastBuildWeekIdx >= 0 && flatIdx > lastBuildWeekIdx) {
                continue;
            }

            const toolOutput = (part as { output?: IMutateProgramOutput }).output;
            const operations = toolOutput?.operations;
            if (!operations?.length || toolOutput?.error) continue;

            pendingKeys.push(key);
            mergedOperations.push(...operations);
        }
    }

    if (mergedOperations.length === 0) return false;

    const result = applyOperations(hevyProgram, mergedOperations);
    if (isApplyBatchFailure(result)) {
        const reason = result.failures[0]?.reason ?? "Program modification failed.";
        toast.error(reason);
        console.error("mutateProgram batch failed", result.failures);
        pendingKeys.forEach((k) => appliedKeysRef.current.add(k));
        return false;
    }

    commitWithUndo(result.program, { recordUndo: hevyProgram.length > 0 });
    pendingKeys.forEach((k) => appliedKeysRef.current.add(k));
    return true;
};
