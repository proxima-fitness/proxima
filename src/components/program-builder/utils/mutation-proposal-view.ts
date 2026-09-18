/**
 * @module mutation-proposal-view
 *
 * Presentation splits for the **Mutation proposal** review card (ADR 0024).
 * Parses recipe heading/action strings into week path, verb, and value pairs.
 * Does not invent line-diff counts.
 *
 * Depends on: mutation-proposal-copy string shapes. Used by: MutationProposalCard.
 */

export type TProposalHeadingView = {
    dayTitle: string;
    weekPath: string;
};

export type TProposalActionPairView = {
    from: string | null;
    kind: "pair";
    to: string | null;
    verb: string;
};

export type TProposalActionPlainView = {
    kind: "plain";
    text: string;
};

export type TProposalActionView = TProposalActionPairView | TProposalActionPlainView;

const MULTI_WEEK_HEADING =
    /^(Weeks \d+(?:-\d+)?(?:, \d+(?:-\d+)?)*)(?:,\s*(.*))?$/;
const ONE_WEEK_HEADING = /^(Week \d+)(?:,\s*(.*))?$/;
const ALL_WEEKS_HEADING = /^(All weeks)(?:,\s*(.*))?$/;

/**
 * Split a recipe day heading into a week path and a day title.
 *
 * @param heading - `formatHeading` string, e.g. "Weeks 4, 8, Push Day"
 */
export function splitProposalHeading(heading: string): TProposalHeadingView {
    const trimmed = heading.trim();
    const allWeeks = trimmed.match(ALL_WEEKS_HEADING);
    if (allWeeks) {
        return { dayTitle: allWeeks[2]?.trim() ?? "", weekPath: allWeeks[1] };
    }
    const oneWeek = trimmed.match(ONE_WEEK_HEADING);
    if (oneWeek) {
        return { dayTitle: oneWeek[2]?.trim() ?? "", weekPath: oneWeek[1] };
    }
    const multiWeek = trimmed.match(MULTI_WEEK_HEADING);
    if (multiWeek) {
        return { dayTitle: multiWeek[2]?.trim() ?? "", weekPath: multiWeek[1] };
    }
    return { dayTitle: trimmed, weekPath: "" };
}

/**
 * Parse a recipe action sentence into a verb + value pair when the prefix is known.
 *
 * @param text - Action line from the recipe tree
 */
export function parseProposalAction(text: string): TProposalActionView {
    const trimmed = text.trim();
    const rename = trimmed.match(/^Rename (.+) to (.+)$/);
    if (rename) {
        return { from: rename[1], kind: "pair", to: rename[2], verb: "Title" };
    }
    const swap = trimmed.match(/^Swap (.+) for (.+)$/);
    if (swap) {
        return { from: swap[1], kind: "pair", to: swap[2], verb: "Swap" };
    }
    const replace = trimmed.match(/^Replace (.+) with (.+)$/);
    if (replace) {
        return { from: replace[1], kind: "pair", to: replace[2], verb: "Replace" };
    }
    const notes = trimmed.match(/^Set notes on (.+)$/);
    if (notes) {
        return { from: notes[1], kind: "pair", to: "added", verb: "Notes" };
    }
    const dropSuperset = trimmed.match(/^Remove (.+) from superset$/);
    if (dropSuperset) {
        return { from: dropSuperset[1], kind: "pair", to: null, verb: "Superset" };
    }
    const remove = trimmed.match(/^Remove (.+)$/);
    if (remove) {
        return { from: remove[1], kind: "pair", to: null, verb: "Remove" };
    }
    if (trimmed === "Add day") {
        return { from: null, kind: "pair", to: "day", verb: "Add" };
    }
    const add = trimmed.match(/^Add (.+)$/);
    if (add) {
        return { from: null, kind: "pair", to: add[1], verb: "Add" };
    }
    if (trimmed === "Delete week") {
        return { from: "week", kind: "pair", to: null, verb: "Delete" };
    }
    const deleteMatch = trimmed.match(/^Delete (.+)$/);
    if (deleteMatch) {
        return { from: deleteMatch[1], kind: "pair", to: null, verb: "Delete" };
    }
    return { kind: "plain", text: trimmed };
}
