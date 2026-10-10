// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module proxima-mcp
 * Public Proxima MCP endpoint + host-agent install helpers (Claude / ChatGPT / Claude Code).
 * Depends on: NEXT_PUBLIC_PROXIMA_MCP_URL, NEXT_PUBLIC_REACT_APP_SUPABASE_URL.
 * Used by: ConnectMcpButton.
 */

export const PROXIMA_MCP_CONNECTOR_NAME = "Proxima";

/** ChatGPT has no prefill install link; open the app so the user can paste. */
export const CHATGPT_APPS_URL = "https://chatgpt.com/";

export type TProximaMcpUrlInput = {
    /** Prefer this stable public MCP URL when set. */
    mcpUrl?: string;
    /** Fallback: `{supabaseUrl}/functions/v1/mcp`. */
    supabaseUrl?: string;
};

/**
 * Streamable HTTP URL for Proxima MCP.
 * Prefers `NEXT_PUBLIC_PROXIMA_MCP_URL` so local Supabase URLs are not shipped to Claude.
 */
export function getProximaMcpUrl({
    mcpUrl = process.env.NEXT_PUBLIC_PROXIMA_MCP_URL ?? "",
    supabaseUrl = process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_URL ?? "",
}: TProximaMcpUrlInput = {}): string {
    const explicit = mcpUrl.trim().replace(/\/$/, "");
    if (explicit) {
        return explicit;
    }
    const base = supabaseUrl.trim().replace(/\/$/, "");
    if (!base) {
        return "";
    }
    return `${base}/functions/v1/mcp`;
}

/**
 * Claude.ai install link that prefills Add custom connector.
 * @see https://claude.com/docs/connectors/building/directory-vs-custom
 */
export function buildClaudeMcpInstallUrl(mcpUrl: string): string {
    const params = new URLSearchParams({
        modal: "add-custom-connector",
        connectorName: PROXIMA_MCP_CONNECTOR_NAME,
        connectorUrl: mcpUrl,
    });
    return `https://claude.ai/customize/connectors?${params.toString()}`;
}

/** Claude Code CLI to register the same remote MCP server. */
export function buildClaudeCodeAddCommand(mcpUrl: string): string {
    return `claude mcp add ${PROXIMA_MCP_CONNECTOR_NAME} ${mcpUrl}`;
}
