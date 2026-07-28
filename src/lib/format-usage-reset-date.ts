/**
 * Formats a Usage period `resets_on` date (YYYY-MM-DD from Postgres) for blocked-state copy.
 *
 * Parses as a local calendar date so timezone offset cannot shift the day.
 * Locale comes from the runtime - no hardcoded `en-US`.
 *
 * @returns e.g. "Aug 1", or empty string when the input is missing/invalid
 */
export function formatUsageResetDate(resetsOn: string | null | undefined): string {
    if (!resetsOn) return "";
    const [year, month, day] = resetsOn.split("-").map(Number);
    if (!year || !month || !day) return "";
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    });
}

/**
 * Appends " Renews on {date}." when `resets_on` is present; otherwise returns `base` unchanged.
 * Anonymous users have no Usage period - omit the sentence entirely.
 */
export function withRenewsOn(base: string, resetsOn: string | null | undefined): string {
    const formatted = formatUsageResetDate(resetsOn);
    if (!formatted) return base;
    const trimmed = base.replace(/\s+$/, "").replace(/\.$/, "");
    return `${trimmed}. Renews on ${formatted}.`;
}
