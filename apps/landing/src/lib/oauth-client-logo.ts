// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module oauth-client-logo
 * Known MCP / OAuth client marks for the consent screen.
 * Dynamic registration often omits logo_uri; map common host agents by name.
 * Used by: oauth/consent page.
 */

/** Public static logos for well-known OAuth clients (Claude, ChatGPT, …). */
const KNOWN_CLIENT_LOGOS: ReadonlyArray<{ match: RegExp; src: string }> = [
    { match: /claude|anthropic/i, src: "/oauth-client-claude.svg" },
    { match: /chatgpt|openai/i, src: "/oauth-client-openai.svg" },
];

/**
 * Prefer a first-party mark when the client name matches a known host agent.
 *
 * @param clientName - OAuth client display name from authorization details.
 */
export function resolveKnownOAuthClientLogo(clientName: string): string | null {
    const name = clientName.trim();
    if (!name) {
        return null;
    }
    for (const entry of KNOWN_CLIENT_LOGOS) {
        if (entry.match.test(name)) {
            return entry.src;
        }
    }
    return null;
}
