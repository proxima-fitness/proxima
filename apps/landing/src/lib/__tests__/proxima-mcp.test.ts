/**
 * @module proxima-mcp tests
 */
import { describe, expect, it } from "vitest";
import {
    buildClaudeCodeAddCommand,
    buildClaudeMcpInstallUrl,
    getProximaMcpUrl,
    PROXIMA_MCP_CONNECTOR_NAME,
} from "../proxima-mcp";

describe("getProximaMcpUrl", () => {
    it("prefers an explicit public MCP URL", () => {
        expect(
            getProximaMcpUrl({
                mcpUrl: "https://mcp.proxima.example/mcp/",
                supabaseUrl: "https://example.supabase.co",
            }),
        ).toBe("https://mcp.proxima.example/mcp");
    });

    it("falls back to the supabase functions path", () => {
        expect(
            getProximaMcpUrl({
                mcpUrl: "",
                supabaseUrl: "https://example.supabase.co/",
            }),
        ).toBe("https://example.supabase.co/functions/v1/mcp");
    });

    it("returns empty when both sources are missing", () => {
        expect(getProximaMcpUrl({ mcpUrl: "", supabaseUrl: "" })).toBe("");
    });
});

describe("buildClaudeMcpInstallUrl", () => {
    it("prefills connector name and url", () => {
        const mcpUrl = "https://example.supabase.co/functions/v1/mcp";
        const href = buildClaudeMcpInstallUrl(mcpUrl);
        const url = new URL(href);
        expect(url.origin + url.pathname).toBe(
            "https://claude.ai/customize/connectors",
        );
        expect(url.searchParams.get("modal")).toBe("add-custom-connector");
        expect(url.searchParams.get("connectorName")).toBe(
            PROXIMA_MCP_CONNECTOR_NAME,
        );
        expect(url.searchParams.get("connectorUrl")).toBe(mcpUrl);
    });
});

describe("buildClaudeCodeAddCommand", () => {
    it("builds the remote add command", () => {
        expect(
            buildClaudeCodeAddCommand(
                "https://example.supabase.co/functions/v1/mcp",
            ),
        ).toBe(
            "claude mcp add Proxima https://example.supabase.co/functions/v1/mcp",
        );
    });
});
