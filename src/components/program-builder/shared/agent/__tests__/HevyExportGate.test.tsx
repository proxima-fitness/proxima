import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import type { ReactNode } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";

const useUserContext = vi.fn();
const useMyFeatureLimits = vi.fn();
const useHevySecret = vi.fn();
const connectHevyKey = vi.fn();
const triggerWorkoutHistorySync = vi.fn();
const triggerBodyMeasurementsSync = vi.fn();

vi.mock("@/contexts/UserContext", () => ({
    useUserContext: () => useUserContext(),
}));

vi.mock("@/api/hooks", () => ({
    useMyFeatureLimits: (...args: unknown[]) => useMyFeatureLimits(...args),
    useHevySecret: (...args: unknown[]) => useHevySecret(...args),
}));

vi.mock("@/components/program-builder/api/connect-hevy-key", () => ({
    connectHevyKey: (...args: unknown[]) => connectHevyKey(...args),
}));

vi.mock("@/api/workout-history-sync", () => ({
    triggerWorkoutHistorySync: () => triggerWorkoutHistorySync(),
}));

vi.mock("@/api/body-measurements-sync", () => ({
    triggerBodyMeasurementsSync: () => triggerBodyMeasurementsSync(),
}));

vi.mock("@/components/program-builder/shared/agent/AgenticMemoryPeekHost", () => ({
    AgenticMemoryPeekHost: () => null,
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
    Questions: () => <div data-testid="questionnaire">Questions</div>,
}));

vi.mock("next/navigation", () => ({
    usePathname: () => "/build-program",
    useSearchParams: () => new URLSearchParams(),
}));

import { Chat } from "../Chat";
import { HevyExportGate } from "../HevyExportGate";

function makeQueryClient() {
    return new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
}

function renderWithTooltip(ui: ReactNode) {
    return render(
        <QueryClientProvider client={makeQueryClient()}>
            <TooltipProvider>{ui}</TooltipProvider>
        </QueryClientProvider>,
    );
}

describe("HevyExportGate footer", () => {
    beforeEach(() => {
        useUserContext.mockReset();
        useMyFeatureLimits.mockReset();
        useHevySecret.mockReset();
        connectHevyKey.mockReset();
        triggerWorkoutHistorySync.mockReset();
        triggerBodyMeasurementsSync.mockReset();
        useMyFeatureLimits.mockReturnValue({ data: null });
        useHevySecret.mockReturnValue({ data: undefined, isLoading: false });
        connectHevyKey.mockResolvedValue({ status: "saved" });
    });

    afterEach(() => {
        cleanup();
    });

    it("shows sign-in step when anonymous", () => {
        useUserContext.mockReturnValue({ user: null, isLoading: false });

        renderWithTooltip(
            <HevyExportGate onDismiss={vi.fn()} onComplete={vi.fn()} />,
        );

        expect(screen.getByTestId("hevy-export-gate-sign-in-step")).toBeTruthy();
        expect(screen.getByTestId("hevy-export-gate-sign-in-link").getAttribute("href")).toBe(
            `/auth/login?next=${encodeURIComponent("/build-program?resume=true")}`,
        );
        expect(screen.queryByTestId("hevy-export-gate-key-step")).toBeNull();
    });

    it("skips sign-in and shows Hevy key step when signed in without key", () => {
        useUserContext.mockReturnValue({
            user: { id: "user-1" } as User,
            isLoading: false,
        });
        useHevySecret.mockReturnValue({ data: undefined, isLoading: false });

        renderWithTooltip(
            <HevyExportGate onDismiss={vi.fn()} onComplete={vi.fn()} />,
        );

        expect(screen.queryByTestId("hevy-export-gate-sign-in-step")).toBeNull();
        expect(screen.getByTestId("hevy-export-gate-key-step")).toBeTruthy();
        expect(screen.getByTestId("hevy-export-gate-key-input")).toBeTruthy();
        expect(screen.getByTestId("hevy-export-gate-step").textContent).toContain("2 of 2");
    });

    it("renders nothing when signed in with Hevy key (parent also hides via derived prereqs)", () => {
        useUserContext.mockReturnValue({
            user: { id: "user-1" } as User,
            isLoading: false,
        });
        useHevySecret.mockReturnValue({ data: "hevy-key", isLoading: false });
        const onComplete = vi.fn();

        renderWithTooltip(
            <HevyExportGate onDismiss={vi.fn()} onComplete={onComplete} />,
        );

        // Already-complete is derived UI hide - toast/latch only from SP3 save event (onComplete).
        expect(onComplete).not.toHaveBeenCalled();
        expect(screen.queryByTestId("hevy-export-gate")).toBeNull();
    });

    it("calls onDismiss from close control", () => {
        useUserContext.mockReturnValue({ user: null, isLoading: false });
        const onDismiss = vi.fn();

        renderWithTooltip(
            <HevyExportGate onDismiss={onDismiss} onComplete={vi.fn()} />,
        );

        fireEvent.click(screen.getByTestId("hevy-export-gate-dismiss"));
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });
});

