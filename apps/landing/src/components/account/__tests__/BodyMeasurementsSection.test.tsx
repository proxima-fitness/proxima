// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import type { ReactNode } from "react";

import type { TBodyMeasurementRow } from "@/api/body-measurements-read";
import { HEVY_BODY_MEASUREMENT_SOURCE } from "@/api/body-measurements";
import { hevyBodyMeasurementFixture } from "@/api/__tests__/manual/hevy-body-measurement.fixture";

const useLatestBodyMeasurement = vi.fn();
const useBodyMeasurementsHistory = vi.fn();
const useHevySecret = vi.fn();

vi.mock("@/api/hooks", () => ({
    useLatestBodyMeasurement: (...args: unknown[]) => useLatestBodyMeasurement(...args),
    useBodyMeasurementsHistory: (...args: unknown[]) => useBodyMeasurementsHistory(...args),
    useHevySecret: (...args: unknown[]) => useHevySecret(...args),
}));

vi.mock("@/components/header/ConnectHevyDialog", () => ({
    ConnectHevyDialog: () => null,
}));

import { BodyMeasurementsSection } from "../BodyMeasurementsSection";
import {
    buildBodyMeasurementDisplayRows,
    formatBodyMassKg,
    formatGirthCm,
} from "../body-measurements-display";

const user = { id: "user-1" } as User;

function measurementFixture(
    overrides: Partial<TBodyMeasurementRow> = {},
): TBodyMeasurementRow {
    return {
        id: "bm-1",
        user_id: "user-1",
        source: HEVY_BODY_MEASUREMENT_SOURCE,
        external_id: hevyBodyMeasurementFixture.date,
        measured_on: hevyBodyMeasurementFixture.date,
        weight_kg: hevyBodyMeasurementFixture.weight_kg ?? null,
        lean_mass_kg: hevyBodyMeasurementFixture.lean_mass_kg ?? null,
        fat_percent: hevyBodyMeasurementFixture.fat_percent ?? null,
        neck_cm: hevyBodyMeasurementFixture.neck_cm ?? null,
        shoulder_cm: hevyBodyMeasurementFixture.shoulder_cm ?? null,
        chest_cm: hevyBodyMeasurementFixture.chest_cm ?? null,
        left_bicep_cm: hevyBodyMeasurementFixture.left_bicep_cm ?? null,
        right_bicep_cm: hevyBodyMeasurementFixture.right_bicep_cm ?? null,
        left_forearm_cm: hevyBodyMeasurementFixture.left_forearm_cm ?? null,
        right_forearm_cm: hevyBodyMeasurementFixture.right_forearm_cm ?? null,
        abdomen: hevyBodyMeasurementFixture.abdomen ?? null,
        waist: hevyBodyMeasurementFixture.waist ?? null,
        hips: hevyBodyMeasurementFixture.hips ?? null,
        left_thigh: hevyBodyMeasurementFixture.left_thigh ?? null,
        right_thigh: hevyBodyMeasurementFixture.right_thigh ?? null,
        left_calf: hevyBodyMeasurementFixture.left_calf ?? null,
        right_calf: hevyBodyMeasurementFixture.right_calf ?? null,
        created_at: "2024-08-14T00:00:00Z",
        updated_at: "2024-08-14T00:00:00Z",
        ...overrides,
    };
}

function renderSection(ui: ReactNode) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("body-measurements-display", () => {
    it("formats mass and girth for lbs preference", () => {
        expect(formatBodyMassKg(80.5, true)).toMatch(/lbs$/);
        expect(formatGirthCm(38, true)).toMatch(/in$/);
    });

    it("formats mass and girth for kg preference", () => {
        expect(formatBodyMassKg(80.5, false)).toBe("80.5 kg");
        expect(formatGirthCm(38, false)).toBe("38 cm");
    });

    it("builds display rows from fixture (non-null only)", () => {
        const rows = buildBodyMeasurementDisplayRows(measurementFixture(), false);
        expect(rows.find((r) => r.label === "Weight")?.value).toBe("80.5 kg");
        expect(rows.find((r) => r.label === "Body fat")?.value).toBe("18.5%");
        expect(rows.some((r) => r.label === "Chest")).toBe(true);
    });
});

