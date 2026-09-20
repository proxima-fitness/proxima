/**
 * @module scalar
 *
 * Interactive Public API reference (ADR 0026 / 03). Loads `/openapi.json`.
 *
 * Depends on: @scalar/nextjs-api-reference
 * Used by: developers and agents exploring the Public API
 */

import { ApiReference } from "@scalar/nextjs-api-reference";

export const GET = ApiReference({
    url: "/openapi.json",
});
