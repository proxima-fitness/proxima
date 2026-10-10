// SPDX-License-Identifier: AGPL-3.0-only

import type { z } from "zod";

import type { TProgramMutationDefinition } from "./types";

export function defineProgramMutation<TSchema extends z.ZodType>(
    config: Omit<TProgramMutationDefinition<TSchema>, "agentExposed"> & {
        agentExposed?: boolean;
    },
): TProgramMutationDefinition<TSchema> {
    return {
        ...config,
        agentExposed: config.agentExposed ?? true,
    };
}
