"use client"

/**
 * @module upgrade-banner
 * Banner showing credits remaining and CTA to upgrade or sign in.
 * Callers may pass custom CTA/exhausted copy (e.g. Pro tier at 0 credits → upgrade to Pro+).
 * Depends on: next/link, @/components/ui/button, progress, @supabase/supabase-js.
 * Used by: build-program Chat (Free always; Pro only when out of credits; Pro+ hidden).
 */
import Link from "next/link"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import type { User } from "@supabase/supabase-js"

/**
 * @property remainingRequests - Credits left; when 0, copy uses exhaustedMessage or default.
 * @property totalRequests - Total quota for progress bar (used = total - remaining).
 * @property user - If set, CTA uses upgradeButtonLabel (default "Upgrade Plan", → /pricing); else "Sign in".
 * @property upgradeButtonLabel - Optional logged-in CTA label (e.g. "Upgrade to Pro+").
 * @property exhaustedMessage - Optional line when remainingRequests === 0 (overrides default exhausted copy).
 */
interface IUpgradeBannerProps {
  remainingRequests: number
  totalRequests: number
  user?: User | null
  upgradeButtonLabel?: string
  exhaustedMessage?: string
}

/** Renders progress bar and primary CTA (Upgrade or Sign in). */
export function UpgradeBanner({
  remainingRequests,
  totalRequests,
  user,
  upgradeButtonLabel = "Upgrade Plan",
  exhaustedMessage,
}: IUpgradeBannerProps) {
  const usedPercentage = ((totalRequests - remainingRequests) / totalRequests) * 100
  const exhaustedCopy =
    remainingRequests === 0
      ? exhaustedMessage ?? "You have run out of credits"
      : null

  return (
    <div className="mx-auto w-full max-w-4xl px-3 max-sm:pb-2 md:px-5 max-sm:px-4">
      <div className="rounded-t-2xl max-sm:rounded-b-2xl border border-border bg-[hsl(var(--upgrade-banner))] px-4 py-2 shadow-xs">
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
          <Button
            size="sm"
            asChild
            className="shrink-0 rounded-full bg-foreground text-background hover:bg-foreground/90"
          >
            {user ? (
              <Link href="/pricing">{upgradeButtonLabel}</Link>
            ) : (
              <Link href={`/auth/login?next=${encodeURIComponent("/build-program?resume=true&edit=true")}`}>Sign in</Link>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
