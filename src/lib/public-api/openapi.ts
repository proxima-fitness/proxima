/**
 * @module lib/public-api/openapi
 *
 * Re-exports the spec from `npm run openapi:generate`. Do not hand-edit
 * `openapi.generated.json`.
 *
 * Depends on: ./openapi.generated.json
 * Used by: GET /openapi.json, Scalar at /scalar
 */

import spec from "./openapi.generated.json";

export const PUBLIC_API_OPENAPI = spec;
