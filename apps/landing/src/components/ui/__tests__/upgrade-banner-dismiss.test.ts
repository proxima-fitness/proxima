import { afterEach, describe, expect, it } from "vitest";

import {
    readUpgradeBannerDismissed,
    shouldHideUpgradeBannerOnMobile,
    UPGRADE_BANNER_DISMISSED_KEY,
    writeUpgradeBannerDismissed,
} from "../upgrade-banner-dismiss";

afterEach(() => {
    localStorage.removeItem(UPGRADE_BANNER_DISMISSED_KEY);
});

describe("shouldHideUpgradeBannerOnMobile", () => {
    it("stays visible when dismiss is disabled", () => {
        expect(
            shouldHideUpgradeBannerOnMobile({
                enableMobileDismiss: false,
                dismissed: true,
                remainingRequests: 4,
            }),
        ).toBe(false);
    });

    it("hides after dismiss while credits remain", () => {
        expect(
            shouldHideUpgradeBannerOnMobile({
                enableMobileDismiss: true,
                dismissed: true,
                remainingRequests: 4,
            }),
        ).toBe(true);
    });

    it("shows again at 0 credits even if dismissed", () => {
        expect(
            shouldHideUpgradeBannerOnMobile({
                enableMobileDismiss: true,
                dismissed: true,
                remainingRequests: 0,
            }),
        ).toBe(false);
    });

    it("stays visible when not dismissed", () => {
        expect(
            shouldHideUpgradeBannerOnMobile({
                enableMobileDismiss: true,
                dismissed: false,
                remainingRequests: 4,
            }),
        ).toBe(false);
    });
});

describe("upgrade banner dismiss storage", () => {
    it("reads false when unset and persists a dismiss", () => {
        expect(readUpgradeBannerDismissed()).toBe(false);
        writeUpgradeBannerDismissed(true);
        expect(localStorage.getItem(UPGRADE_BANNER_DISMISSED_KEY)).toBe("1");
        expect(readUpgradeBannerDismissed()).toBe(true);
    });

    it("clears the flag when written false", () => {
        writeUpgradeBannerDismissed(true);
        writeUpgradeBannerDismissed(false);
        expect(localStorage.getItem(UPGRADE_BANNER_DISMISSED_KEY)).toBeNull();
        expect(readUpgradeBannerDismissed()).toBe(false);
    });
});
