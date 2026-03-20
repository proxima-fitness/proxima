/** Canonical site URL included in exported routine notes (Hevy, CSV, PDF). */
export const PROXIMA_FITNESS_EXPORT_URL = "https://proximafitness.com";

const exportAttributionLine = () =>
    `Built by Proxima · ${PROXIMA_FITNESS_EXPORT_URL}`;

/**
 * Produces routine notes for outbound exports only: preserves user notes and
 * appends Proxima attribution. Idempotent when the URL is already present.
 */
export function routineNotesForExport(notes: string | undefined): string {
    const trimmed = (notes ?? "").trim();
    if (trimmed.includes(PROXIMA_FITNESS_EXPORT_URL)) {
        return trimmed;
    }
    if (trimmed.length === 0) {
        return exportAttributionLine();
    }
    return `${trimmed}\n\n${exportAttributionLine()}`;
}
