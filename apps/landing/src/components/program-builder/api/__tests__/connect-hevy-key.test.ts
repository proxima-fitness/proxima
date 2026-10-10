// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { QueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";

const postHevyApikey = vi.fn();
const updateHevyApiKey = vi.fn();

vi.mock("../hevy", () => ({
    postHevyApikey: (...args: unknown[]) => postHevyApikey(...args),
    updateHevyApiKey: (...args: unknown[]) => updateHevyApiKey(...args),
}));

import { connectHevyKey, INVALID_HEVY_API_KEY_MESSAGE } from "../connect-hevy-key";

const VALID_KEY = "6f2d4b8e-9c31-4a52-b7f0-1d8e5a3c7b90";
const USER = { id: "user-1" } as User;

/** Minimal stand-in - connectHevyKey only ever calls invalidateQueries. */
function makeQueryClient(): QueryClient {
    return { invalidateQueries: vi.fn() } as Pick<QueryClient, "invalidateQueries"> as QueryClient;
}

describe("connectHevyKey", () => {
    beforeEach(() => {
        postHevyApikey.mockReset();
        updateHevyApiKey.mockReset();
    });

    it("inserts and invalidates dependent queries when no key exists", async () => {
        postHevyApikey.mockResolvedValue({ success: true, data: 1 });
        const queryClient = makeQueryClient();

        const result = await connectHevyKey({ user: USER, apiKey: VALID_KEY, queryClient });

        expect(result).toEqual({ status: "saved" });
        expect(postHevyApikey).toHaveBeenCalledWith(USER, VALID_KEY);
        expect(updateHevyApiKey).not.toHaveBeenCalled();
        expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["hevy_api_key"] });
        expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
            queryKey: ["exercise-stalls-analysis", USER.id],
        });
    });

    it("rotates through update when a key already exists", async () => {
        updateHevyApiKey.mockResolvedValue(true);
        const queryClient = makeQueryClient();

        const result = await connectHevyKey({
            user: USER,
            apiKey: VALID_KEY,
            existingApiKey: "old-key",
            queryClient,
        });

        expect(result).toEqual({ status: "saved" });
        expect(updateHevyApiKey).toHaveBeenCalledWith(USER, VALID_KEY);
        expect(postHevyApikey).not.toHaveBeenCalled();
    });

    it("trims the pasted value before writing", async () => {
        postHevyApikey.mockResolvedValue({ success: true });
        const queryClient = makeQueryClient();

        const result = await connectHevyKey({
            user: USER,
            apiKey: `  ${VALID_KEY}\n`,
            queryClient,
        });

        expect(result).toEqual({ status: "saved" });
        expect(postHevyApikey).toHaveBeenCalledWith(USER, VALID_KEY);
    });

    it("rejects a non-uuid key without touching the vault", async () => {
        const queryClient = makeQueryClient();

        const result = await connectHevyKey({ user: USER, apiKey: "not-a-key", queryClient });

        expect(result).toEqual({ status: "invalid_key", message: INVALID_HEVY_API_KEY_MESSAGE });
        expect(postHevyApikey).not.toHaveBeenCalled();
        expect(updateHevyApiKey).not.toHaveBeenCalled();
        expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    });

    it("reports a failed insert without invalidating queries", async () => {
        postHevyApikey.mockResolvedValue({ success: false, data: { message: "vault down" } });
        const queryClient = makeQueryClient();

        const result = await connectHevyKey({ user: USER, apiKey: VALID_KEY, queryClient });

        expect(result.status).toBe("failed");
        expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    });

    it("reports a failed rotation", async () => {
        updateHevyApiKey.mockResolvedValue(false);
        const queryClient = makeQueryClient();

        const result = await connectHevyKey({
            user: USER,
            apiKey: VALID_KEY,
            existingApiKey: "old-key",
            queryClient,
        });

        expect(result.status).toBe("failed");
        expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    });

    it("does not write for an anonymous caller", async () => {
        const queryClient = makeQueryClient();

        const result = await connectHevyKey({ user: null, apiKey: VALID_KEY, queryClient });

        expect(result.status).toBe("failed");
        expect(postHevyApikey).not.toHaveBeenCalled();
    });

    it("never echoes the key back in a result message", async () => {
        postHevyApikey.mockResolvedValue({ success: false, data: { hint: "retry" } });
        const queryClient = makeQueryClient();

        const failed = await connectHevyKey({ user: USER, apiKey: VALID_KEY, queryClient });
        const invalid = await connectHevyKey({ user: USER, apiKey: "nope", queryClient });

        expect(failed.status === "failed" && failed.message.includes(VALID_KEY)).toBe(false);
        expect(invalid.status === "invalid_key" && invalid.message.includes("nope")).toBe(false);
    });
});
