/**
 * @module helpers
 *
 * General-purpose utilities for the program builder feature. Responsibilities:
 *
 * 1. **NLP inference** - Extracts structured parameters (days-per-week, program
 *    length) from free-text user messages using regex heuristics with an NLP
 *    fallback (compromise.js).
 * 2. **Message classification** - Determines whether a chat message is
 *    "about the program" (fuzzy-matched via Fuse.js) to decide if the current
 *    Hevy program should be sent as tool context.
 * 3. **Schema conversion** - Converts between the Proxima schedule format
 *    (TScheduleWorkouts) and the Hevy routine format (THevyRoutine), including
 *    set generation with support for reps, ranges, time, RPE, and AMRAP.
 * 4. **Program mutation helpers** - Human-readable operation summaries, **Mutation proposal**
 *    collect / Accept / lock / stale expire, and atomic buildProgram apply of agent mutateProgram tool results.
 * 5. **Hevy share import hydrate** - client-side apply of a confirmed importHevyShareFolder
 *    tool result onto an empty grid (week 0 seed).
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
import { normalizeRestSeconds } from "@/components/program-builder/mutations/normalizeHevyApiRoutine";
import { isApplyBatchFailure, type TCommitWithUndoOptions } from "@/components/program-builder/mutations/types";
import type { TMutationProposalRecipe } from "@/components/program-builder/utils/mutation-proposal-copy";
import {
    isHevyShareImportSuccess,
    type TImportHevyShareFolderToolOutput,
} from "@/app/api/chat/tools/hevy-share";
import { plateThenStamp } from "@/app/api/chat/sanity/snapshot";
import type { TPeriodizationWave } from "@/app/api/chat/sanity/periodization-wave";
import type { TExerciseRoleAssignment } from "@/app/api/chat/sanity/types";
import { assignBuilderExerciseKeys } from "@/components/program-builder/utils/builder-exercise-key";
import { collectProposalMarkKeys } from "@/components/program-builder/utils/proposal-marks";



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
 * Builds empty THevyRoutine[] with one routine per week/day; folder_id = week index, order = day. Used to initialize program before buildProgram fills it.
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
 * Attempts to extract the number of training days per week (1-7) from
 * free-text user input. Uses a cascade of regex patterns for common phrasings
 * (e.g. "3x/week", "every day", "couple times") and falls back to compromise
 * NLP tokenization when regexes fail.
 *
 * @param text - Raw user message text
 * @returns String representation of days-per-week ("1"-"7"), or "" if not found
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
 * Attempts to extract the program length in weeks (1-52) from free-text user
 * input. Uses regex patterns for phrasings like "12 weeks", "8-week program",
 * "for 6 weeks", and falls back to compromise NLP when regexes fail.
 *
 * @param text - Raw user message text
 * @returns String representation of weeks ("1"-"52"), or "" if not found
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
        // Keep Hevy no-equipment (`none`); exclude every other catalog value.
        return options.filter((opt) => (opt.value ?? "").toLowerCase() !== "none");
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
        const rr = exercise.reps_range?.[i] ?? null;
        const hasRepRange = rr != null;
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

function getLastSuccessfulBuildProgramFlatIndex(messages: UIMessage[]): number {
    const segment = getAssistantMessagesSinceLastUser(messages);
    const flat = flattenAssistantParts(segment);
    let lastBwIdx = -1;
    for (let i = 0; i < flat.length; i++) {
        const { part } = flat[i];
        if (part.type !== "tool-buildProgram") continue;
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
        normalizeRestSeconds(exercise.rest_seconds) !== exercise.rest_seconds ||
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
        rest_seconds: normalizeRestSeconds(exercise.rest_seconds),
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
    assignBuilderExerciseKeys(normalizeRepRanges(normalizeProgramForGrid(routines)));

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

/** Snapshot of the last successful buildProgram in the current turn plus merged mutateProgram ops after it. */
export interface IMergedBuildMutateSnapshot {
    baseWeekRoutines: THevyRoutine[];
    totalDays: number;
    mergedOperations: TAgentProgramOperation[];
    mutateKeys: string[];
    /** `plan.durationWeeks` echoed on the last successful `tool-buildProgram`, when present. */
    durationWeeksFromPlan?: number;
    periodizationWave?: TPeriodizationWave;
    exerciseRoles?: TExerciseRoleAssignment[];
}

