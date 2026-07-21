/**
 * @module chat/training-profile/merge
 *
 * Merges persisted Training profile (DB) with session profile (questionnaire body).
 * Session wins when non-empty; otherwise keep persisted. No Mutation constraint gate.
 *
 * Depends on: TTrainingProfile
 * Used by: chat route
 */

/**
 * When `persisted` is null: returns session (first-time / anon seed).
 * When `persisted` is non-null: scalar fields — session non-empty wins; else persisted.
 */
export function mergeTrainingProfiles(
    persisted: TTrainingProfile | null,
    session: TTrainingProfile,
): TTrainingProfile {
    if (!persisted) return session;

    return {
        age: session.age ?? persisted.age,
        sex: session.sex || persisted.sex,
        heightCm: session.heightCm ?? persisted.heightCm,
        experienceLevel: session.experienceLevel || persisted.experienceLevel,
        physiquePhase: session.physiquePhase || persisted.physiquePhase,
        trainingFocus: session.trainingFocus || persisted.trainingFocus,
        activityLevel: session.activityLevel || persisted.activityLevel,
        sessionDurationMin: session.sessionDurationMin ?? persisted.sessionDurationMin,
    };
}
