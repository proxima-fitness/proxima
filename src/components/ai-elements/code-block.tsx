"use client";

/**
 * @module CodeBlock
 *
 * Syntax-highlighted code block primitives for AI responses and developer
 * tools. This module wraps Shiki to provide streaming-friendly highlighting,
 * line numbers, copy-to-clipboard interactions, and language selection UI
 * that can be composed into higher-level message and tool components.
 *
 * Depends on:
 * - Shiki for tokenization and theming, including a shared highlighter cache
 * - Design system components such as `Button` and `Select`
 * - React context and memoization for efficient re-rendering of large blocks
 *
 * Used by:
 * - `Tool` output rendering for JSON parameters and results
 * - AI message surfaces that want consistent, theme-aware code snippets
 * - Any component embedding `CodeBlock` to show static or streaming code
 */

import type { ComponentProps, CSSProperties, HTMLAttributes } from "react";
import type {
  BundledLanguage,
  BundledTheme,
  HighlighterGeneric,
  ThemedToken,
} from "shiki";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CheckIcon, CopyIcon } from "lucide-react";
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createHighlighter } from "shiki";

// Shiki uses bitflags for font styles: 1=italic, 2=bold, 4=underline
// biome-ignore lint/suspicious/noBitwiseOperators: shiki bitflag check

const isItalic = (fontStyle: number | undefined) => fontStyle && fontStyle & 1;
// biome-ignore lint/suspicious/noBitwiseOperators: shiki bitflag check

// oxlint-disable-next-line eslint(no-bitwise)
const isBold = (fontStyle: number | undefined) => fontStyle && fontStyle & 2;
const isUnderline = (fontStyle: number | undefined) =>
  // biome-ignore lint/suspicious/noBitwiseOperators: shiki bitflag check
  // oxlint-disable-next-line eslint(no-bitwise)
  fontStyle && fontStyle & 4;

// Transform tokens to include pre-computed keys to avoid noArrayIndexKey lint
interface IKeyedToken {
  token: ThemedToken;
  key: string;
}
interface IKeyedLine {
  tokens: IKeyedToken[];
  key: string;
}

const addKeysToTokens = (lines: ThemedToken[][]): IKeyedLine[] =>
  lines.map((line, lineIdx) => ({
    key: `line-${lineIdx}`,
    tokens: line.map((token, tokenIdx) => ({
      key: `line-${lineIdx}-${tokenIdx}`,
      token,
    })),
  }));

// Token rendering component
const TokenSpan = ({ token }: { token: ThemedToken }) => (
  <span
    className="dark:bg-(--shiki-dark-bg)! dark:text-(--shiki-dark)!"
    style={
      {
        backgroundColor: token.bgColor,
        color: token.color,
        fontStyle: isItalic(token.fontStyle) ? "italic" : undefined,
        fontWeight: isBold(token.fontStyle) ? "bold" : undefined,
        textDecoration: isUnderline(token.fontStyle) ? "underline" : undefined,
        ...token.htmlStyle,
      } as CSSProperties
    }
  >
    {token.content}
  </span>
);

// Line rendering component
const LineSpan = ({
  keyedLine,
  showLineNumbers,
}: {
  keyedLine: IKeyedLine;
  showLineNumbers: boolean;
}) => (
  <span className={showLineNumbers ? LINE_NUMBER_CLASSES : "block"}>
    {keyedLine.tokens.length === 0
      ? "\n"
      : keyedLine.tokens.map(({ token, key }) => (
          <TokenSpan key={key} token={token} />
        ))}
  </span>
);

// Types

/**
 * Public props for the high-level `CodeBlock` component.
 *
 * - `code` is the raw source text to render.
 * - `language` is the Shiki bundled language used for tokenization.
 * - `showLineNumbers` toggles the CSS counter-based line number gutter.
 * - Additional `div` props (e.g., `className`) are applied to the outer
 *   container so callers can control layout.
 */
type TCodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: BundledLanguage;
  showLineNumbers?: boolean;
};

/**
 * Normalized representation of Shiki tokenization results used internally
 * by the rendering layer. The `tokens` matrix is shaped as
 * `lines -> tokens per line`.
 */