/**
 * Reads `durationWeeks` and the Periodization wave from the plan a successful
 * `buildProgram` echoes on its output (ADR 0030 / 01: plan rides on the land call).
 *
 * @param plan - `output.plan` from the last successful `tool-buildProgram`
 */
function readBuildProgramPlan(
    plan: { durationWeeks?: number; periodizationWave?: TPeriodizationWave } | undefined,
): { durationWeeks?: number; periodizationWave?: TPeriodizationWave } {
    const w = plan?.durationWeeks;
    const durationWeeks =
        typeof w === "number" && Number.isFinite(w) && w >= 1 ? Math.floor(w) : undefined;
    return {
        durationWeeks,
        periodizationWave: plan?.periodizationWave,
    };
}

/** Weeks to duplicate for atomic build: prefer plan so mutate ops stay valid; else UI; else 1. */
export const resolveEffectiveWeeksForAtomicCommit = (
    snap: IMergedBuildMutateSnapshot,
    programLengthFromUi?: number
): number => Math.max(1, snap.durationWeeksFromPlan ?? programLengthFromUi ?? 1);

/**
 * Finds the last successful buildProgram in the current assistant turn and concatenates
 * all mutateProgram operations that appear after it (one batch for periodization).
 * Ops apply in message order; client does not reorder.
 */
export const getMergedBuildAndMutateSnapshot = (messages: UIMessage[]): IMergedBuildMutateSnapshot | null => {
    const segment = getAssistantMessagesSinceLastUser(messages);
    const flat = flattenAssistantParts(segment);
    let lastBwIdx = -1;
    let routines: THevyRoutine[] | null = null;
    let totalDays = 0;
    let exerciseRoles: TExerciseRoleAssignment[] | undefined;
    let landedPlan: { durationWeeks?: number; periodizationWave?: TPeriodizationWave } | undefined;

    for (let i = 0; i < flat.length; i++) {
        const { part } = flat[i];
        if (part.type !== "tool-buildProgram") continue;
        const out = (
            part as {
                output?: {
                    routines?: THevyRoutine[];
                    totalDays?: number;
                    exerciseRoles?: TExerciseRoleAssignment[];
                    plan?: { durationWeeks?: number; periodizationWave?: TPeriodizationWave };
                    error?: string;
                };
            }
        ).output;
        if (out?.routines && !out?.error) {
            lastBwIdx = i;
            routines = out.routines;
            totalDays = out.totalDays ?? out.routines.length;
            exerciseRoles = out.exerciseRoles;
            landedPlan = out.plan;
        }
    }

    if (lastBwIdx < 0 || !routines?.length) return null;

    const plan = readBuildProgramPlan(landedPlan);

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
        durationWeeksFromPlan: plan.durationWeeks,
        periodizationWave: plan.periodizationWave,
        exerciseRoles,
    };
};

/**
 * Duplicates the first week across programLength weeks (same rules as MessageBubbles buildProgram effect).
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
    const waveId = (snapshot.periodizationWave?.weeks ?? [])
        .map((row) => {
            const accessory = row.accessory
                ? `${row.accessory.rpeDelta}:${row.accessory.setCountDelta}`
                : "";
            const range = row.mainRepRange
                ? `${row.mainRepRange.start}-${row.mainRepRange.end}`
                : "";
            return `${row.week}:${row.main.rpeDelta}:${row.main.setCountDelta}:${accessory}:${range}`;
        })
        .join(";");
    const roleId = (snapshot.exerciseRoles ?? [])
        .map((row) => `${row.dayOrder}:${row.exerciseIndex}:${row.role}`)
        .join(";");
    return `${tailIds.join("|")}|${snapshot.baseWeekRoutines.length}|${snapshot.mergedOperations.length}|${snapshot.mutateKeys.join(",")}|${effectiveWeeks}|${waveId}|${roleId}`;
};

export type TChatStatusForAtomic = "streaming" | "ready" | (string & {});

/**
 * When the assistant turn includes a successful buildProgram, duplicates week 1 across all weeks,
 * applies all mutateProgram operations after that buildProgram in one shot, and commits.
 * Only runs when status is ready (stream finished).
 * When the program was empty, commits with `recordUndo: false` so the user cannot undo back to an empty grid.
 *
 * Duplication week count prefers the landed `buildProgram` plan's **durationWeeks**, then **programLengthFromUi**.
 */
