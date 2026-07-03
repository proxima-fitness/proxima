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
    };
    /** Free-form constraints detected mid-conversation, e.g. "no overhead pressing", "prefer dumbbells". */
    chatRefinements: string[];
};