interface ITokenizedCode {
  tokens: ThemedToken[][];
  fg: string;
  bg: string;
}

/**
 * Context value exposed to nested helpers (e.g., copy button) so they can
 * access the current code string without prop drilling.
 */
interface ICodeBlockContextType {
  code: string;
}

// Context
const CodeBlockContext = createContext<ICodeBlockContextType>({
  code: "",
});

// Highlighter cache (singleton per language)
const highlighterCache = new Map<
  string,
  Promise<HighlighterGeneric<BundledLanguage, BundledTheme>>
>();

// Token cache
const tokensCache = new Map<string, ITokenizedCode>();

// Subscribers for async token updates
const subscribers = new Map<string, Set<(result: ITokenizedCode) => void>>();

const getTokensCacheKey = (code: string, language: BundledLanguage) => {
  const start = code.slice(0, 100);
  const end = code.length > 100 ? code.slice(-100) : "";
  return `${language}:${code.length}:${start}:${end}`;
};

const getHighlighter = (
  language: BundledLanguage
): Promise<HighlighterGeneric<BundledLanguage, BundledTheme>> => {
  const cached = highlighterCache.get(language);
  if (cached) {
    return cached;
  }

  const highlighterPromise = createHighlighter({
    langs: [language],
    themes: ["github-light", "github-dark"],
  });

  highlighterCache.set(language, highlighterPromise);
  return highlighterPromise;
};

// Create raw tokens for immediate display while highlighting loads
const createRawTokens = (code: string): ITokenizedCode => ({
  bg: "transparent",
  fg: "inherit",
  tokens: code.split("\n").map((line) =>
    line === ""
      ? []
      : [
          {
            color: "inherit",
            content: line,
          } as ThemedToken,
        ]
  ),
});

/**
 * Synchronously attempt to highlight code for a given language, with an
 * optional callback that will be invoked when the async Shiki highlighter
 * finishes and a richer token set becomes available.
 *
 * Returns either a cached tokenization result or `null` when only the
 * asynchronous path is available (callers should fall back to raw tokens).
 */
export const highlightCode = (
  code: string,
  language: BundledLanguage,
  // oxlint-disable-next-line eslint-plugin-promise(prefer-await-to-callbacks)
  callback?: (result: ITokenizedCode) => void
): ITokenizedCode | null => {
  const tokensCacheKey = getTokensCacheKey(code, language);

  // Return cached result if available
  const cached = tokensCache.get(tokensCacheKey);
  if (cached) {
    return cached;
  }

  // Subscribe callback if provided
  if (callback) {
    if (!subscribers.has(tokensCacheKey)) {
      subscribers.set(tokensCacheKey, new Set());
    }
    subscribers.get(tokensCacheKey)?.add(callback);
  }

  // Start highlighting in background - fire-and-forget async pattern
  getHighlighter(language)
    // oxlint-disable-next-line eslint-plugin-promise(prefer-await-to-then)
    .then((highlighter) => {
      const availableLangs = highlighter.getLoadedLanguages();
      const langToUse = availableLangs.includes(language) ? language : "text";

      const result = highlighter.codeToTokens(code, {
        lang: langToUse,
        themes: {
          dark: "github-dark",
          light: "github-light",
        },
      });

      const tokenized: ITokenizedCode = {
        bg: result.bg ?? "transparent",
        fg: result.fg ?? "inherit",
        tokens: result.tokens,
      };

      // Cache the result
      tokensCache.set(tokensCacheKey, tokenized);

      // Notify all subscribers
      const subs = subscribers.get(tokensCacheKey);
      if (subs) {
        subs.forEach((sub) => sub(tokenized));
        subscribers.delete(tokensCacheKey);
      }
    })
    // oxlint-disable-next-line eslint-plugin-promise(prefer-await-to-then), eslint-plugin-promise(prefer-await-to-callbacks)
    .catch((error) => {
      console.error("Failed to highlight code:", error);
      subscribers.delete(tokensCacheKey);
    });

  return null;
};

// Line number styles using CSS counters
const LINE_NUMBER_CLASSES = cn(
  "block",
  "before:content-[counter(line)]",
  "before:inline-block",
  "before:[counter-increment:line]",
  "before:w-8",
  "before:mr-4",
  "before:text-right",
  "before:text-muted-foreground/50",
  "before:font-mono",
  "before:select-none"
);