export const tryCommitAtomicBuildProgramAndMutations = (
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
        console.warn("[tryCommitAtomicBuildProgramAndMutations] buildProgram plan.durationWeeks differs from UI programLength", {
            durationWeeksFromPlan: snap.durationWeeksFromPlan,
            programLengthFromUi,
            effectiveWeeks,
        });
    }

    const commitKey = getAtomicBuildCommitKey(snap, messages, effectiveWeeks);
    if (lastAtomicCommitKeyRef.current === commitKey) return { committed: false };

    let doc: THevyRoutine[];
    if (snap.periodizationWave && snap.exerciseRoles?.length) {
        const stamped = plateThenStamp(
            snap.baseWeekRoutines,
            snap.periodizationWave,
            snap.exerciseRoles,
            effectiveWeeks,
        );
        if (!stamped.ok) {
            toast.error(stamped.message);
            return { committed: false };
        }
        doc = stamped.program;
    } else {
        doc = buildFullProgramFromFirstWeek(snap.baseWeekRoutines, snap.totalDays, effectiveWeeks);
    }

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

/** Persisted **Mutation proposal** decision on chat message metadata (ADR 0024). */
export type TMutationProposalDecision = "accepted" | "pending" | "rejected";

/** Standalone mutateProgram batch waiting on Accept (skips same-turn post-buildProgram ops). */
export interface IMutationProposal {
    keys: string[];
    messageIds: string[];
    operations: TAgentProgramOperation[];
}

function isMetadataRecord(metadata: unknown): metadata is Record<string, unknown> {
    return metadata != null && typeof metadata === "object" && !Array.isArray(metadata);
}

function readStoredMutationProposalDecision(message: UIMessage): TMutationProposalDecision | undefined {
    if (!isMetadataRecord(message.metadata)) return undefined;
    const stored = message.metadata.mutationProposal;
    if (stored === "accepted" || stored === "pending" || stored === "rejected") {
        return stored;
    }
    return undefined;
}

/**
 * Recipe frozen at Accept / Reject. After the grid changes, the card must
 * still show this tree; it must not recompute from the live program.
 *
 * @param message - Assistant message that may hold a stored recipe
 */
export function readStoredMutationProposalRecipe(
    message: UIMessage,
): TMutationProposalRecipe | null {
    if (!isMetadataRecord(message.metadata)) return null;
    const stored = message.metadata.mutationProposalRecipe;
    if (stored == null || typeof stored !== "object" || Array.isArray(stored)) {
        return null;
    }
    const days = (stored as { days?: unknown }).days;
    if (!Array.isArray(days)) return null;
    return stored as TMutationProposalRecipe;
}

/**
 * Decision for a **Mutation proposal** card: stored metadata wins; a later user
 * message is implicit Reject (C5). Absence of both is pending.
 *
 * @param message - Assistant message that may hold mutateProgram parts
 * @param laterMessages - Messages after `message` in the thread
 */
export function resolveMutationProposalDecision(
    message: UIMessage,
    laterMessages: readonly UIMessage[],
): TMutationProposalDecision | null {
    const stored = readStoredMutationProposalDecision(message);
    if (stored === "accepted" || stored === "rejected") return stored;
    if (laterMessages.some((later) => later.role === "user")) return "rejected";
    if (stored === "pending") return "pending";
    return null;
}

/**
 * Writes accepted / rejected onto message metadata so hydrate does not re-open
 * or auto-apply the batch (C7, C8). Pass the recipe built against the
 * pre-decision grid so the card stays frozen after Accept.
 *
 * @param messages - Current thread
 * @param messageIds - Assistant message ids that held the pending batch
 * @param decision - Explicit Accept or Reject
 * @param recipe - Frozen recipe shown on the card; omit only when none exists
 */
export function withMutationProposalDecision(
    messages: TChatMessage[],
    messageIds: readonly string[],
    decision: Exclude<TMutationProposalDecision, "pending">,
    recipe?: TMutationProposalRecipe,
): TChatMessage[] {
    const idSet = new Set(messageIds);
    return messages.map((message) => {
        if (!idSet.has(message.id ?? "")) return message;
        const previous = isMetadataRecord(message.metadata) ? message.metadata : {};
        return {
            ...message,
            metadata: {
                ...previous,
                mutationProposal: decision,
                ...(recipe ? { mutationProposalRecipe: recipe } : {}),
            },
        };
    });
}

