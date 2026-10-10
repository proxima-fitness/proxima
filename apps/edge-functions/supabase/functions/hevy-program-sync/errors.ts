// SPDX-License-Identifier: AGPL-3.0-only

// Custom error class for HTTP-aware errors
export class HttpError extends Error {
    constructor(message: string, public statusCode: number) {
        super(message);
        this.name = 'HttpError';
    }
}