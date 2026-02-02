"use client"

import * as React from "react"
import { ChevronUp, ChevronDown, CircleHelp, CornerDownLeft, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"

export interface IQuestionOption {
  id: string
  label: string
}

export interface IQuestion {
  id: string
  question: string
  options: IQuestionOption[]
  allowOther?: boolean
  type?: "select" | "multi-select" | "text-with-quickfill"
  subtitle?: { text: string; link?: string }
}

interface IQuestionsProps {
  questions: IQuestion[]
  onComplete?: (answers: Record<string, string | string[]>) => void
  onSkip?: () => void
  className?: string
  isBuilding?: boolean
  isLoading?: boolean
}

// QuestionSelect sub-component for single-select (radio) questions
interface IQuestionSelectProps {
  question: IQuestion
  selectedAnswer: string | undefined
  otherText: string
  onSelect: (questionId: string, optionId: string) => void
  onOtherSelect: (questionId: string) => void
  onOtherTextChange: (questionId: string, text: string) => void
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
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
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

// QuestionMultiSelect sub-component for multi-select (checkbox) questions
interface IQuestionMultiSelectProps {
  question: IQuestion
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
          const useXIcon = question.id === "exclude-equipment"

          return (
            <div
              key={option.id}
              role="button"
              tabIndex={0}
              onClick={handleClick}
              onKeyDown={handleKeyDown}
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors cursor-pointer",
                "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected && "bg-accent"
              )}
            >
              {useXIcon ? (
                <CheckboxPrimitive.Root
                  checked={isSelected}
                  onCheckedChange={() => onToggle(question.id, option.id)}
                  className={cn(
                    "peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
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
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors cursor-pointer",
                "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
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

// QuestionTextWithQuickfill sub-component for text input with quickfill buttons
interface IQuestionTextWithQuickfillProps {
  question: IQuestion
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
  const handleQuickfillClick = (option: IQuestionOption) => {
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
            className="text-xs"
          >
            {option.label}
          </Button>
        ))}
      </div>
    </>
  )
}

export function Questions({
  questions,
  onComplete,
  onSkip,
  isBuilding,
  isLoading,
  className,
}: IQuestionsProps) {
  const [answers, setAnswers] = React.useState<Record<string, string | string[]>>({})
  const [otherTexts, setOtherTexts] = React.useState<Record<string, string>>({})
  const [visibleIndex, setVisibleIndex] = React.useState(0)
  const [isLargeScreen, setIsLargeScreen] = React.useState(false)

  const containerRef = React.useRef<HTMLDivElement>(null)
  const questionRefs = React.useRef<(HTMLDivElement | null)[]>([])

  const totalQuestions = questions.length
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

  // Handler for single-select questions
  const handleOptionSelect = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }))

    // Find current question index and scroll to next (only on large screens)
    if (isLargeScreen) {
      const currentIndex = questions.findIndex(q => q.id === questionId)
      if (currentIndex !== -1 && currentIndex < questions.length - 1) {
        setTimeout(() => {
          const nextIndex = currentIndex + 1
          setVisibleIndex(nextIndex)
          scrollToQuestion(nextIndex)
        }, 150) // Small delay to ensure state update completes
      }
    }
  }

  // Handler for single-select "Other" option
  const handleOtherSelect = (questionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: `other:${otherTexts[questionId] || ""}`,
    }))

    // Find current question index and scroll to next (only on large screens)
    if (isLargeScreen) {
      const currentIndex = questions.findIndex(q => q.id === questionId)
      if (currentIndex !== -1 && currentIndex < questions.length - 1) {
        setTimeout(() => {
          const nextIndex = currentIndex + 1
          setVisibleIndex(nextIndex)
          scrollToQuestion(nextIndex)
        }, 150)
      }
    }
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

  const scrollToQuestion = (index: number) => {
    const target = questionRefs.current[index]
    const container = containerRef.current
    if (target && container) {
      const targetRect = target.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      const scrollTop = container.scrollTop + (targetRect.top - containerRect.top)
      container.scrollTo({
        top: scrollTop,
        behavior: "smooth"
      })
    }
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
    // Format answers properly - convert "other" entries to "other:text" format
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

  if (questions.length === 0) return null

  return (
    <div
      className={cn(
        "flex w-full max-w-lg flex-col rounded-lg border bg-card text-card-foreground shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CircleHelp className="size-4 text-muted-foreground" />
          <span>Questions</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <button
            onClick={handlePrevious}
            disabled={visibleIndex === 0}
            className="p-0.5 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Previous question"
          >
            <ChevronUp className="size-4" />
          </button>
          <span className="min-w-[3.5rem] text-center">
            {visibleIndex + 1} of {totalQuestions}
          </span>
          <button
            onClick={handleNext}
            disabled={visibleIndex === totalQuestions - 1}
            className="p-0.5 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Next question"
          >
            <ChevronDown className="size-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Questions Content */}
      <div
        ref={containerRef}
        className="max-h-80 overflow-y-auto scroll-smooth"
      >
        {questions.map((question, questionIndex) => {
          const questionType = question.type || "select"
          const answer = answers[question.id]

          return (
            <div
              key={question.id}
              ref={(el) => { questionRefs.current[questionIndex] = el }}
              className={cn(
                "p-4",
                questionIndex < questions.length - 1 && "border-b border-dashed"
              )}
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
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
        <Button variant="ghost" size="sm" onClick={onSkip} disabled={isLoading || isBuilding}>
          Skip
        </Button>
        <Button
          size="sm"
          onClick={handleContinue}
          disabled={isLoading || isBuilding}
          className="bg-[#fbbf24] text-black hover:bg-[#fbbf24]/80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isBuilding ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Building
            </>
          ) : (
            <>
              Build
              <span className="flex items-center">
                <span className="">⌘</span>
                <CornerDownLeft className="size-4" />
              </span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