describe("HevyExportGate inline Hevy key", () => {
    const signedInUser = { id: "user-1" } as User;
    const VALID_KEY = "6f2d4b8e-9c31-4a52-b7f0-1d8e5a3c7b90";

    beforeEach(() => {
        useUserContext.mockReset();
        useMyFeatureLimits.mockReset();
        useHevySecret.mockReset();
        connectHevyKey.mockReset();
        triggerWorkoutHistorySync.mockReset();
        triggerBodyMeasurementsSync.mockReset();
        useMyFeatureLimits.mockReturnValue({ data: null });
        useHevySecret.mockReturnValue({ data: undefined, isLoading: false });
        useUserContext.mockReturnValue({ user: signedInUser, isLoading: false });
        connectHevyKey.mockResolvedValue({ status: "saved" });
    });

    afterEach(() => {
        cleanup();
    });

    function typeKey(value: string) {
        fireEvent.change(screen.getByTestId("hevy-export-gate-key-input"), {
            target: { value },
        });
    }

    it("disables connect until a key is typed", () => {
        renderWithTooltip(<HevyExportGate onDismiss={vi.fn()} onComplete={vi.fn()} />);

        const connect = screen.getByTestId("hevy-export-gate-key-connect") as HTMLButtonElement;
        expect(connect.disabled).toBe(true);

        typeKey(VALID_KEY);
        expect(connect.disabled).toBe(false);
    });

    it("saves a valid key to the vault and completes the gate", async () => {
        const onComplete = vi.fn();
        renderWithTooltip(<HevyExportGate onDismiss={vi.fn()} onComplete={onComplete} />);

        typeKey(VALID_KEY);
        fireEvent.click(screen.getByTestId("hevy-export-gate-key-connect"));

        await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
        expect(connectHevyKey).toHaveBeenCalledWith(
            expect.objectContaining({ user: signedInUser, apiKey: VALID_KEY }),
        );
        expect(triggerWorkoutHistorySync).toHaveBeenCalledTimes(1);
        expect(triggerBodyMeasurementsSync).toHaveBeenCalledTimes(1);
        expect(screen.queryByTestId("hevy-export-gate-key-error")).toBeNull();
    });

    it("keeps the gate open with an error when the key is invalid", async () => {
        connectHevyKey.mockResolvedValue({ status: "invalid_key", message: "Invalid Hevy API Key" });
        const onComplete = vi.fn();
        renderWithTooltip(<HevyExportGate onDismiss={vi.fn()} onComplete={onComplete} />);

        typeKey("not-a-key");
        fireEvent.click(screen.getByTestId("hevy-export-gate-key-connect"));

        await waitFor(() =>
            expect(screen.getByTestId("hevy-export-gate-key-error").textContent).toContain(
                "Invalid Hevy API Key",
            ),
        );
        expect(onComplete).not.toHaveBeenCalled();
        expect(triggerWorkoutHistorySync).not.toHaveBeenCalled();
        expect(screen.getByTestId("hevy-export-gate-key-step")).toBeTruthy();
    });

    it("keeps the gate open when the vault write fails", async () => {
        connectHevyKey.mockResolvedValue({
            status: "failed",
            message: "Error saving Hevy API Key: Unknown error",
        });
        const onComplete = vi.fn();
        renderWithTooltip(<HevyExportGate onDismiss={vi.fn()} onComplete={onComplete} />);

        typeKey(VALID_KEY);
        fireEvent.click(screen.getByTestId("hevy-export-gate-key-connect"));

        await waitFor(() =>
            expect(screen.getByTestId("hevy-export-gate-key-error").textContent).toContain(
                "Error saving Hevy API Key",
            ),
        );
        expect(onComplete).not.toHaveBeenCalled();
        expect(screen.getByTestId("hevy-export-gate")).toBeTruthy();
    });

    it("clears the pasted key from the field after a successful save", async () => {
        const onComplete = vi.fn();
        renderWithTooltip(<HevyExportGate onDismiss={vi.fn()} onComplete={onComplete} />);

        typeKey(VALID_KEY);
        fireEvent.click(screen.getByTestId("hevy-export-gate-key-connect"));

        await waitFor(() => expect(onComplete).toHaveBeenCalled());
        expect((screen.getByTestId("hevy-export-gate-key-input") as HTMLInputElement).value).toBe("");
    });
});

