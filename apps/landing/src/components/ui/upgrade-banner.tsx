// SPDX-License-Identifier: AGPL-3.0-only

"use client"

/**
 * @module upgrade-banner
 * Banner showing credits remaining and CTA to upgrade or sign in.
 * Callers may pass custom CTA/exhausted copy (e.g. Pro tier at 0 credits → upgrade to Pro+).
 * On mobile, enableMobileDismiss hides the banner until remaining credits hit 0.
 * Depends on: next/link, @/components/ui/button, progress, @supabase/supabase-js,
 * upgrade-banner-dismiss.
 * Used by: build-program Chat (Free always; Pro only when out of credits; Pro+ hidden).
 */
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { User } from "@supabase/supabase-js"
import { useState, useCallback } from "react"
import { buildAuthLoginHref } from "@/lib/sign-in-return"
import {
  readUpgradeBannerDismissed,
  shouldHideUpgradeBannerOnMobile,
  writeUpgradeBannerDismissed,
} from "@/components/ui/upgrade-banner-dismiss"

/**
 * @property remainingRequests - Credits left; when 0, copy uses exhaustedMessage or default.
 * @property totalRequests - Total quota for progress bar (used = total - remaining).
 * @property user - If set, CTA uses upgradeButtonLabel (default "Upgrade Plan", → /pricing); else "Sign in".
 * @property upgradeButtonLabel - Optional logged-in CTA label (e.g. "Upgrade to Pro+").
 * @property exhaustedMessage - Optional line when remainingRequests === 0 (overrides default exhausted copy).
 * @property enableMobileDismiss - When true, narrow viewports can dismiss the banner until credits hit 0.
 */
interface IUpgradeBannerProps {
  remainingRequests: number
  totalRequests: number
  user?: User | null
  upgradeButtonLabel?: string
  exhaustedMessage?: string
  enableMobileDismiss?: boolean
}

/** Renders progress bar and primary CTA (Upgrade or Sign in). */
export function UpgradeBanner({
  remainingRequests,
  totalRequests,
  user,
  upgradeButtonLabel = "Upgrade Plan",
  exhaustedMessage,
  enableMobileDismiss = false,
}: IUpgradeBannerProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const loginHref = buildAuthLoginHref(pathname, searchParams)
  const usedPercentage = ((totalRequests - remainingRequests) / totalRequests) * 100
  const exhaustedCopy =
    remainingRequests === 0
      ? exhaustedMessage ?? "You have run out of credits"
      : null

  // Lazy init OK: banner mounts after client featureLimits fetch, not in SSR HTML.
  const [dismissed, setDismissed] = useState(() =>
    enableMobileDismiss ? readUpgradeBannerDismissed() : false
  )

  const dismissMobile = useCallback(() => {
    writeUpgradeBannerDismissed(true)
    setDismissed(true)
  }, [])

  const ctaLink = user ? (
    <Link href="/pricing">{upgradeButtonLabel}</Link>
  ) : (
    <Link href={loginHref}>Sign in</Link>
  )

  const hideOnMobile = shouldHideUpgradeBannerOnMobile({
    enableMobileDismiss,
    dismissed,
    remainingRequests,
  })
  const showDismiss = enableMobileDismiss && remainingRequests > 0

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-4xl px-3 max-sm:pb-2 md:px-5 max-sm:px-4",
        hideOnMobile && "max-sm:hidden"
      )}
    >
      <div
        className="rounded-t-2xl max-sm:rounded-b-2xl border border-border bg-[hsl(var(--upgrade-banner))] px-4 py-2 shadow-xs"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 shrink-0 text-amber-500" />
              <span className="text-xs font-medium text-foreground">
                {remainingRequests === 0 ? (
                  exhaustedCopy
                ) : (
                  <>
                    <span className="sm:hidden">{remainingRequests} credits left</span>
                    <span className="hidden sm:inline">You only have {remainingRequests} credits left</span>
                  </>
                )}
              </span>
            </div>
            <Progress
              value={usedPercentage}
              className="h-1.5 bg-muted"
            />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              size="sm"
              asChild
              className="shrink-0 rounded-full bg-foreground text-background hover:bg-foreground/90"
            >
              {ctaLink}
            </Button>
            {showDismiss ? (
              <button
                type="button"
                onClick={dismissMobile}
                aria-label="Dismiss upgrade banner"
                className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground sm:hidden"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
