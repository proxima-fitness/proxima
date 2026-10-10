// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module createdProgramsModel
 *
 * Pure helpers for **Created programs**: owned **Proxima programs** the owner
 * **Leave**d, and the slug href used by **View**.
 * Depends on: TProgram
 * Used by: CreatedProgramsList, tests
 */

/**
 * Catalog / slug path for a **Proxima program** (same as `/programs` cards).
 *
 * @param title - Program display title
 * @param id - Programs primary key
 */
export function programDetailHref(title: string, id: number): string {
    const slug = title
        .trim()
        .toLowerCase()
        .replace(/[\s,/]+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    return `/programs/${slug}/${id}`;
}

/**
 * Owner programs that are not on **Program overview**.
 *
 * @param owned - Programs the user owns
 * @param subscribedIds - Program ids currently on overview
 */
export function selectCreatedPrograms(
    owned: readonly TProgram[],
    subscribedIds: ReadonlySet<number>,
): TProgram[] {
    return owned.filter((program) => !subscribedIds.has(program.id));
}