/**
 * Collects a standalone **Mutation proposal** from mutateProgram tool parts.
 * Does not commit. Skips parts after buildProgram in the same turn, decided cards,
 * and implicit Reject (a later user message).
 *
 * @param messages - Chat thread
 * @param status - Stream status; streaming never opens a proposal
 * @param hevyProgram - Live grid; empty grid has no standalone proposal
 * @param appliedKeysRef - Session keys already accepted (or atomic-committed)
 */
export const collectMutationProposal = (
    messages: UIMessage[],
    status: TChatStatusForAtomic | undefined,
    hevyProgram: THevyRoutine[],
    appliedKeysRef: React.RefObject<Set<string>>,
): IMutationProposal | null => {
    if (status === "streaming") return null;
    if (!hevyProgram?.length) return null;

    const lastBuildProgramIdx = getLastSuccessfulBuildProgramFlatIndex(messages);
    const flatIndexByKey = buildFlatPartIndexByKey(messages);
    const appliedKeys = appliedKeysRef.current;

    const pendingKeys: string[] = [];
    const messageIds: string[] = [];
    const mergedOperations: TAgentProgramOperation[] = [];

    for (let messageIndex = 0; messageIndex < messages.length; messageIndex++) {
        const message = messages[messageIndex];
        const decision = resolveMutationProposalDecision(message, messages.slice(messageIndex + 1));
        if (decision === "accepted" || decision === "rejected") continue;

        const parts = message.parts ?? [];
        let messageHasPending = false;
        for (let partIndex = 0; partIndex < parts.length; partIndex++) {
            const part = parts[partIndex];
            if (part.type !== "tool-mutateProgram") continue;

            const key = `${message.id ?? partIndex}-${partIndex}`;
            if (appliedKeys?.has(key)) continue;

            const flatIdx = flatIndexByKey.get(key);
            if (flatIdx != null && lastBuildProgramIdx >= 0 && flatIdx > lastBuildProgramIdx) {
                continue;
            }

            const toolOutput = (part as { output?: IMutateProgramOutput }).output;
            const operations = toolOutput?.operations;
            if (!operations?.length || toolOutput?.error) continue;

            pendingKeys.push(key);
            mergedOperations.push(...operations);
            messageHasPending = true;
        }
        if (messageHasPending && message.id) {
            messageIds.push(message.id);
        }
    }

    if (mergedOperations.length === 0) return null;

    return {
        keys: pendingKeys,
        messageIds,
        operations: mergedOperations,
    };
};

/**
 * True when the pending batch still fail-all applies to the grid on screen (C9).
 *
 * @param hevyProgram - Current grid
 * @param proposal - Batch from {@link collectMutationProposal}
 */
export function mutationProposalApplies(
    hevyProgram: THevyRoutine[],
    proposal: IMutationProposal,
): boolean {
    return !isApplyBatchFailure(applyOperations(hevyProgram, proposal.operations));
}

/**
 * Streaming lock, plus an open **Mutation proposal** that still applies (C6, C7).
 * First-build trailing mutate is not a proposal (`collect` skips it), so the
 * lock lifts when that stream ends. A stale batch does not lock.
 *
 * @param messages - Chat thread
 * @param status - Stream status
 * @param hevyProgram - Current grid
 * @param appliedKeysRef - Session keys already accepted (or atomic-committed)
 */
export function isAgentMutationLockActive(
    messages: UIMessage[],
    status: TChatStatusForAtomic | undefined,
    hevyProgram: THevyRoutine[],
    appliedKeysRef: React.RefObject<Set<string>>,
): boolean {
    if (status === "streaming") return true;
    const proposal = collectMutationProposal(messages, status, hevyProgram, appliedKeysRef);
    if (!proposal) return false;
    return mutationProposalApplies(hevyProgram, proposal);
}

/**
 * True when this mutateProgram part sits after a successful buildProgram in the
 * current turn (atomic commit owns it; not a **Mutation proposal**).
 *
 * @param messages - Chat thread
 * @param messageId - Assistant message id
 * @param partIndex - Index of the tool part on that message
 */
export function isMutateProgramPartAfterBuildProgram(
    messages: UIMessage[],
    messageId: string,
    partIndex: number,
): boolean {
    const lastBuildProgramIdx = getLastSuccessfulBuildProgramFlatIndex(messages);
    if (lastBuildProgramIdx < 0) return false;
    const flatIdx = buildFlatPartIndexByKey(messages).get(`${messageId}-${partIndex}`);
    return flatIdx != null && flatIdx > lastBuildProgramIdx;
}

