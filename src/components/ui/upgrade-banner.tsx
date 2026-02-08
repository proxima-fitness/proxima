"use client"

import Link from "next/link"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

interface IUpgradeBannerProps {
  remainingRequests: number
  totalRequests: number
}

export function UpgradeBanner({
  remainingRequests,
  totalRequests,
}: IUpgradeBannerProps) {
  const usedPercentage = ((totalRequests - remainingRequests) / totalRequests) * 100

  return (
    <div className="mx-auto w-full max-w-4xl px-3 md:px-5 max-sm:px-4">
      <div className="rounded-t-2xl border border-border bg-[hsl(var(--upgrade-banner))] px-4 py-2 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 shrink-0 text-amber-500" />
              <span className="text-xs font-medium text-foreground">
                {remainingRequests} of {totalRequests} requests remaining
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
            <Link href="/pricing">Upgrade Plan</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
