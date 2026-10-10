// SPDX-License-Identifier: AGPL-3.0-only

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
    usePathname: () => "/build-program",
    useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

import { UpgradeBanner } from "../upgrade-banner";
import { UPGRADE_BANNER_DISMISSED_KEY } from "../upgrade-banner-dismiss";

beforeEach(() => {
    localStorage.removeItem(UPGRADE_BANNER_DISMISSED_KEY);
});

afterEach(() => {
    cleanup();
    localStorage.removeItem(UPGRADE_BANNER_DISMISSED_KEY);
});

describe("UpgradeBanner mobile dismiss", () => {
    it("dismisses on mobile and stays gone until credits hit 0", () => {
        const { rerender } = render(
            <UpgradeBanner
                remainingRequests={4}
                totalRequests={10}
                enableMobileDismiss
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Dismiss upgrade banner" }));
        expect(localStorage.getItem(UPGRADE_BANNER_DISMISSED_KEY)).toBe("1");
        expect(screen.getByText("4 credits left").closest("div.mx-auto")?.className).toContain(
            "max-sm:hidden",
        );

        rerender(
            <UpgradeBanner
                remainingRequests={0}
                totalRequests={10}
                enableMobileDismiss
                exhaustedMessage="You have run out of credits."
            />,
        );

        expect(screen.getByText("You have run out of credits.")).toBeTruthy();
        expect(screen.queryByRole("button", { name: "Dismiss upgrade banner" })).toBeNull();
        expect(
            screen.getByText("You have run out of credits.").closest("div.mx-auto")?.className,
        ).not.toContain("max-sm:hidden");
    });

    it("does not offer dismiss when already out of credits", () => {
        render(
            <UpgradeBanner
                remainingRequests={0}
                totalRequests={10}
                enableMobileDismiss
            />,
        );

        expect(screen.queryByRole("button", { name: "Dismiss upgrade banner" })).toBeNull();
        expect(screen.getByText("You have run out of credits")).toBeTruthy();
    });
});
