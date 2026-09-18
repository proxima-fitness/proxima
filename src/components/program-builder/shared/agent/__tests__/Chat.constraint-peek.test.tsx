import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { User } from "@supabase/supabase-js";
import type { ReactNode } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";

const useUserContext = vi.fn();
const useMyFeatureLimits = vi.fn();

vi.mock("@/contexts/UserContext", () => ({
    useUserContext: () => useUserContext(),
}));

vi.mock("@/api/hooks", () => ({
    useMyFeatureLimits: (...args: unknown[]) => useMyFeatureLimits(...args),
}));

vi.mock("@/components/program-builder/shared/agent/AgenticMemoryPeekHost", () => ({
    AgenticMemoryPeekHost: ({ user }: { user: User }) => (
        <div data-testid="agentic-memory-peek">peek:{user.id}</div>
    ),
}));

vi.mock("@/hooks/use-mic-transcription", () => ({
    useMicTranscription: () => ({
        status: "idle",
        toggle: vi.fn(),
    }),
}));

vi.mock("@/components/ai-elements/prompt-input", () => ({
    PromptInputProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    PromptInput: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="prompt-input">{children}</div>
    ),
    PromptInputFooter: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="prompt-footer">{children}</div>
    ),
    PromptInputTextarea: () => <textarea aria-label="Ask anything…" />,
    PromptInputSubmit: () => <button type="button">Submit</button>,
    usePromptInputAttachments: () => ({
        files: [],
        remove: vi.fn(),
        openFileDialog: vi.fn(),
    }),
    usePromptInputController: () => ({
        textInput: { value: "", setInput: vi.fn() },
    }),
}));

vi.mock("@/components/ai-elements/attachments", () => ({
    Attachments: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Attachment: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    AttachmentHoverCard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    AttachmentHoverCardContent: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
    ),
    AttachmentHoverCardTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    AttachmentInfo: () => null,
    AttachmentPreview: () => null,
    AttachmentRemove: () => null,
    getAttachmentLabel: () => "",
    getMediaCategory: () => "file",
}));

vi.mock("@/components/ai-elements/suggestion", () => ({
    Suggestions: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Suggestion: () => null,
}));

vi.mock("@/components/ui/upgrade-banner", () => ({
    UpgradeBanner: () => null,
}));

vi.mock("@/components/ui/questions", () => ({
    Questions: () => null,
}));

import { Chat } from "../Chat";

function renderChat(ui: ReactNode) {
    return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe("Chat agentic memory peek", () => {
    beforeEach(() => {
        useUserContext.mockReset();
        useMyFeatureLimits.mockReset();
        useMyFeatureLimits.mockReturnValue({ data: null });
    });

    afterEach(() => {
        cleanup();
    });

    it("mounts Agentic memory peek near prompt when signed in", () => {
        useUserContext.mockReturnValue({
            user: { id: "user-1" } as User,
        });

        renderChat(
            <Chat
                isLoading={false}
                handleSubmit={vi.fn()}
                handleStop={vi.fn()}
                showSuggestions={false}
            />,
        );

        const peeks = screen.getAllByTestId("agentic-memory-peek");
        expect(peeks.length).toBeGreaterThan(0);
        expect(peeks[0].textContent).toContain("peek:user-1");
    });

    it("hides Agentic memory peek when anonymous", () => {
        useUserContext.mockReturnValue({ user: null });

        renderChat(
            <Chat
                isLoading={false}
                handleSubmit={vi.fn()}
                handleStop={vi.fn()}
                showSuggestions={false}
            />,
        );

        expect(screen.queryByTestId("agentic-memory-peek")).toBeNull();
    });

    it("marks the composer and keyboard-hide chrome for the phone tab shell", () => {
        useUserContext.mockReturnValue({ user: null });

        const { container } = renderChat(
            <Chat
                isLoading={false}
                handleSubmit={vi.fn()}
                handleStop={vi.fn()}
                showSuggestions
            />,
        );

        expect(container.querySelector("[data-proxima-chat-composer]")).toBeTruthy();
        expect(container.querySelector("[data-proxima-chat-keyboard-hide]")).toBeTruthy();
    });
});
