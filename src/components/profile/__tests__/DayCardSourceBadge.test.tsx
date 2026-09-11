/**
 * Day card source badge tooltips on Week preview cards.
 */
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DayCardSourceBadge } from "../DayCardSourceBadge";
import { DAY_CARD_SOURCE_TOOLTIPS } from "../WeekPreviewSources";

describe("DayCardSourceBadge", () => {
    afterEach(() => {
        cleanup();
    });

    it("exposes each source with a positive tooltip in the accessible name", () => {
        render(
            <>
                <DayCardSourceBadge source="Planned" />
                <DayCardSourceBadge source="In Hevy" />
                <DayCardSourceBadge source="Completed" />
            </>,
        );

        expect(
            screen.getByLabelText(`Planned: ${DAY_CARD_SOURCE_TOOLTIPS.Planned}`),
        ).toBeTruthy();
        expect(
            screen.getByLabelText(`In Hevy: ${DAY_CARD_SOURCE_TOOLTIPS["In Hevy"]}`),
        ).toBeTruthy();
        expect(
            screen.getByLabelText(`Completed: ${DAY_CARD_SOURCE_TOOLTIPS.Completed}`),
        ).toBeTruthy();
    });
});
