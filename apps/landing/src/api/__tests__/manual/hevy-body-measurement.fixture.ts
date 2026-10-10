/**
 * Sample Hevy body-measurement payload shaped like the grill / OpenAPI BodyMeasurement.
 * Used by import mapping tests and Hevy parse helpers.
 */
export const hevyBodyMeasurementFixture: THevyBodyMeasurement = {
    date: "2024-08-14",
    weight_kg: 80.5,
    lean_mass_kg: 65,
    fat_percent: 18.5,
    neck_cm: 38,
    shoulder_cm: 115,
    chest_cm: 95,
    left_bicep_cm: 35,
    right_bicep_cm: 35.5,
    left_forearm_cm: 28,
    right_forearm_cm: 28.5,
    abdomen: 85,
    waist: 80,
    hips: 95,
    left_thigh: 55,
    right_thigh: 55.5,
    left_calf: 37,
    right_calf: 37.5,
};

export const hevyBodyMeasurementsPageFixture: THevyBodyMeasurementsResponse = {
    page: 1,
    page_count: 1,
    body_measurements: [hevyBodyMeasurementFixture],
};
