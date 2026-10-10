// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/**
 * @module program-builder/shared/agent/AgenticMemoryPeekHost
 *
 * Chat-footer host for AgenticMemoryPeek: loads Constraint + Training + latest
 * body measurement via React Query and passes props into the peek.
 *
 * Depends on: useUserConstraints, useUserTrainingProfile, useLatestBodyMeasurement,
 *   usePoundsOrKgContext, AgenticMemoryPeek
 * Used by: Chat
 */

import type { User } from "@supabase/supabase-js";

import {
    useLatestBodyMeasurement,
    useUserConstraints,
    useUserTrainingProfile,
} from "@/api/hooks";
import { AgenticMemoryPeek } from "@/components/program-builder/shared/agent/AgenticMemoryPeek";
import { usePoundsOrKgContext } from "@/contexts/PoundsOrKgContext";

export interface IAgenticMemoryPeekHostProps {
    user: User;
    className?: string;
}

/** Signed-in Agentic memory peek with live query data. */
export function AgenticMemoryPeekHost({
    user,
    className,
}: IAgenticMemoryPeekHostProps) {
    const { isInLbs } = usePoundsOrKgContext();
    const constraints = useUserConstraints(user);
    const training = useUserTrainingProfile(user);
    const latestBody = useLatestBodyMeasurement(user);

    return (
        <AgenticMemoryPeek
            constraintProfile={constraints.data ?? null}
            trainingProfile={training.data ?? null}
            latestBodyMeasurement={latestBody.data ?? null}
            isLoading={
                constraints.isLoading || training.isLoading || latestBody.isLoading
            }
            isError={
                constraints.isError || training.isError || latestBody.isError
            }
            isInLbs={isInLbs}
            className={className}
        />
    );
}
