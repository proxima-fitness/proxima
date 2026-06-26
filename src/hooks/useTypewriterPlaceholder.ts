"use client"

/**
 * @module useTypewriterPlaceholder
 *
 * Provides a typewriter-style animated placeholder string for the AI chat
 * input field. Cycles through a set of example prompts, typing them out
 * character-by-character and then deleting them to reveal the next option,
 * giving users inspiration for what to ask the "Andy" AI agent.
 *
 * Depends on: React (useState, useEffect, useRef)
 * Used by: Chat input / PromptTemplate components in the program-builder flow
 */

import { useState, useEffect, useRef } from "react"

/** Static prefix shown before the animated portion of the placeholder. */
const STATIC_PREFIX = "Ask Andy to "

/** Example prompts the typewriter cycles through — order determines display sequence. */
const PROMPT_OPTIONS = [
    "build a 3-day full body routine",
    "build a training plan for Hyrox",
    "create a 6-day push pull legs split",
    "make a workout plan for weight loss",
    "create a 4-day upper/lower split",
    "build a home gym workout plan",
];

/** Current phase of the typewriter animation cycle. */
type TAnimationState = "waiting" | "typing" | "pausing" | "deleting"

/** Tuning knobs for the typewriter animation timing and behaviour. */
interface IUseTypewriterPlaceholderOptions {
  /** Delay between each character being typed (ms). */
  typingSpeed?: number
  /** Delay between each character being deleted (ms). */
  deletingSpeed?: number
  /** How long to hold the fully-typed prompt before deleting begins (ms). */
  pauseAfterTyping?: number
  /** How long to wait after full deletion before typing the next prompt (ms). */
  pauseAfterDeleting?: number
  /** Master toggle — when `false`, resets to a static fallback placeholder. */
  enabled?: boolean
  /** Whether to prepend the "Ask Andy to " prefix to the placeholder string. */
  showPrefix?: boolean
}

/**
 * Returns an animated placeholder string that types and deletes example
 * prompts in a loop, giving the user visual cues about what they can ask.
 *
 * The animation runs via `setTimeout` chains managed in a single `useEffect`.
 * When disabled, the effect only clears pending timeouts — render derives the
 * static fallback from `enabled` without resetting state synchronously.
 *
 * @param options - Timing, prefix, and enabled controls (all optional with sensible defaults).
 * @returns A placeholder string suitable for an `<input>` or `<textarea>` element.
 */
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
  const [animationState, setAnimationState] = useState<TAnimationState>("waiting")

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const needsResetRef = useRef(false)

  useEffect(() => {
    if (!enabled) {
      needsResetRef.current = true
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      return
    }

    if (needsResetRef.current) {
      needsResetRef.current = false
      timeoutRef.current = setTimeout(() => {
        setCurrentOptionIndex(0)
        setDisplayedText("")
        setAnimationState("waiting")
      }, 0)
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
      }
    }

    if (animationState === "waiting") {
      timeoutRef.current = setTimeout(() => {
        setAnimationState("typing")
      }, 2000)
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
      }
    }

    const currentOption = PROMPT_OPTIONS[currentOptionIndex]

    if (animationState === "typing") {
      if (displayedText.length < currentOption.length) {
        timeoutRef.current = setTimeout(() => {
          setDisplayedText(currentOption.slice(0, displayedText.length + 1))
        }, typingSpeed)
      } else {
        timeoutRef.current = setTimeout(() => {
          setAnimationState("deleting")
        }, pauseAfterTyping)
      }
    } else if (animationState === "deleting") {
      if (displayedText.length > 0) {
        timeoutRef.current = setTimeout(() => {
          setDisplayedText((prev) => prev.slice(0, -1))
        }, deletingSpeed)
      } else {
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

  if (!enabled) {
    return `${prefix}build...`
  }

  if (animationState === "waiting") return "Loading..."

  return `${prefix}${displayedText}`
}