const CodeBlockBody = memo(
  ({
    tokenized,
    showLineNumbers,
    className,
  }: {
    tokenized: ITokenizedCode;
    showLineNumbers: boolean;
    className?: string;
  }) => {
    const preStyle = useMemo(
      () => ({
        backgroundColor: tokenized.bg,
        color: tokenized.fg,
      }),
      [tokenized.bg, tokenized.fg]
    );

    const keyedLines = useMemo(
      () => addKeysToTokens(tokenized.tokens),
      [tokenized.tokens]
    );

    return (
      <pre
        className={cn(
          "dark:bg-(--shiki-dark-bg)! dark:text-(--shiki-dark)! m-0 p-4 text-sm",
          className
        )}
        style={preStyle}
      >
        <code
          className={cn(
            "font-mono text-sm",
            showLineNumbers && "[counter-increment:line_0] [counter-reset:line]"
          )}
        >
          {keyedLines.map((keyedLine) => (
            <LineSpan
              key={keyedLine.key}
              keyedLine={keyedLine}
              showLineNumbers={showLineNumbers}
            />
          ))}
        </code>
      </pre>
    );
  },
  (prevProps, nextProps) =>
    prevProps.tokenized === nextProps.tokenized &&
    prevProps.showLineNumbers === nextProps.showLineNumbers &&
    prevProps.className === nextProps.className
);

CodeBlockBody.displayName = "CodeBlockBody";

/**
 * Outer container for a code block, responsible for borders, background,
 * and intrinsic sizing hints so that large responses remain performant.
 *
 * Use this when you need full control over the header and children around
 * the code content.
 */
