// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module upgrade-banner-dismiss
 * Persist mobile dismiss of the upgrade banner until remaining credits hit 0.
 * Depends on: localStorage. Used by: UpgradeBanner.
 */

/** Versioned localStorage key — store only the dismissed flag. */
export const UPGRADE_BANNER_DISMISSED_KEY = "upgrade-banner-dismissed:v1";

/** Read whether the user dismissed the mobile upgrade banner. */
export function readUpgradeBannerDismissed(): boolean {
    try {
        return localStorage.getItem(UPGRADE_BANNER_DISMISSED_KEY) === "1";
    } catch {
        return false;
    }
}

/**
 * Persist mobile dismiss. Cleared only by an explicit write(false); hitting 0
 * credits re-shows the banner without wiping this flag.
 * @param dismissed - Whether the banner should stay hidden while credits remain.
 */
export function writeUpgradeBannerDismissed(dismissed: boolean): void {
    try {
        if (dismissed) {
            localStorage.setItem(UPGRADE_BANNER_DISMISSED_KEY, "1");
            return;
        }
        localStorage.removeItem(UPGRADE_BANNER_DISMISSED_KEY);
    } catch {
        // ignore quota / private mode
    }
}

/**
 * Mobile-only hide: dismissed and still have credits. At 0 credits the banner
 * always shows so the upgrade CTA is available.
 * @param enableMobileDismiss - Caller opted into mobile dismiss (build-program chat).
 * @param dismissed - Stored dismiss preference.
 * @param remainingRequests - Credits left.
 */
export function shouldHideUpgradeBannerOnMobile({
    enableMobileDismiss,
    dismissed,
    remainingRequests,
}: {
    enableMobileDismiss: boolean;
    dismissed: boolean;
    remainingRequests: number;
}): boolean {
    return enableMobileDismiss && dismissed && remainingRequests > 0;
}
