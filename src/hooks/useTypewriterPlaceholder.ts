"use client"

import { useState, useEffect, useRef } from "react"

const STATIC_PREFIX = "Ask Andy to "

const PROMPT_OPTIONS = [
    "build a 3-day full body routine",
    "build a training plan for Hyrox",
    "create a 6-day push pull legs split",
    "make a workout plan for weight loss",
    "create a 4-day upper/lower split",
    "build a home gym workout plan",
];

type AnimationState = "typing" | "pausing" | "deleting"

interface IUseTypewriterPlaceholderOptions {
  typingSpeed?: number // milliseconds per character
  deletingSpeed?: number // milliseconds per character
  pauseAfterTyping?: number // milliseconds to pause after completing an option
  pauseAfterDeleting?: number // milliseconds to pause after deleting an option
  enabled?: boolean // whether animation is enabled
  showPrefix?: boolean // whether to show "Ask Andy to" prefix
}

export function useTypewriterPlaceholder({
  typingSpeed = 50,
  deletingSpeed = 30,
  pauseAfterTyping = 2000,
  pauseAfterDeleting = 500,
  enabled = true,
  showPrefix = true,
}: IUseTypewriterPlaceholderOptions = {}) {
  const [currentOptionIndex, setCurrentOptionIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState("")
  const [animationState, setAnimationState] = useState<AnimationState>("typing")

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled) {
      // Reset to first option when disabled
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentOptionIndex(0)
      setDisplayedText("")
      setAnimationState("typing")
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      return
    }

    const currentOption = PROMPT_OPTIONS[currentOptionIndex]

    if (animationState === "typing") {
      if (displayedText.length < currentOption.length) {
        // Continue typing
        timeoutRef.current = setTimeout(() => {
          setDisplayedText(currentOption.slice(0, displayedText.length + 1))
        }, typingSpeed)
      } else {
        // Finished typing, pause before deleting
        timeoutRef.current = setTimeout(() => {
          setAnimationState("deleting")
        }, pauseAfterTyping)
      }
    } else if (animationState === "deleting") {
      if (displayedText.length > 0) {
        // Continue deleting
        timeoutRef.current = setTimeout(() => {
          setDisplayedText((prev) => prev.slice(0, -1))
        }, deletingSpeed)
      } else {
        // Finished deleting, move to next option
        timeoutRef.current = setTimeout(() => {
          setCurrentOptionIndex((prev) => (prev + 1) % PROMPT_OPTIONS.length)
          setDisplayedText("")
          setAnimationState("typing")
        }, pauseAfterDeleting)
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [
    animationState,
    displayedText,
    currentOptionIndex,
    typingSpeed,
    deletingSpeed,
    pauseAfterTyping,
    pauseAfterDeleting,
    enabled,
  ])

  const prefix = showPrefix ? STATIC_PREFIX : ""
  const placeholder = enabled ? `${prefix}${displayedText}` : `${prefix}build...`

  return placeholder
}