export const CodeBlockContainer = ({
  className,
  language,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement> & { language: string }) => (
  <div
    className={cn(
      "group relative w-full overflow-hidden rounded-md border bg-background text-foreground",
      className
    )}
    data-language={language}
    style={{
      containIntrinsicSize: "auto 200px",
      contentVisibility: "auto",
      ...style,
    }}
    {...props}
  />
);

/**
 * Optional header row for a code block, typically used to show language
 * labels, filenames, and action buttons.
 */
export const CodeBlockHeader = ({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex items-center justify-between border-b bg-muted/80 px-3 py-2 text-muted-foreground text-xs",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

/**
 * Left-aligned region within the header that groups an icon and primary
 * label for the block (e.g., "response.ts").
 */
export const CodeBlockTitle = ({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center gap-2", className)} {...props}>
    {children}
  </div>
);

/**
 * Monospace filename text used inside a `CodeBlockTitle`.
 */
export const CodeBlockFilename = ({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn("font-mono", className)} {...props}>
    {children}
  </span>
);

/**
 * Right-aligned container for action buttons such as copy and language
 * selectors inside a code block header.
 */
export const CodeBlockActions = ({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("-my-1 -mr-1 flex items-center gap-2", className)}
    {...props}
  >
    {children}
  </div>
);

/**
 * Core code content renderer. Handles the transition from raw tokens to
 * highlighted tokens and supports optional line numbers.
 */
export const CodeBlockContent = ({
  code,
  language,
  showLineNumbers = false,
}: {
  code: string;
  language: BundledLanguage;
  showLineNumbers?: boolean;
}) => {
  // Memoized raw tokens for immediate display
  const rawTokens = useMemo(() => createRawTokens(code), [code]);

  // Try to get cached result synchronously, otherwise use raw tokens
  const [tokenized, setTokenized] = useState<ITokenizedCode>(
    () => highlightCode(code, language) ?? rawTokens
  );

  useEffect(() => {
    let cancelled = false;

    // Reset to raw tokens when code changes (shows current code, not stale tokens)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTokenized(highlightCode(code, language) ?? rawTokens);

    // Subscribe to async highlighting result
    highlightCode(code, language, (result) => {
      if (!cancelled) {
        setTokenized(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [code, language, rawTokens]);

  return (
    <div className="relative overflow-auto">
      <CodeBlockBody showLineNumbers={showLineNumbers} tokenized={tokenized} />
    </div>
  );
};

/**
 * High-level convenience component that wires together the container,
 * context, and content for a standard code block.
 *
 * Use this when you do not need a custom header or additional shell.
 */
export const CodeBlock = ({
  code,
  language,
  showLineNumbers = false,
  className,
  children,
  ...props
}: TCodeBlockProps) => {
  const contextValue = useMemo(() => ({ code }), [code]);

  return (
    <CodeBlockContext.Provider value={contextValue}>
      <CodeBlockContainer className={className} language={language} {...props}>
        {children}
        <CodeBlockContent
          code={code}
          language={language}
          showLineNumbers={showLineNumbers}
        />
      </CodeBlockContainer>
    </CodeBlockContext.Provider>
  );
};

/**
 * Props for the `CodeBlockCopyButton`.
 *
 * - `onCopy` is invoked after a successful copy.
 * - `onError` is invoked when the Clipboard API is unavailable or fails.
 * - `timeout` controls how long the "copied" state is shown.
 */
export type TCodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
};

/**
 * Button that copies the current code block contents from context into
 * the clipboard and briefly shows a "copied" state.
 */
export const CodeBlockCopyButton = ({
  onCopy,
  onError,
  timeout = 2000,
  children,
  className,
  ...props
}: TCodeBlockCopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<number>(0);
  const { code } = useContext(CodeBlockContext);

  const copyToClipboard = useCallback(async () => {
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
      onError?.(new Error("Clipboard API not available"));
      return;
    }

    try {
      if (!isCopied) {
        await navigator.clipboard.writeText(code);
        setIsCopied(true);
        onCopy?.();
        timeoutRef.current = window.setTimeout(
          () => setIsCopied(false),
          timeout
        );
      }
    } catch (error) {
      onError?.(error as Error);
    }
  }, [code, onCopy, onError, timeout, isCopied]);

  useEffect(
    () => () => {
      window.clearTimeout(timeoutRef.current);
    },
    []
  );

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <Button
      aria-label={isCopied ? "Copied" : "Copy code"}
      className={cn("shrink-0", className)}
      onClick={copyToClipboard}
      size="icon"
      variant="ghost"
      {...props}
    >
      {children ?? <Icon size={14} />}
    </Button>
  );
};

export type TCodeBlockLanguageSelectorProps = ComponentProps<typeof Select>;

/**
 * High-level wrapper for a language-select dropdown that controls the
 * language shown in the surrounding UI; does not itself retokenize code.
 */
export const CodeBlockLanguageSelector = (
  props: TCodeBlockLanguageSelectorProps
) => <Select {...props} />;

export type TCodeBlockLanguageSelectorTriggerProps = ComponentProps<
  typeof SelectTrigger
>;

/**
 * Trigger button used with `CodeBlockLanguageSelector` to open the
 * language dropdown. Uses a compact, borderless style by default.
 */
export const CodeBlockLanguageSelectorTrigger = ({
  className,
  ...props
}: TCodeBlockLanguageSelectorTriggerProps) => (
  <SelectTrigger
    className={cn(
      "h-7 border-none bg-transparent px-2 text-xs shadow-none",
      className
    )}
    {...props}
  />
);

export type TCodeBlockLanguageSelectorValueProps = ComponentProps<
  typeof SelectValue
>;

/**
 * Display component that shows the currently selected language label
 * inside a `CodeBlockLanguageSelectorTrigger`.
 */
export const CodeBlockLanguageSelectorValue = (
  props: TCodeBlockLanguageSelectorValueProps
) => <SelectValue {...props} />;

export type TCodeBlockLanguageSelectorContentProps = ComponentProps<
  typeof SelectContent
>;

/**
 * Menu surface for the language selector. Aligns to the end of the
 * trigger by default.
 */
export const CodeBlockLanguageSelectorContent = ({
  align = "end",
  ...props
}: TCodeBlockLanguageSelectorContentProps) => (
  <SelectContent align={align} {...props} />
);

export type TCodeBlockLanguageSelectorItemProps = ComponentProps<
  typeof SelectItem
>;

/**
 * Individual selectable language option within the code block
 * language dropdown.
 */
export const CodeBlockLanguageSelectorItem = (
  props: TCodeBlockLanguageSelectorItemProps
) => <SelectItem {...props} />;
