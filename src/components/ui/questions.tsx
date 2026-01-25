"use client"

import * as React from "react"
import { ChevronUp, ChevronDown, CircleHelp, CornerDownLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface IQuestionOption {
  id: string
  label: string
}

export interface IQuestion {
  id: string
  question: string
  options: IQuestionOption[]
  allowOther?: boolean
}

interface IQuestionsProps {
  questions: IQuestion[]
  onComplete?: (answers: Record<string, string | string[]>) => void
  onSkip?: () => void
  className?: string
}

export function Questions({
  questions,
  onComplete,
  onSkip,
  className,
}: IQuestionsProps) {
  const [answers, setAnswers] = React.useState<Record<string, string>>({})
  const [otherTexts, setOtherTexts] = React.useState<Record<string, string>>({})
  const [visibleIndex, setVisibleIndex] = React.useState(0)

  const containerRef = React.useRef<HTMLDivElement>(null)
  const questionRefs = React.useRef<(HTMLDivElement | null)[]>([])

  const totalQuestions = questions.length
  const letterKeys = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"]

  const handleOptionSelect = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }))

    // Find current question index and scroll to next
    const currentIndex = questions.findIndex(q => q.id === questionId)
    if (currentIndex !== -1 && currentIndex < questions.length - 1) {
      setTimeout(() => {
        const nextIndex = currentIndex + 1
        setVisibleIndex(nextIndex)
        scrollToQuestion(nextIndex)
      }, 150) // Small delay to ensure state update completes
    }
  }

  const handleOtherSelect = (questionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: `other:${otherTexts[questionId] || ""}`,
    }))

    // Find current question index and scroll to next
    const currentIndex = questions.findIndex(q => q.id === questionId)
    if (currentIndex !== -1 && currentIndex < questions.length - 1) {
      setTimeout(() => {
        const nextIndex = currentIndex + 1
        setVisibleIndex(nextIndex)
        scrollToQuestion(nextIndex)
      }, 150)
    }
  }

  const handleOtherTextChange = (questionId: string, text: string) => {
    setOtherTexts((prev) => ({
      ...prev,
      [questionId]: text,
    }))
    if (answers[questionId]?.startsWith("other:")) {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: `other:${text}`,
      }))
    }
  }

  const scrollToQuestion = (index: number) => {
    const target = questionRefs.current[index]
    if (target && containerRef.current) {
      target.scrollIntoView({ behavior: "smooth", block: "start" })
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
    onComplete?.(answers)
  }, [onComplete, answers])

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
          const selectedAnswer = answers[question.id]
          const isOtherSelected = selectedAnswer?.startsWith("other:")

          return (
            <div
              key={question.id}
              ref={(el) => { questionRefs.current[questionIndex] = el }}
              className={cn(
                "p-4",
                questionIndex < questions.length - 1 && "border-b border-dashed"
              )}
            >
              <p className="mb-3 text-sm font-semibold">
                {questionIndex + 1}. {question.question}
              </p>

              {/* Options */}
              <div className="flex flex-col gap-1">
                {question.options.map((option, optionIndex) => {
                  const isSelected = selectedAnswer === option.id
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleOptionSelect(question.id, option.id)}
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
                      onClick={() => handleOtherSelect(question.id)}
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
                          value={otherTexts[question.id] || ""}
                          onChange={(e) =>
                            handleOtherTextChange(question.id, e.target.value)
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
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
        <Button variant="ghost" size="sm" onClick={onSkip}>
          Skip
        </Button>
        <Button
          size="sm"
          onClick={handleContinue}
          className="bg-[#fbbf24] text-black hover:bg-[#fbbf24]/80"
        >
          Build
          <span className="flex items-center">
            <span className="">⌘</span>
            <CornerDownLeft className="size-4" />
          </span>
        </Button>
      </div>
    </div>
  )
}