describe("Chat Hevy export gate wiring", () => {
    beforeEach(() => {
        useUserContext.mockReset();
        useMyFeatureLimits.mockReset();
        useHevySecret.mockReset();
        connectHevyKey.mockReset();
        useMyFeatureLimits.mockReturnValue({ data: null });
        useHevySecret.mockReturnValue({ data: undefined, isLoading: false });
        useUserContext.mockReturnValue({ user: null, isLoading: false });
    });

    afterEach(() => {
        cleanup();
    });

    it("hides composer when gate shown", () => {
        renderWithTooltip(
            <Chat
                isLoading={false}
                handleSubmit={vi.fn()}
                handleStop={vi.fn()}
                showSuggestions={false}
                showHevyExportGate
                onHevyExportGateDismiss={vi.fn()}
                onHevyExportGateComplete={vi.fn()}
            />,
        );

        expect(screen.getByTestId("hevy-export-gate")).toBeTruthy();
        expect(screen.queryByTestId("prompt-input")).toBeNull();
    });

    it("keeps questionnaire when both gate and questions set", () => {
        renderWithTooltip(
            <Chat
                isLoading={false}
                handleSubmit={vi.fn()}
                handleStop={vi.fn()}
                showSuggestions={false}
                showHevyExportGate
                questionsPayload={{
                    questions: [
                        {
                            id: "program-length",
                            question: "How long?",
                            options: [{ id: "4", label: "4 weeks" }],
                        },
                    ],
                }}
            />,
        );

        expect(screen.getByTestId("questionnaire")).toBeTruthy();
        expect(screen.queryByTestId("hevy-export-gate")).toBeNull();
        expect(screen.queryByTestId("prompt-input")).toBeNull();
    });

    it("restores composer after dismiss callback clears show flag", () => {
        const { rerender } = renderWithTooltip(
            <Chat
                isLoading={false}
                handleSubmit={vi.fn()}
                handleStop={vi.fn()}
                showSuggestions={false}
                showHevyExportGate
                onHevyExportGateDismiss={vi.fn()}
            />,
        );

        expect(screen.getByTestId("hevy-export-gate")).toBeTruthy();

        rerender(
            <QueryClientProvider client={makeQueryClient()}>
                <TooltipProvider>
                    <Chat
                        isLoading={false}
                        handleSubmit={vi.fn()}
                        handleStop={vi.fn()}
                        showSuggestions={false}
                        showHevyExportGate={false}
                    />
                </TooltipProvider>
            </QueryClientProvider>,
        );

        expect(screen.queryByTestId("hevy-export-gate")).toBeNull();
        expect(screen.getByTestId("prompt-input")).toBeTruthy();
    });
});
