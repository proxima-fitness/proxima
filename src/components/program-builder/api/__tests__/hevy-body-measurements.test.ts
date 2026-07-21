import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/api/index", () => ({
    supabase: {},
}));

import {
    getHevyBodyMeasurementByDate,
    getHevyBodyMeasurementsPage,
} from "../hevy";
import {
    hevyBodyMeasurementFixture,
    hevyBodyMeasurementsPageFixture,
} from "@/api/__tests__/manual/hevy-body-measurement.fixture";

describe("Hevy body measurements helpers", () => {
    const apiKey = "test-api-key";

    beforeEach(() => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(JSON.stringify(hevyBodyMeasurementsPageFixture), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                }),
            ),
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("getHevyBodyMeasurementsPage parses grill-shaped sample payload", async () => {
        const page = await getHevyBodyMeasurementsPage(apiKey, 1, 10);

        expect(fetch).toHaveBeenCalledWith(
            "https://api.hevyapp.com/v1/body_measurements?page=1&pageSize=10",
            expect.objectContaining({
                method: "GET",
                headers: expect.objectContaining({
                    accept: "application/json",
                    "api-key": apiKey,
                }),
            }),
        );
        expect(page.page).toBe(1);
        expect(page.page_count).toBe(1);
        expect(page.body_measurements).toHaveLength(1);
        expect(page.body_measurements[0]).toEqual(hevyBodyMeasurementFixture);
        expect(page.body_measurements[0].weight_kg).toBe(80.5);
        expect(page.body_measurements[0].waist).toBe(80);
        expect(page.body_measurements[0].left_bicep_cm).toBe(35);
    });

    it("getHevyBodyMeasurementByDate fetches and parses single entry", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(JSON.stringify(hevyBodyMeasurementFixture), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                }),
            ),
        );

        const entry = await getHevyBodyMeasurementByDate(apiKey, "2024-08-14");

        expect(fetch).toHaveBeenCalledWith(
            "https://api.hevyapp.com/v1/body_measurements/2024-08-14",
            expect.objectContaining({ method: "GET" }),
        );
        expect(entry.date).toBe("2024-08-14");
        expect(entry.lean_mass_kg).toBe(65);
        expect(entry.fat_percent).toBe(18.5);
    });
});
