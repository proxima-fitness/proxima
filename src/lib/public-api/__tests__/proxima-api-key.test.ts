import { describe, expect, it, vi } from "vitest";

import {
    hasProximaApiKey,
    mintProximaApiKey,
    parseBearerToken,
    proximaApiKeySecretName,
    resolveProximaApiKeyUserId,
    revokeProximaApiKey,
    type TProximaApiKeyDb,
} from "../proxima-api-key";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const KEY = "pxa_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function asDb(mock: unknown): TProximaApiKeyDb {
    return mock as TProximaApiKeyDb;
}

function vaultClient(result: { data: string | null; error: { message: string } | null }) {
    return asDb({
        rpc: vi.fn(async () => result),
    });
}

describe("proximaApiKeySecretName", () => {
    it("is a proxima_api_key vault row, not a Hevy or public_api_key name", () => {
        expect(proximaApiKeySecretName(USER_ID)).toBe(`proxima_api_key_${USER_ID}`);
        expect(proximaApiKeySecretName(USER_ID)).not.toContain("hevy_api_key");
        expect(proximaApiKeySecretName(USER_ID)).not.toContain("public_api_key");
    });
});

describe("parseBearerToken", () => {
    it("returns null when the Authorization header is missing", () => {
        expect(parseBearerToken(null)).toBeNull();
        expect(parseBearerToken(undefined)).toBeNull();
        expect(parseBearerToken("")).toBeNull();
    });

    it("reads Bearer and rejects other schemes", () => {
        expect(parseBearerToken(`Bearer ${KEY}`)).toBe(KEY);
        expect(parseBearerToken(`bearer ${KEY}`)).toBe(KEY);
        expect(parseBearerToken(`Basic ${KEY}`)).toBeNull();
        expect(parseBearerToken(KEY)).toBeNull();
    });
});

describe("resolveProximaApiKeyUserId", () => {
    it("returns null for a missing Authorization header", async () => {
        const rpc = vi.fn();
        const userId = await resolveProximaApiKeyUserId(asDb({ rpc }), null);

        expect(userId).toBeNull();
        expect(rpc).not.toHaveBeenCalled();
    });

    it("returns null for an unknown Proxima API key", async () => {
        const client = vaultClient({ data: null, error: null });
        const userId = await resolveProximaApiKeyUserId(
            client,
            `Bearer ${KEY}`,
        );

        expect(userId).toBeNull();
        expect(client.rpc).toHaveBeenCalledWith("resolve_proxima_api_key", {
            p_secret: KEY,
        });
    });

    it("maps a valid Bearer token to that athlete and to no one else", async () => {
        const client = vaultClient({ data: USER_ID, error: null });
        const userId = await resolveProximaApiKeyUserId(
            client,
            `Bearer ${KEY}`,
        );

        expect(userId).toBe(USER_ID);
        expect(client.rpc).toHaveBeenCalledWith("resolve_proxima_api_key", {
            p_secret: KEY,
        });
    });

    it("returns null when the vault lookup fails", async () => {
        const userId = await resolveProximaApiKeyUserId(
            vaultClient({ data: null, error: { message: "vault down" } }),
            `Bearer ${KEY}`,
        );

        expect(userId).toBeNull();
    });
});

describe("hasProximaApiKey", () => {
    it("uses read_secret and treats a non-empty string as present", async () => {
        const rpc = vi.fn(async () => ({ data: KEY, error: null }));

        expect(await hasProximaApiKey(asDb({ rpc }), USER_ID)).toBe(true);
        expect(rpc).toHaveBeenCalledWith("read_secret", {
            secret_name: `proxima_api_key_${USER_ID}`,
        });
        expect(await hasProximaApiKey(asDb({
            rpc: vi.fn(async () => ({ data: null, error: { message: "missing" } })),
        }), USER_ID)).toBe(false);
        expect(await hasProximaApiKey(asDb({
            rpc: vi.fn(async () => ({ data: "   ", error: null })),
        }), USER_ID)).toBe(false);
    });
});

describe("mintProximaApiKey", () => {
    it("delete-then-insert via the Hevy vault RPCs, with a proxima_api_key name", async () => {
        const rpc = vi.fn(async (fn: string) => {
            if (fn === "delete_secret") return { data: "secret deleted", error: null };
            if (fn === "insert_secret") return { data: "secret-id", error: null };
            return { data: null, error: { message: `unexpected ${fn}` } };
        });

        const key = await mintProximaApiKey(asDb({ rpc }), USER_ID);

        expect(key).toMatch(/^pxa_[0-9a-f]{64}$/);
        expect(rpc).toHaveBeenNthCalledWith(1, "delete_secret", {
            secret_name: `proxima_api_key_${USER_ID}`,
        });
        expect(rpc).toHaveBeenNthCalledWith(2, "insert_secret", {
            secret: key,
            secret_name: `proxima_api_key_${USER_ID}`,
        });
    });
});

describe("revokeProximaApiKey", () => {
    it("deletes the proxima_api_key vault name for that user", async () => {
        const rpc = vi.fn(async () => ({ data: "secret deleted", error: null }));

        await expect(revokeProximaApiKey(asDb({ rpc }), USER_ID)).resolves.toBe(true);
        expect(rpc).toHaveBeenCalledWith("delete_secret", {
            secret_name: `proxima_api_key_${USER_ID}`,
        });
    });
});
