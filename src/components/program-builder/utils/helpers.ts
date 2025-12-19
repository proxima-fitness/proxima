
import nlp from "compromise";

// Returns the proxima exercise gif_id for a specific hevy exercise using fuzzy matching



export const getMaxFolderId = (routines: THevyRoutine[]): number => {

    if (routines.length === 0) return 0;

    return routines.reduce((max, routine) => {
        return routine.folder_id > max ? routine.folder_id : max;
        }, routines[0].folder_id);
};


export const inferDaysPerWeek = (text: string) => {
    const normalized = text.toLowerCase();

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

