"use client"

/**
 * @module upgrade-banner
 * Banner showing credits remaining and CTA to upgrade or sign in.
 * Callers may pass custom CTA/exhausted copy (e.g. Pro tier at 0 credits → upgrade to Pro+).
 * Depends on: next/link, @/components/ui/button, progress, @supabase/supabase-js.
 * Used by: build-program Chat (Free always; Pro only when out of credits; Pro+ hidden).
 */
import Link from "next/link"
import { ChevronLeft, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { User } from "@supabase/supabase-js"
import { useState, useCallback } from "react"

/**
 * @property remainingRequests - Credits left; when 0, copy uses exhaustedMessage or default.
 * @property totalRequests - Total quota for progress bar (used = total - remaining).
 * @property user - If set, CTA uses upgradeButtonLabel (default "Upgrade Plan", → /pricing); else "Sign in".
 * @property upgradeButtonLabel - Optional logged-in CTA label (e.g. "Upgrade to Pro+").
 * @property exhaustedMessage - Optional line when remainingRequests === 0 (overrides default exhausted copy).
 * @property enableMobileCollapse - When true, narrow viewports can collapse the banner to a left icon only.
 */
interface IUpgradeBannerProps {
  remainingRequests: number
  totalRequests: number
  user?: User | null
  upgradeButtonLabel?: string
  exhaustedMessage?: string
  enableMobileCollapse?: boolean
}

/** sessionStorage key for persisting mobile expanded/collapsed preference. */
const MOBILE_EXPANDED_KEY = "build-program-upgrade-banner-expanded"

function readMobileExpanded(): boolean {
  try {
    const stored = sessionStorage.getItem(MOBILE_EXPANDED_KEY)
    if (stored !== null) return stored === "true"
  } catch {
    // sessionStorage unavailable (e.g. SSR / private mode)
  }
  return true
}

function writeMobileExpanded(value: boolean) {
  try {
    sessionStorage.setItem(MOBILE_EXPANDED_KEY, String(value))
  } catch {
    // ignore
  }
}

/** Renders progress bar and primary CTA (Upgrade or Sign in). */
export function UpgradeBanner({
  remainingRequests,
  totalRequests,
  user,
  upgradeButtonLabel = "Upgrade Plan",
  exhaustedMessage,
  enableMobileCollapse = false,
}: IUpgradeBannerProps) {
  const usedPercentage = ((totalRequests - remainingRequests) / totalRequests) * 100
  const exhaustedCopy =
    remainingRequests === 0
      ? exhaustedMessage ?? "You have run out of credits"
      : null

  // Lazy init OK: banner mounts after client featureLimits fetch, not in SSR HTML.
  const [mobileExpanded, setMobileExpanded] = useState(() =>
    enableMobileCollapse ? readMobileExpanded() : true
  )

  const toggleMobile = useCallback(() => {
    setMobileExpanded((prev) => {
      const next = !prev
      writeMobileExpanded(next)
      return next
    })
  }, [])

  const ctaLink = user ? (
    <Link href="/pricing">{upgradeButtonLabel}</Link>
  ) : (
    <Link href={`/auth/login?next=${encodeURIComponent("/build-program?resume=true")}`}>Sign in</Link>
  )

  const showMobileIconOnly = enableMobileCollapse && !mobileExpanded

  return (
    <div className="mx-auto w-full max-w-4xl px-3 max-sm:pb-2 md:px-5 max-sm:px-4">
      {showMobileIconOnly ? (
        <div className="flex justify-start sm:hidden">
          <button
            type="button"
            onClick={toggleMobile}
            aria-expanded={false}
            aria-label="Show credits and upgrade banner"
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-[hsl(var(--upgrade-banner))] shadow-xs text-amber-500 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Sparkles className="size-4" aria-hidden />
          </button>
        </div>
      ) : null}

      <div
        className={cn(
          "rounded-t-2xl max-sm:rounded-b-2xl border border-border bg-[hsl(var(--upgrade-banner))] px-4 py-2 shadow-xs",
          showMobileIconOnly && "hidden sm:block"
        )}
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
            {enableMobileCollapse ? (
              <button
                type="button"
                onClick={toggleMobile}
                aria-expanded={mobileExpanded}
                aria-label="Hide credits banner"
                className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground sm:hidden"
              >
                <ChevronLeft className="size-3.5" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
