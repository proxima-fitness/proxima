"use client"

import Link from "next/link"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import type { User } from "@supabase/supabase-js"

interface IUpgradeBannerProps {
  remainingRequests: number
  totalRequests: number
  user?: User | null
}

export function UpgradeBanner({
  remainingRequests,
  totalRequests,
  user,
}: IUpgradeBannerProps) {
  const usedPercentage = ((totalRequests - remainingRequests) / totalRequests) * 100

  return (
    <div className="mx-auto w-full max-w-4xl px-3 max-sm:pb-2 md:px-5 max-sm:px-4">
      <div className="rounded-t-2xl max-sm:rounded-b-2xl border border-border bg-[hsl(var(--upgrade-banner))] px-4 py-2 shadow-xs">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 shrink-0 text-amber-500" />
              <span className="text-xs font-medium text-foreground">
                {remainingRequests === 0 ? (
                  "You have run out of message credits"
                ) : (
                  <>
                    <span className="sm:hidden">{remainingRequests} message credits left</span>
                    <span className="hidden sm:inline">You only have {remainingRequests} message credits left</span>
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
            {user ? <Link href="/pricing">Upgrade Plan</Link> : <Link href={`/auth/login?next=${encodeURIComponent("/build-program?resume=true&edit=true")}`}>Sign in</Link>}
          </Button>
        </div>
      </div>
    </div>
  )
}
