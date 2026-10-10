// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from "vitest";
import { parse as parseYaml } from "yaml";
import * as fs from "node:fs/promises";
import * as path from "node:path";

type TYamlFrontmatter = Record<string, unknown>;

async function walkFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const results: string[] = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...(await walkFiles(fullPath)));
        } else if (entry.isFile()) {
            results.push(fullPath);
        }
    }

    return results;
}

function extractYamlFrontmatter(markdown: string): string | null {
    // Match a standard YAML frontmatter block: `---\n...yaml...\n---`
    // Use a non-greedy capture so we stop at the first closing delimiter.
    const match = markdown.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
    return match?.[1] ?? null;
}

describe("skill YAML frontmatter validation", () => {
    it("parses YAML frontmatter for all .agents/skills/*/SKILL.md files", async () => {
        const skillsRoot = path.join(process.cwd(), ".agents", "skills");
        const allFiles = await walkFiles(skillsRoot);
        const skillFiles = allFiles.filter((f) => f.endsWith("SKILL.md"));

        // If this fails in CI later, it means the skills folder layout changed.
        expect(skillFiles.length).toBeGreaterThan(0);

        for (const filePath of skillFiles) {
            const raw = await fs.readFile(filePath, "utf8");
            const frontmatter = extractYamlFrontmatter(raw);

            expect(frontmatter, `Missing or unterminated YAML frontmatter in ${filePath}`).not.toBeNull();

            let parsed: TYamlFrontmatter;
            try {
                parsed = parseYaml(frontmatter as string) as TYamlFrontmatter;
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                throw new Error(`Invalid YAML frontmatter in ${filePath}: ${message}`);
            }

            expect(parsed && typeof parsed === "object", `Frontmatter must be an object in ${filePath}`).toBe(true);

            expect(typeof parsed.name, `Missing/invalid "name" in ${filePath}`).toBe("string");
            expect((parsed.name as string).trim().length).toBeGreaterThan(0);

            expect(typeof parsed.description, `Missing/invalid "description" in ${filePath}`).toBe("string");
            expect((parsed.description as string).trim().length).toBeGreaterThan(0);
        }
    });
});

