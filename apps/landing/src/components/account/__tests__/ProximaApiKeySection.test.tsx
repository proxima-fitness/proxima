import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import type { ReactNode } from "react";

const useUserContext = vi.fn();
const useHasProximaApiKey = vi.fn();

vi.mock("@/contexts/UserContext", () => ({
    useUserContext: () => useUserContext(),
}));

vi.mock("@/api/hooks", () => ({
    PROXIMA_API_KEY_PRESENCE_QUERY_KEY: ["proxima_api_key_present"],
    useHasProximaApiKey: (...args: unknown[]) => useHasProximaApiKey(...args),
}));

vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

import { ProximaApiKeySection } from "../ProximaApiKeySection";

const USER = { id: "11111111-1111-4111-8111-111111111111" } as User;
const KEY = "pxa_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function renderSection(ui: ReactNode) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("ProximaApiKeySection", () => {
    beforeEach(() => {
        useUserContext.mockReset();
        useHasProximaApiKey.mockReset();
        useUserContext.mockReturnValue({ user: USER });
        vi.stubGlobal("fetch", vi.fn());
        vi.stubGlobal("navigator", {
            ...navigator,
            clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
        });
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it("offers create when no key is on file", () => {
        useHasProximaApiKey.mockReturnValue({ data: false, isLoading: false });

        renderSection(<ProximaApiKeySection />);

        expect(screen.getByRole("button", { name: "Create Proxima API key" })).toBeTruthy();
        expect(screen.queryByLabelText("Proxima API key")).toBeNull();
    });

    it("shows the minted key once and copies it", async () => {
        useHasProximaApiKey.mockReturnValue({ data: false, isLoading: false });
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => ({ key: KEY }),
        } as Response);

        renderSection(<ProximaApiKeySection />);
        fireEvent.click(screen.getByRole("button", { name: "Create Proxima API key" }));

        expect(await screen.findByDisplayValue(KEY)).toBeTruthy();
        expect(screen.getByText("Copy this now. We will not show it again.")).toBeTruthy();

        fireEvent.click(screen.getByRole("button", { name: "Copy Proxima API key" }));
        await waitFor(() => {
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(KEY);
        });
    });

    it("does not echo a key when one is already on file", () => {
        useHasProximaApiKey.mockReturnValue({ data: true, isLoading: false });

        renderSection(<ProximaApiKeySection />);

        expect(screen.getByText(/A key is on file/)).toBeTruthy();
        expect(screen.queryByLabelText("Proxima API key")).toBeNull();
        expect(screen.getByRole("button", { name: "Replace key" })).toBeTruthy();
        expect(screen.getByRole("button", { name: "Revoke" })).toBeTruthy();
    });
});
