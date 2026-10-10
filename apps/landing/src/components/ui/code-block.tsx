"use client"

/**
 * @module code-block
 * Syntax-highlighted code display. CodeBlock is wrapper; CodeBlockCode uses Shiki
 * (async) with SSR fallback; CodeBlockGroup lays out header/actions.
 * Depends on: @/lib/utils, shiki.
 * Used by: Markdown code blocks, docs, and ai-elements/code-block.
 */

import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { codeToHtml } from "shiki"

/** @param children - Wrapped content (e.g. CodeBlockCode). @param className - Optional container classes. */
export type TCodeBlockProps = {
  children?: React.ReactNode
  className?: string
} & React.HTMLProps<HTMLDivElement>

/** Container for code display with border and overflow handling. */
function CodeBlock({ children, className, ...props }: TCodeBlockProps) {
  return (
    <div
      className={cn(
        "not-prose flex w-full flex-col overflow-clip border",
        "border-border bg-card text-card-foreground rounded-xl",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/** @param code - Raw source. @param language - Shiki lang (default tsx). @param theme - Shiki theme (default github-light). */
export type TCodeBlockCodeProps = {
  code: string
  language?: string
  theme?: string
  className?: string
} & React.HTMLProps<HTMLDivElement>

/** Renders code with Shiki highlighting; shows plain pre/code until hydrated. */
function CodeBlockCode({
  code,
  language = "tsx",
  theme = "github-light",
  className,
  ...props
}: TCodeBlockCodeProps) {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null)

  useEffect(() => {
    async function highlight() {
      if (!code) {
        setHighlightedHtml("<pre><code></code></pre>")
        return
      }

      const html = await codeToHtml(code, { lang: language, theme })
      setHighlightedHtml(html)
    }
    highlight()
  }, [code, language, theme])

  const classNames = cn(
    "w-full overflow-x-auto text-[13px] [&>pre]:px-4 [&>pre]:py-4",
    className
  )

  // SSR: plain <pre><code> until Shiki result is ready
  return highlightedHtml ? (
    <div
      className={classNames}
      dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      {...props}
    />
  ) : (
    <div className={classNames} {...props}>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  )
}

/** Row layout for code block plus actions (e.g. copy button). */
export type TCodeBlockGroupProps = React.HTMLAttributes<HTMLDivElement>

function CodeBlockGroup({
  children,
  className,
  ...props
}: TCodeBlockGroupProps) {
  return (
    <div
      className={cn("flex items-center justify-between", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { CodeBlockGroup, CodeBlockCode, CodeBlock }
