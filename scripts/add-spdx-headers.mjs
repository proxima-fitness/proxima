#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
/**
 * One-shot / idempotent: prepend SPDX license headers to source files.
 * Skips generated paths and files that already declare an SPDX header.
 *
 * Usage: node scripts/add-spdx-headers.mjs
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SPDX = "AGPL-3.0-only";
const MARKER = "SPDX-License-Identifier:";

const SKIP_DIR = new Set([
    ".git",
    "node_modules",
    "dist",
    ".next",
    "coverage",
    ".turbo",
    "vendor",
]);

const SKIP_FILES = new Set([
    "apps/landing/src/hooks/supabase.ts",
]);

const EXTS = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".css",
    ".sql",
]);

function shouldSkipFile(rel) {
    if (SKIP_FILES.has(rel)) return true;
    if (rel.endsWith(".d.ts")) return true;
    if (rel.includes(`${join("node_modules", "")}`)) return true;
    return false;
}

function commentForExt(ext) {
    if (ext === ".css") return `/* ${MARKER} ${SPDX} */\n`;
    if (ext === ".sql") return `-- ${MARKER} ${SPDX}\n`;
    return `// ${MARKER} ${SPDX}\n`;
}

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        if (SKIP_DIR.has(name)) continue;
        const abs = join(dir, name);
        let st;
        try {
            st = statSync(abs);
        } catch {
            continue;
        }
        if (st.isDirectory()) {
            walk(abs, out);
            continue;
        }
        const ext = extname(name);
        if (!EXTS.has(ext)) continue;
        const rel = relative(ROOT, abs);
        if (shouldSkipFile(rel)) continue;
        out.push(abs);
    }
    return out;
}

function hasSpdxHeader(content) {
    return /^(#!.*\n)?(\/\/|\/\*|--)\s*SPDX-License-Identifier:/m.test(
        content.slice(0, 400),
    );
}

function insertHeader(content, header) {
    if (hasSpdxHeader(content)) return null;

    const lines = content.split("\n");
    let i = 0;

    // Keep shebang first
    if (lines[0]?.startsWith("#!")) {
        i = 1;
        if (lines[1] === "") i = 2;
    }

    const before = lines.slice(0, i).join("\n");
    const after = lines.slice(i).join("\n");
    const prefix = before ? `${before}\n` : "";
    // Blank line after SPDX when the rest of the file is non-empty
    const spacer = after.startsWith("\n") || after === "" ? "" : "\n";
    return `${prefix}${header}${spacer}${after}`;
}

const files = walk(ROOT);
let updated = 0;
let skipped = 0;

for (const abs of files) {
    const ext = extname(abs);
    const original = readFileSync(abs, "utf8");
    const next = insertHeader(original, commentForExt(ext));
    if (next === null) {
        skipped += 1;
        continue;
    }
    writeFileSync(abs, next);
    updated += 1;
}

console.log(`SPDX headers: updated ${updated}, already present ${skipped}, scanned ${files.length}`);
