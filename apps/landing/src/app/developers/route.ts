// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module developers
 *
 * Interactive Public API reference (ADR 0026 / 03). Loads `/openapi.json`.
 * Standalone Scalar document at `/developers`.
 *
 * Depends on: @scalar/nextjs-api-reference
 * Used by: developers and agents exploring the Public API
 */

import { ApiReference } from "@scalar/nextjs-api-reference";

export const GET = ApiReference({
    url: "/openapi.json",
    pageTitle: "Proxima Public API",
});