/**
 * Accept: apply the pending batch fail-all and commit one undo step. Does not
 * mark the card decided; the caller writes accepted after a successful commit,
 * or rejected when fail-all expires the proposal (C9).
 *
 * @param hevyProgram - Current grid
 * @param proposal - Batch from {@link collectMutationProposal}
 * @param appliedKeysRef - Session idempotency keys
 * @param commitWithUndo - Grid commit
 */
export function acceptMutationProposal(
    hevyProgram: THevyRoutine[],
    proposal: IMutationProposal,
    appliedKeysRef: React.RefObject<Set<string>>,
    commitWithUndo: (next: THevyRoutine[], options?: TCommitWithUndoOptions) => void,
): boolean {
    const result = applyOperations(hevyProgram, proposal.operations);
    if (isApplyBatchFailure(result)) {
        const reason = result.failures[0]?.reason ?? "Program modification failed.";
        toast.error(reason);
        console.error("mutateProgram batch failed", result.failures);
        return false;
    }

    const recordUndo = hevyProgram.length > 0;
    const proposalMarkKeys = recordUndo
        ? collectProposalMarkKeys(hevyProgram, result.program, proposal.operations)
        : undefined;
    commitWithUndo(result.program, {
        recordUndo,
        ...(proposalMarkKeys !== undefined ? { proposalMarkKeys } : {}),
    });
    proposal.keys.forEach((key) => appliedKeysRef.current?.add(key));
    return true;
}

/** True when any day already holds exercise rows - the grid-empty test both share gates use. */
export const programHasExerciseRows = (routines: THevyRoutine[]): boolean =>
    routines.some((routine) => (routine.exercises?.length ?? 0) > 0);

/** A confirmed **Hevy share import** waiting to be hydrated, keyed for idempotent apply. */
export interface IHevyShareImportSeed {
    /** `${messageId}-${partIndex}` of the tool part this seed came from. */
    key: string;
    /** Week-0 days from the share, already stripped of foreign Hevy identity by the adapter. */
    routines: THevyRoutine[];
}

/**
 * Newest successful `importHevyShareFolder` result in the thread, if any.
 *
 * Scans the whole thread rather than the current turn: the seed lands in one turn and the
 * grid it fills is the same grid on every later render, so a mid-thread import must stay
 * findable (and stay keyed) after the user sends more messages.
 */
export const getHevyShareImportSeed = (messages: UIMessage[]): IHevyShareImportSeed | null => {
    let seed: IHevyShareImportSeed | null = null;

    for (const message of messages) {
        const parts = message.parts ?? [];
        for (let partIndex = 0; partIndex < parts.length; partIndex++) {
            const part = parts[partIndex];
            if (part.type !== "tool-importHevyShareFolder") continue;

            const output = (part as { output?: TImportHevyShareFolderToolOutput }).output;
            if (!output || !isHevyShareImportSuccess(output) || output.routines.length === 0) {
                continue;
            }

            seed = {
                key: `${message.id ?? partIndex}-${partIndex}`,
                routines: output.routines,
            };
        }
    }

    return seed;
};

/**
 * Hydrates a confirmed **Hevy share import** onto the grid as week 0 (one-week seed).
 *
 * The server already refused a populated grid, but its view comes from the request body and
 * can lag what the user is looking at - so the live grid gets the last word before anything
 * is overwritten. A refused seed is still keyed, so the check does not re-run every render.
 *
 * Only runs when the stream has finished, and never duplicates the week across the builder's
 * program length: expanding is a separate ask.
 */
export const tryApplyHevyShareImport = (
    messages: UIMessage[],
    status: TChatStatusForAtomic | undefined,
    hevyProgram: THevyRoutine[],
    lastHevyShareImportKeyRef: React.RefObject<string | null>,
    commitWithUndo: (next: THevyRoutine[], options?: TCommitWithUndoOptions) => void,
): boolean => {
    if (status === "streaming") return false;

    const seed = getHevyShareImportSeed(messages);
    if (!seed || lastHevyShareImportKeyRef.current === seed.key) return false;

    lastHevyShareImportKeyRef.current = seed.key;

    if (programHasExerciseRows(hevyProgram)) {
        console.warn("Hevy share import skipped - the grid already has exercises");
        toast.error("Your program already has exercises, so the Hevy share wasn't loaded.");
        return false;
    }

    const week = buildFullProgramFromFirstWeek(seed.routines, seed.routines.length, 1);
    commitWithUndo(week, { recordUndo: hevyProgram.length > 0 });
    return true;
};
