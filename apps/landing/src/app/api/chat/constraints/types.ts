// SPDX-License-Identifier: AGPL-3.0-only

export type TConstraintProfile = {
    injuries: string[];
    excludedEquipment: string[];
    excludedAreas: string[];
    preferences: {
        splitType: string;
        exerciseVariability: string;
        progressionSystem: string;
        deloadWeek: string;
        peakWeek: string;
        warmupExercises: string;
    };
};
