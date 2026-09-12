"use client"

/**
 * @module questions
 * Multi-step question flow (select/dropdown/multi-select, text-with-quickfill, height) with optional skip and completion callback.
 * Questionnaire core always visible; Questionnaire advanced collapsed by default.
 * Depends on: @/lib/utils, UI primitives, training-profile height helpers, lucide-react.
 * Used by: onboarding, program builder, surveys.
 */
import * as React from "react"
import { ChevronUp, ChevronDown, CircleHelp, CornerDownLeft, Loader2, X, ChevronsDown, ChevronsUp, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import {
  heightCmToImperial,
  imperialToHeightCm,
  parseOptionalInt,
} from "@/components/account/training-profile-draft"
import {
  TRAINING_HEIGHT_CM_OPTIONS,
  TRAINING_HEIGHT_FEET_OPTIONS,
  TRAINING_HEIGHT_INCHES_OPTIONS,
  type THeightUnit,
} from "@/components/account/training-profile-options"

/** True when question belongs to Questionnaire advanced (Training profile). */
export function isAdvancedQuestion(question: TQuestion): boolean {
  return question.section === "advanced"
}

/**
 * Props for the Questions flow.
 * @property onComplete - Called with answers map (questionId -> value or array for multi).
 * @property isBuilding / isLoading - Disable actions and show loading on primary button.
 * @property initialAnswers - Optional pre-selected answers (e.g. inferred from initial prompt) keyed by question id.
 */
interface IQuestionsProps {
  questions: TQuestion[]
  onComplete?: (answers: Record<string, string | string[]>) => void
  onSkip?: () => void
  /** When provided, shows a close (X) button in the header instead of the help icon; called when user dismisses without completing. */
  onDismiss?: () => void
  className?: string
  isBuilding?: boolean
  isLoading?: boolean
  initialAnswers?: Record<string, string | string[]>
  /** `save` is Training-profile ask submit (does not build). Default `build`. */
  completeAction?: "build" | "save"
}

/** Props for single-select (radio) question renderer. */
interface IQuestionSelectProps {
  question: TQuestion
  selectedAnswer: string | undefined
  otherText: string
  onSelect: (questionId: string, optionId: string) => void
  onOtherSelect: (questionId: string) => void
  onOtherTextChange: (questionId: string, text: string) => void
  /** Letter labels for options (e.g. A, B, C). */
  letterKeys: string[]
  questionIndex: number
}

function QuestionSelect({
  question,
  selectedAnswer,
  otherText,
  onSelect,
  onOtherSelect,
  onOtherTextChange,
  letterKeys,
  questionIndex,
}: IQuestionSelectProps) {
  const isOtherSelected = selectedAnswer?.startsWith("other:")

  return (
    <>
      <p className="mb-3 text-sm font-semibold">
        {questionIndex + 1}. {question.question}
      </p>
      {question.subtitle && (
        question.subtitle.link ? (
          <a
            href={question.subtitle.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 block text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            {question.subtitle.text}
          </a>
        ) : (
          <p className="mb-3 text-xs font-semibold text-lightSecondary">
            {question.subtitle.text}
          </p>
        )
      )}

      {/* Options */}
      <div className="flex flex-col gap-1">
        {question.options.map((option, optionIndex) => {
          const isSelected = selectedAnswer === option.id
          return (
            <button
              key={option.id}
              onClick={() => onSelect(question.id, option.id)}
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                "hover:bg-accent",
                isSelected && "bg-accent"
              )}
              aria-label={`Select ${option.label}`}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded text-xs font-medium",
                  "bg-muted text-muted-foreground",
                  isSelected && "bg-lightSecondary text-white"
                )}
              >
                {letterKeys[optionIndex]}
              </span>
              <span className="text-foreground">{option.label}</span>
            </button>
          )
        })}

        {/* Other Option */}
        {question.allowOther && (
          <div className="mt-1">
            <button
              onClick={() => onOtherSelect(question.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                "hover:bg-accent",
                isOtherSelected && "bg-accent"
              )}
              aria-label="Select other"
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded text-xs font-medium",
                  "bg-muted text-muted-foreground",
                  isOtherSelected && "bg-lightSecondary text-white"
                )}
              >
                {letterKeys[question.options.length]}
              </span>
              {isOtherSelected ? (
                <input
                  type="text"
                  value={otherText || ""}
                  onChange={(e) =>
                    onOtherTextChange(question.id, e.target.value)
                  }
                  placeholder="Type your answer..."
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-hidden"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="text-muted-foreground">Other...</span>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

/** Props for multi-select (checkbox) question renderer. */
interface IQuestionMultiSelectProps {
  question: TQuestion
  selectedAnswers: string[]
  otherText: string
  onToggle: (questionId: string, optionId: string) => void
  onOtherToggle: (questionId: string) => void
  onOtherTextChange: (questionId: string, text: string) => void
  letterKeys: string[]
  questionIndex: number
}

function QuestionMultiSelect({
  question,
  selectedAnswers,
  otherText,
  onToggle,
  onOtherToggle,
  onOtherTextChange,
  letterKeys,
  questionIndex,
}: IQuestionMultiSelectProps) {
  const isOtherSelected = selectedAnswers.includes("other")

  return (
    <>
      <p className="mb-3 text-sm font-semibold">
        {questionIndex + 1}. {question.question}
      </p>
      {question.subtitle && (
        question.subtitle.link ? (
          <a
            href={question.subtitle.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 block text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            {question.subtitle.text}
          </a>
        ) : (
          <p className="mb-3 text-xs font-semibold text-lightSecondary">
            {question.subtitle.text}
          </p>
        )
      )}

      {/* Options */}
      <div className="flex flex-col gap-1">
        {question.options.map((option, optionIndex) => {
          const isSelected = selectedAnswers.includes(option.id)
          const handleKeyDown = (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onToggle(question.id, option.id)
            }
          }
          const handleClick = (e: React.MouseEvent) => {
            // If clicking directly on the checkbox or its children, let it handle the toggle
            // Otherwise, toggle on container click (e.g., clicking the label area)
            const target = e.target as HTMLElement
            if (target.closest('[role="checkbox"]') || target.closest('button[role="checkbox"]')) {
              return // Let checkbox handle it via onCheckedChange
            }
            onToggle(question.id, option.id)
          }
          const useXIcon =
            question.id === "exclude-equipment" || question.id === "exclude-areas"

          return (
            <div
              key={option.id}
              role="button"
              tabIndex={0}
              onClick={handleClick}
              onKeyDown={handleKeyDown}
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors cursor-pointer",
                "hover:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected && "bg-accent"
              )}
              aria-label={`Select ${option.label}`}
            >
              {useXIcon ? (
                <CheckboxPrimitive.Root
                  checked={isSelected}
                  onCheckedChange={() => onToggle(question.id, option.id)}
                  className={cn(
                    "peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow-sm focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
                    "shrink-0 data-[state=checked]:text-white"
                  )}
                  tabIndex={-1}
                >
                  <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
                    <X className="h-4 w-4" />
                  </CheckboxPrimitive.Indicator>
                </CheckboxPrimitive.Root>
              ) : (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggle(question.id, option.id)}
                  className="shrink-0 data-[state=checked]:text-white"
                  tabIndex={-1}
                />
              )}
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded text-xs font-medium",
                  "bg-muted text-muted-foreground",
                  isSelected && "bg-lightSecondary text-white"
                )}
              >
                {letterKeys[optionIndex]}
              </span>
              <span className="text-foreground">{option.label}</span>
            </div>
          )
        })}

        {/* Other Option */}
        {question.allowOther && (
          <div className="mt-1">
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => {
                // If clicking directly on the checkbox or input, let them handle it
                const target = e.target as HTMLElement
                if (target.closest('[role="checkbox"]') || target.tagName === "INPUT") {
                  return // Let checkbox or input handle it
                }
                onOtherToggle(question.id)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onOtherToggle(question.id)
                }
              }}
              aria-label="Select other"
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors cursor-pointer",
                "hover:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isOtherSelected && "bg-accent"
              )}
            >
              <Checkbox
                checked={isOtherSelected}
                onCheckedChange={() => onOtherToggle(question.id)}
                className="shrink-0 data-[state=checked]:text-white"
                tabIndex={-1}
              />
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded text-xs font-medium",
                  "bg-muted text-muted-foreground",
                  isOtherSelected && "bg-lightSecondary text-white"
                )}
              >
                {letterKeys[question.options.length]}
              </span>
              {isOtherSelected ? (
                <input
                  type="text"
                  value={otherText || ""}
                  onChange={(e) =>
                    onOtherTextChange(question.id, e.target.value)
                  }
                  placeholder="Type your answer..."
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-hidden"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="text-muted-foreground">Other...</span>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/** Props for text-with-quickfill question (free text + optional chips to append). */
interface IQuestionTextWithQuickfillProps {
  question: TQuestion
  value: string
  onChange: (questionId: string, text: string) => void
  questionIndex: number
}

function QuestionTextWithQuickfill({
  question,
  value,
  onChange,
  questionIndex,
}: IQuestionTextWithQuickfillProps) {
  const handleQuickfillClick = (option: TQuestionOption) => {
    const trimmed = value.trim()
    const addition = option.label
    const newValue = trimmed ? `${trimmed}, ${addition}` : addition
    onChange(question.id, newValue)
  }

  return (
    <>
      <p className="mb-3 text-sm font-semibold">
        {questionIndex + 1}. {question.question}
      </p>
      {question.subtitle && (
        question.subtitle.link ? (
          <a
            href={question.subtitle.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 block text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            {question.subtitle.text}
          </a>
        ) : (
          <p className="mb-3 text-xs font-semibold text-lightSecondary">
            {question.subtitle.text}
          </p>
        )
      )}

      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(question.id, e.target.value)}
        placeholder="Enter your health issue, or select from options"
        className="mb-3 placeholder:text-[12px]"
      />

      <div className="flex flex-wrap gap-1.5">
        {question.options.map((option) => (
          <Button
            key={option.id}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleQuickfillClick(option)}
            className="rounded-full text-xs"
          >
            {option.label}
          </Button>
        ))}
      </div>
    </>
  )
}

/** Props for dropdown (Select) single-value question renderer. */
interface IQuestionDropdownProps {
  question: TQuestion
  selectedAnswer: string | undefined
  onSelect: (questionId: string, optionId: string) => void
  questionIndex: number
}

function QuestionDropdown({
  question,
  selectedAnswer,
  onSelect,
  questionIndex,
}: IQuestionDropdownProps) {
  return (
    <>
      <p className="mb-3 text-sm font-semibold">
        {questionIndex + 1}. {question.question}
      </p>
      {question.subtitle && (
        question.subtitle.link ? (
          <a
            href={question.subtitle.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 block text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            {question.subtitle.text}
          </a>
        ) : (
          <p className="mb-3 text-xs font-semibold text-lightSecondary">
            {question.subtitle.text}
          </p>
        )
      )}
      <Select
        value={selectedAnswer}
        onValueChange={(value) => onSelect(question.id, value)}
      >
        <SelectTrigger aria-label={question.question} className="w-full bg-background">
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {question.options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )
}

/** Props for height question (Imperial/Metric → cm string answer). */
interface IQuestionHeightProps {
  question: TQuestion
  value: string
  onChange: (questionId: string, cm: string) => void
  questionIndex: number
}

function QuestionHeight({
  question,
  value,
  onChange,
  questionIndex,
}: IQuestionHeightProps) {
  const [unit, setUnit] = React.useState<THeightUnit>("metric")
  const heightCm = parseOptionalInt(value)
  const imperial = heightCmToImperial(heightCm)

  const setCm = (cm: number | null) => {
    onChange(question.id, cm == null ? "" : String(cm))
  }

  return (
    <>
      <p className="mb-3 text-sm font-semibold">
        {questionIndex + 1}. {question.question}
      </p>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Unit</span>
        <ToggleGroup
          type="single"
          value={unit}
          onValueChange={(next) => {
            if (next === "imperial" || next === "metric") setUnit(next)
          }}
          variant="outline"
          size="sm"
          className="justify-start"
          aria-label="Height unit"
        >
          <ToggleGroupItem value="metric" aria-label="Metric">
            Metric
          </ToggleGroupItem>
          <ToggleGroupItem value="imperial" aria-label="Imperial">
            Imperial
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {unit === "metric" ? (
        <Select
          value={heightCm == null ? undefined : String(Math.round(heightCm))}
          onValueChange={(cm) => setCm(parseOptionalInt(cm))}
        >
          <SelectTrigger aria-label="Height in centimeters">
            <SelectValue placeholder="Select height" />
          </SelectTrigger>
          <SelectContent>
            {TRAINING_HEIGHT_CM_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex gap-2">
          <Select
            value={imperial.feet == null ? undefined : String(imperial.feet)}
            onValueChange={(feet) =>
              setCm(imperialToHeightCm(parseOptionalInt(feet), imperial.inches ?? 0))
            }
          >
            <SelectTrigger aria-label="Height feet" className="flex-1">
              <SelectValue placeholder="ft" />
            </SelectTrigger>
            <SelectContent>
              {TRAINING_HEIGHT_FEET_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={imperial.inches == null ? undefined : String(imperial.inches)}
            onValueChange={(inches) =>
              setCm(imperialToHeightCm(imperial.feet ?? 5, parseOptionalInt(inches)))
            }
          >
            <SelectTrigger aria-label="Height inches" className="flex-1">
              <SelectValue placeholder="in" />
            </SelectTrigger>
            <SelectContent>
              {TRAINING_HEIGHT_INCHES_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  )
}

/** Renders core + optional advanced (collapsed); dispatches by type. Completes with answers map; "Other" as "other:<text>". */
export function Questions({
  questions,
  onComplete,
  onSkip,
  onDismiss,
  isBuilding,
  isLoading,
  className,
  initialAnswers,
  completeAction = "build",
}: IQuestionsProps) {
  const [answers, setAnswers] = React.useState<Record<string, string | string[]>>(initialAnswers ?? {})
  const [otherTexts, setOtherTexts] = React.useState<Record<string, string>>({})
  const [visibleIndex, setVisibleIndex] = React.useState(0)
  const [isLargeScreen, setIsLargeScreen] = React.useState(false)
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const [advancedOpen, setAdvancedOpen] = React.useState(false)

  const containerRef = React.useRef<HTMLDivElement>(null)
  const questionRefs = React.useRef<(HTMLDivElement | null)[]>([])

  const coreQuestions = React.useMemo(
    () => questions.filter((q) => !isAdvancedQuestion(q)),
    [questions],
  )
  const advancedQuestions = React.useMemo(
    () => questions.filter(isAdvancedQuestion),
    [questions],
  )
  const visibleQuestions = React.useMemo(
    () => (advancedOpen || coreQuestions.length === 0
      ? [...coreQuestions, ...advancedQuestions]
      : coreQuestions),
    [advancedOpen, coreQuestions, advancedQuestions],
  )

  const totalQuestions = visibleQuestions.length
  const letterKeys = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"]

  // Track screen size to disable auto-scrolling on medium and smaller screens
  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)")
    setIsLargeScreen(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setIsLargeScreen(e.matches)
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  const scrollToQuestion = (index: number) => {
    const target = questionRefs.current[index]
    const container = containerRef.current
    if (target && container) {
      const targetRect = target.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      const scrollTop = container.scrollTop + (targetRect.top - containerRect.top)
      container.scrollTo({
        top: scrollTop,
        behavior: "smooth",
      })
    }
  }

  const scrollToNextAfter = (questionId: string) => {
    if (!isLargeScreen) return
    const currentIndex = visibleQuestions.findIndex((q) => q.id === questionId)
    if (currentIndex !== -1 && currentIndex < visibleQuestions.length - 1) {
      setTimeout(() => {
        const nextIndex = currentIndex + 1
        setVisibleIndex(nextIndex)
        scrollToQuestion(nextIndex)
      }, 150)
    }
  }

  // Handler for single-select questions
  const handleOptionSelect = (questionId: string, optionId: string) => {
    if (answers[questionId] === optionId) {
      setAnswers((prev) => {
        const { [questionId]: _, ...rest } = prev
        return rest
      })
      return
    }
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }))
    scrollToNextAfter(questionId)
  }

  // Handler for single-select "Other" option
  const handleOtherSelect = (questionId: string) => {
    const current = answers[questionId]
    if (typeof current === "string" && current.startsWith("other:")) {
      setAnswers((prev) => {
        const { [questionId]: _, ...rest } = prev
        return rest
      })
      return
    }
    setAnswers((prev) => ({
      ...prev,
      [questionId]: `other:${otherTexts[questionId] || ""}`,
    }))
    scrollToNextAfter(questionId)
  }

  const handleHeightChange = (questionId: string, cm: string) => {
    if (!cm) {
      setAnswers((prev) => {
        const { [questionId]: _, ...rest } = prev
        return rest
      })
      return
    }
    setAnswers((prev) => ({
      ...prev,
      [questionId]: cm,
    }))
  }

  // Handler for dropdown (Select) questions - set only, no toggle-clear
  const handleDropdownSelect = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }))
    scrollToNextAfter(questionId)
  }

  // Handler for multi-select questions
  const handleOptionToggle = (questionId: string, optionId: string) => {
    setAnswers((prev) => {
      const current = prev[questionId]
      const currentArray = Array.isArray(current) ? current : []

      if (currentArray.includes(optionId)) {
        // Remove option
        return {
          ...prev,
          [questionId]: currentArray.filter(id => id !== optionId),
        }
      } else {
        // Add option
        return {
          ...prev,
          [questionId]: [...currentArray, optionId],
        }
      }
    })
  }

  // Handler for multi-select "Other" option
  const handleOtherToggle = (questionId: string) => {
    setAnswers((prev) => {
      const current = prev[questionId]
      const currentArray = Array.isArray(current) ? current : []

      if (currentArray.includes("other")) {
        // Remove "other" option
        return {
          ...prev,
          [questionId]: currentArray.filter(id => id !== "other"),
        }
      } else {
        // Add "other" option
        return {
          ...prev,
          [questionId]: [...currentArray, "other"],
        }
      }
    })
  }

  const handleOtherTextChange = (questionId: string, text: string) => {
    setOtherTexts((prev) => ({
      ...prev,
      [questionId]: text,
    }))

    // Update answer if "other" is selected
    const current = answers[questionId]
    if (typeof current === "string" && current.startsWith("other:")) {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: `other:${text}`,
      }))
    } else if (Array.isArray(current) && current.includes("other")) {
      // For multi-select, keep "other" in array and store text separately
      // The text is stored in otherTexts, and we'll format it in handleContinue
    }
  }

  const handleTextWithQuickfillChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: text,
    }))
  }

  const handlePrevious = () => {
    if (visibleIndex > 0) {
      const newIndex = visibleIndex - 1
      setVisibleIndex(newIndex)
      scrollToQuestion(newIndex)
    }
  }

  const handleNext = () => {
    if (visibleIndex < totalQuestions - 1) {
      const newIndex = visibleIndex + 1
      setVisibleIndex(newIndex)
      scrollToQuestion(newIndex)
    }
  }

  const handleContinue = React.useCallback(() => {
    // Answer format: "Other" option stored as "other:<user text>" for both select and multi-select
    const formattedAnswers: Record<string, string | string[]> = {}

    for (const [questionId, answer] of Object.entries(answers)) {
      if (Array.isArray(answer)) {
        // Multi-select: replace "other" with "other:text" if text exists
        formattedAnswers[questionId] = answer.map(id => {
          if (id === "other" && otherTexts[questionId]) {
            return `other:${otherTexts[questionId]}`
          }
          return id
        })
      } else {
        // Single-select: already formatted
        formattedAnswers[questionId] = answer
      }
    }

    onComplete?.(formattedAnswers)
  }, [onComplete, answers, otherTexts])

  // Track which question is in view on scroll
  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const containerRect = container.getBoundingClientRect()
      const containerTop = containerRect.top

      for (let i = 0; i < questionRefs.current.length; i++) {
        const el = questionRefs.current[i]
        if (el) {
          const rect = el.getBoundingClientRect()
          const relativeTop = rect.top - containerTop
          if (relativeTop >= -20 && relativeTop < 100) {
            setVisibleIndex(i)
            break
          }
        }
      }
    }

    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [])

  const hasSelections = Object.values(answers).some((v) =>
    Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.length > 0
  )

  const handleClearAll = React.useCallback(() => {
    setAnswers({})
    setOtherTexts({})
    setVisibleIndex(0)
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  React.useEffect(() => {
    if (!advancedOpen && visibleIndex >= coreQuestions.length) {
      setVisibleIndex(Math.max(0, coreQuestions.length - 1))
    }
  }, [advancedOpen, coreQuestions.length, visibleIndex])

  if (questions.length === 0) return null

  const renderQuestion = (question: TQuestion, questionIndex: number, isLast: boolean) => {
    const questionType = question.type || "select"
    const answer = answers[question.id]

    return (
      <div
        key={question.id}
        ref={(el) => { questionRefs.current[questionIndex] = el }}
        className={cn("p-4", !isLast && "border-b border-dashed")}
        data-question-id={question.id}
        data-question-section={question.section ?? "core"}
      >
        {questionType === "text-with-quickfill" ? (
          <QuestionTextWithQuickfill
            question={question}
            value={typeof answer === "string" ? answer : ""}
            onChange={handleTextWithQuickfillChange}
            questionIndex={questionIndex}
          />
        ) : questionType === "multi-select" ? (
          <QuestionMultiSelect
            question={question}
            selectedAnswers={Array.isArray(answer) ? answer : []}
            otherText={otherTexts[question.id] || ""}
            onToggle={handleOptionToggle}
            onOtherToggle={handleOtherToggle}
            onOtherTextChange={handleOtherTextChange}
            letterKeys={letterKeys}
            questionIndex={questionIndex}
          />
        ) : questionType === "height" ? (
          <QuestionHeight
            question={question}
            value={typeof answer === "string" ? answer : ""}
            onChange={handleHeightChange}
            questionIndex={questionIndex}
          />
        ) : questionType === "dropdown" ? (
          <QuestionDropdown
            question={question}
            selectedAnswer={typeof answer === "string" ? answer : undefined}
            onSelect={handleDropdownSelect}
            questionIndex={questionIndex}
          />
        ) : (
          <QuestionSelect
            question={question}
            selectedAnswer={typeof answer === "string" ? answer : undefined}
            otherText={otherTexts[question.id] || ""}
            onSelect={handleOptionSelect}
            onOtherSelect={handleOtherSelect}
            onOtherTextChange={handleOtherTextChange}
            letterKeys={letterKeys}
            questionIndex={questionIndex}
          />
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex w-full max-w-lg flex-col rounded-lg border bg-card text-card-foreground shadow-xs",
        className
      )}
      data-testid="questionnaire"
    >
      {/* Header */}
      <div className={cn("flex items-center justify-between px-4 py-3", !isCollapsed && "border-b")}>
        <div className="flex items-center gap-2 text-sm font-medium">
          {onDismiss ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onDismiss}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Close survey"
              >
                <X className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsCollapsed((c) => !c)}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label={isCollapsed ? "Expand questionnaire" : "Collapse questionnaire"}
                aria-expanded={!isCollapsed}
              >
                {isCollapsed ? <ChevronsUp className="size-4" /> : <ChevronsDown className="size-4" />}
              </button>
            </div>
          ) : (
            <CircleHelp className="size-4 text-muted-foreground" />
          )}
          <span>Questions</span>
        </div>
        {!isCollapsed && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <button
              onClick={handlePrevious}
              disabled={visibleIndex === 0}
              className="p-0.5 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous question"
            >
              <ChevronUp className="size-4" />
            </button>
            <span className="min-w-14 text-center">
              {totalQuestions === 0 ? "0 of 0" : `${visibleIndex + 1} of ${totalQuestions}`}
            </span>
            <button
              onClick={handleNext}
              disabled={totalQuestions === 0 || visibleIndex === totalQuestions - 1}
              className="p-0.5 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next question"
            >
              <ChevronDown className="size-4" />
            </button>
          </div>
        )}
      </div>

      {/* Scrollable Questions Content */}
      {!isCollapsed && <div
        ref={containerRef}
        className="max-h-80 overflow-y-auto scroll-smooth"
      >
        {coreQuestions.map((question, questionIndex) =>
          renderQuestion(
            question,
            questionIndex,
            questionIndex === coreQuestions.length - 1 && (!advancedOpen || advancedQuestions.length === 0),
          ),
        )}
        {coreQuestions.length === 0 && advancedQuestions.map((question, advancedIndex) =>
          renderQuestion(
            question,
            advancedIndex,
            advancedIndex === advancedQuestions.length - 1,
          ),
        )}
        {coreQuestions.length > 0 && advancedQuestions.length > 0 && (
          <Collapsible
            open={advancedOpen}
            onOpenChange={setAdvancedOpen}
            className="border-t"
          >
            <CollapsibleTrigger
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={advancedOpen ? "Collapse advanced questions" : "Expand advanced questions"}
              data-testid="questionnaire-advanced-trigger"
            >
              <span>Advanced (optional)</span>
              <ChevronRight
                className={cn(
                  "size-4 shrink-0 transition-transform",
                  advancedOpen && "rotate-90",
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent data-testid="questionnaire-advanced-content">
              {advancedQuestions.map((question, advancedIndex) => {
                const questionIndex = coreQuestions.length + advancedIndex
                return renderQuestion(
                  question,
                  questionIndex,
                  advancedIndex === advancedQuestions.length - 1,
                )
              })}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>}

      {/* Footer */}
      {!isCollapsed && <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
        {hasSelections && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            disabled={isLoading || isBuilding}
            className="rounded-full"
            aria-label="Reset selections"
          >
            Reset
          </Button>
        )}
        {onSkip ? (
        <>
        {hasSelections ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSkip}
                    disabled={isLoading || isBuilding || hasSelections}
                    className="rounded-full"
                    aria-label="Skip questionnaire"
                  >
                    Skip
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent className="bg-lightSecondary text-white">
                Reset selections to skip this questionnaire.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            disabled={isLoading || isBuilding}
            className="rounded-full"
            aria-label="Skip questionnaire"
          >
            Skip
          </Button>
        )}
        </>
        ) : null}
        <Button
          size="sm"
          onClick={handleContinue}
          disabled={isLoading || isBuilding}
          className="rounded-full bg-lightGold px-4 text-black hover:bg-lightGold/80 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={completeAction === "save" ? "Save training profile" : "Build program"}
        >
          {isBuilding ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {completeAction === "save" ? "Saving" : "Building"}
            </>
          ) : (
            <>
              {completeAction === "save" ? "Save" : "Build"}
              <span className="flex items-center">
                <span className="">⌘</span>
                <CornerDownLeft className="size-4" />
              </span>
            </>
          )}
        </Button>
      </div>}
    </div>
  )
}
