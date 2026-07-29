/**
 * @module lib/hevy-share/share-url
 *
 * Parses public Hevy share links into the identifier the web share endpoints need.
 * Two shapes are supported in v1: `hevy.com/folder/{id}` (a shared routine folder)
 * and `hevy.com/routine/{shortId}` (a single shared routine).
 *
 * Depends on: nothing
 * Used by: lib/hevy-share/load-share, chat share tools
 */

/** What a pasted share link points at. Foreign Hevy ids stay here - they never reach builder state. */
export type THevyShareTarget =
    | { kind: "folder"; folderId: string }
    | { kind: "routine"; shortId: string };

/** Hosts we accept a share link from. */
const SHARE_HOSTS = new Set(["hevy.com", "www.hevy.com"]);

/** Share ids are opaque url-safe tokens; anything else is a link we do not understand. */
const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/** Wrapping characters picked up when a link is pasted mid-sentence or inside markdown. */
const LEADING_PUNCTUATION = /^[([{<'"]+/;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}>'"]+$/;

/**
 * Parses a pasted Hevy share link.
 *
 * Tolerates a missing scheme (`hevy.com/routine/abc`), `www.`, query strings,
 * fragments, a trailing slash, and surrounding sentence/markdown punctuation. Anything that
 * is not a share link - including Hevy app deep links and `api.hevyapp.com`
 * URLs - returns `null`.
 *
 * @param input - Raw string from the user or the agent tool call
 * @returns The share target, or `null` when the link is not a Hevy share URL
 */
export function parseHevyShareUrl(input: string): THevyShareTarget | null {
    if (typeof input !== "string") return null;

    const trimmed = input
        .trim()
        .replace(LEADING_PUNCTUATION, "")
        .replace(TRAILING_PUNCTUATION, "");
    if (!trimmed) return null;

    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    let url: URL;
    try {
        url = new URL(withScheme);
    } catch {
        return null;
    }

    if (!SHARE_HOSTS.has(url.hostname.toLowerCase())) return null;

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length !== 2) return null;

    const [kind, rawId] = segments;
    const id = decodeURIComponent(rawId);
    if (!SHARE_ID_PATTERN.test(id)) return null;

    if (kind.toLowerCase() === "folder") return { kind: "folder", folderId: id };
    if (kind.toLowerCase() === "routine") return { kind: "routine", shortId: id };

    return null;
}

/** Canonical `https://hevy.com/…` form of a target, for echoing back to the user. */
export function formatHevyShareUrl(target: THevyShareTarget): string {
    return target.kind === "folder"
        ? `https://hevy.com/folder/${target.folderId}`
        : `https://hevy.com/routine/${target.shortId}`;
}
