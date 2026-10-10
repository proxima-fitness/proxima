"use client";

/**
 * @module ConnectMcpButton
 * Hero dropdown: add Proxima MCP in Claude, ChatGPT, or Claude Code; always shows copyable URL.
 * Depends on: dropdown-menu, Button, proxima-mcp, sonner, posthog, lucide-react.
 * Used by: Prompt.
 */

import { Check, ChevronDown, Copy } from "lucide-react";
import posthog from "posthog-js";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    buildClaudeCodeAddCommand,
    buildClaudeMcpInstallUrl,
    CHATGPT_APPS_URL,
    getProximaMcpUrl,
} from "@/lib/proxima-mcp";

type THost = "claude" | "chatgpt" | "claude_code" | "copy_url";

async function copyText(value: string): Promise<boolean> {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        return false;
    }
    try {
        await navigator.clipboard.writeText(value);
        return true;
    } catch {
        return false;
    }
}

/**
 * Secondary hero CTA: connect Proxima MCP from Claude, ChatGPT, or Claude Code.
 */
export function ConnectMcpButton() {
    const mcpUrl = getProximaMcpUrl();
    const claudeHref = mcpUrl ? buildClaudeMcpInstallUrl(mcpUrl) : null;
    const claudeCodeCommand = mcpUrl ? buildClaudeCodeAddCommand(mcpUrl) : null;
    const [copied, setCopied] = useState(false);

    const track = (host: THost) => {
        posthog?.capture?.("homepage_connect_mcp_clicked", { host });
    };

    const missingUrl = () => {
        toast.error("Proxima MCP URL is not configured", {
            description: "Set NEXT_PUBLIC_PROXIMA_MCP_URL to the public MCP endpoint.",
        });
    };

    const copyMcpUrl = async () => {
        if (!mcpUrl) {
            missingUrl();
            return;
        }
        track("copy_url");
        const ok = await copyText(mcpUrl);
        if (ok) {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
            toast.success("Proxima MCP URL copied");
            return;
        }
        toast.message("Copy this Proxima MCP URL", { description: mcpUrl });
    };

    const connectClaude = () => {
        if (!claudeHref) {
            missingUrl();
            return;
        }
        track("claude");
        toast.message("After you add Proxima", {
            description:
                "In the chat, open + → Connectors and turn Proxima on for that conversation. Sign in with OAuth when Claude asks.",
        });
        window.open(claudeHref, "_blank", "noopener,noreferrer");
    };

    const connectChatgpt = async () => {
        if (!mcpUrl) {
            missingUrl();
            return;
        }
        track("chatgpt");
        const ok = await copyText(mcpUrl);
        toast.success(ok ? "Proxima MCP URL copied" : "Add Proxima in ChatGPT", {
            description: ok
                ? "ChatGPT → Settings → Apps → Advanced settings → enable Developer mode → Create. Paste the URL, choose OAuth (not No auth), then enable the app in chat."
                : mcpUrl,
        });
        window.open(CHATGPT_APPS_URL, "_blank", "noopener,noreferrer");
    };

    const connectClaudeCode = async () => {
        if (!claudeCodeCommand) {
            missingUrl();
            return;
        }
        track("claude_code");
        const ok = await copyText(claudeCodeCommand);
        toast.success(ok ? "Claude Code command copied" : "Run this in a terminal", {
            description: claudeCodeCommand,
        });
    };

    return (
        <div className="flex w-full max-w-xl flex-col items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        className="rounded-full border-foreground/15 bg-background/70 px-5 text-sm font-semibold shadow-xs backdrop-blur-sm hover:bg-background"
                    >
                        Use in Claude or ChatGPT
                        <ChevronDown className="h-4 w-4 opacity-70" aria-hidden />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="min-w-64">
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                        Adds Proxima MCP (OAuth)
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                        disabled={!claudeHref}
                        onSelect={(event) => {
                            event.preventDefault();
                            connectClaude();
                        }}
                    >
                        Connect Claude
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        disabled={!mcpUrl}
                        onSelect={(event) => {
                            event.preventDefault();
                            void connectChatgpt();
                        }}
                    >
                        Connect ChatGPT
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        disabled={!claudeCodeCommand}
                        onSelect={(event) => {
                            event.preventDefault();
                            void connectClaudeCode();
                        }}
                    >
                        Copy Claude Code command
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        disabled={!mcpUrl}
                        onSelect={(event) => {
                            event.preventDefault();
                            void copyMcpUrl();
                        }}
                    >
                        {copied ? (
                            <Check className="h-4 w-4" aria-hidden />
                        ) : (
                            <Copy className="h-4 w-4" aria-hidden />
                        )}
                        Copy MCP URL
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {mcpUrl ? (
                <button
                    type="button"
                    onClick={() => {
                        void copyMcpUrl();
                    }}
                    className="group flex max-w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
                    title="Copy Proxima MCP URL"
                >
                    <span className="truncate font-mono">{mcpUrl}</span>
                    {copied ? (
                        <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    ) : (
                        <Copy className="h-3.5 w-3.5 shrink-0 opacity-70 group-hover:opacity-100" aria-hidden />
                    )}
                    <span className="sr-only">Copy Proxima MCP URL</span>
                </button>
            ) : (
                <p className="px-2 text-center text-xs text-muted-foreground">
                    MCP URL not configured. Set NEXT_PUBLIC_PROXIMA_MCP_URL.
                </p>
            )}
        </div>
    );
}