describe("BodyMeasurementsSection", () => {
    beforeEach(() => {
        useLatestBodyMeasurement.mockReset();
        useBodyMeasurementsHistory.mockReset();
        useHevySecret.mockReset();
        useHevySecret.mockReturnValue({
            data: null,
            isLoading: false,
            isError: false,
        });
    });

    afterEach(() => {
        cleanup();
    });

    it("shows loading spinner while data loads", () => {
        useLatestBodyMeasurement.mockReturnValue({
            data: undefined,
            isLoading: true,
            isError: false,
        });
        useBodyMeasurementsHistory.mockReturnValue({
            data: undefined,
            isLoading: true,
            isError: false,
        });

        renderSection(<BodyMeasurementsSection user={user} />);

        expect(document.querySelector(".animate-spin")).toBeTruthy();
        expect(screen.queryByTestId("body-measurements-empty-state")).toBeNull();
        expect(screen.queryByTestId("body-measurements-section")).toBeNull();
    });

    it("shows empty state pointing to Connect Hevy when no backup", () => {
        useLatestBodyMeasurement.mockReturnValue({
            data: null,
            isLoading: false,
            isError: false,
        });
        useBodyMeasurementsHistory.mockReturnValue({
            data: { measurements: [], nextCursor: null },
            isLoading: false,
            isError: false,
        });

        renderSection(<BodyMeasurementsSection user={user} />);

        expect(screen.getByTestId("body-measurements-empty-state")).toBeTruthy();
        expect(screen.getByRole("button", { name: "Connect Hevy" })).toBeTruthy();
        expect(screen.queryByRole("button", { name: /save/i })).toBeNull();
        expect(screen.getByText(/no manual entry/i)).toBeTruthy();
    });

    it("shows empty state without Connect CTA when Hevy connected but no rows", () => {
        useHevySecret.mockReturnValue({
            data: "fake-hevy-key",
            isLoading: false,
            isError: false,
        });
        useLatestBodyMeasurement.mockReturnValue({
            data: null,
            isLoading: false,
            isError: false,
        });
        useBodyMeasurementsHistory.mockReturnValue({
            data: { measurements: [], nextCursor: null },
            isLoading: false,
            isError: false,
        });

        renderSection(<BodyMeasurementsSection user={user} />);

        expect(screen.getByTestId("body-measurements-empty-state")).toBeTruthy();
        expect(screen.queryByRole("button", { name: "Connect Hevy" })).toBeNull();
        expect(screen.getByText(/sync from Hevy/i)).toBeTruthy();
    });

    it("renders latest fixture summary and prior history", () => {
        const latest = measurementFixture();
        const older = measurementFixture({
            id: "bm-2",
            measured_on: "2024-07-01",
            external_id: "2024-07-01",
            weight_kg: 82,
            lean_mass_kg: null,
            fat_percent: null,
            neck_cm: null,
            shoulder_cm: null,
            chest_cm: null,
            left_bicep_cm: null,
            right_bicep_cm: null,
            left_forearm_cm: null,
            right_forearm_cm: null,
            abdomen: null,
            waist: null,
            hips: null,
            left_thigh: null,
            right_thigh: null,
            left_calf: null,
            right_calf: null,
        });

        useLatestBodyMeasurement.mockReturnValue({
            data: latest,
            isLoading: false,
            isError: false,
        });
        useBodyMeasurementsHistory.mockReturnValue({
            data: { measurements: [latest, older], nextCursor: null },
            isLoading: false,
            isError: false,
        });

        renderSection(<BodyMeasurementsSection user={user} />);

        expect(screen.getByTestId("body-measurements-section")).toBeTruthy();
        expect(screen.getByTestId("body-measurements-latest")).toBeTruthy();
        expect(screen.getByText("Weight")).toBeTruthy();
        expect(screen.getByText("Body fat")).toBeTruthy();
        expect(screen.getByTestId("body-measurements-history").textContent).toContain(
            "Jul 1, 2024",
        );
        expect(screen.queryByRole("button", { name: /save/i })).toBeNull();
    });
});
