"use client";

/**
 * @module AnimatedRotatingText
 * Hero text that cycles through phrases ("Science Based", "Bodybuilding", etc.) with a slide animation.
 * Uses a hidden measurement element to reserve space so layout doesn't jump.
 * Depends on: React, CSS (animationWrapper, staticPhrase, incoming, outgoing).
 * Used by: programs/landing hero.
 */
import { useState, useEffect, useRef, useMemo } from "react"

/** No props. Renders "Train Popular [rotating phrase] Programs" with cycling phrases. */
export default function AnimatedRotatingText() {
  const [currentPhrase, setCurrentPhrase] = useState("Science Based")
  const [nextPhrase, setNextPhrase] = useState("")
  const [isAnimating, setIsAnimating] = useState(false)
  const [containerHeight, setContainerHeight] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const [headingHeight, setHeadingHeight] = useState(0)
  const phrasesRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const phrases = useMemo(() => [
    "Science Based",
    "Bodybuilding",
    "Powerbuilding",
    "Powerlifting",
    "Calisthenics",
    "Functional"
  ], []);

  // Reserve fixed space so layout doesn't jump: measure all phrases in a hidden element
  // and set a fixed height for the entire heading
  useEffect(() => {

    if (phrasesRef.current && headingRef.current) {
      // Measure the heading height
      const headingRect = headingRef.current.getBoundingClientRect()
      setHeadingHeight(headingRect.height)

      // Create a temporary element to measure all phrases
      const tempDiv = document.createElement("div")
      tempDiv.style.position = "absolute"
      tempDiv.style.visibility = "hidden"
      tempDiv.style.whiteSpace = "nowrap"
      tempDiv.style.fontSize = window.getComputedStyle(phrasesRef.current).fontSize
      tempDiv.style.fontWeight = window.getComputedStyle(phrasesRef.current).fontWeight
      tempDiv.style.fontFamily = window.getComputedStyle(phrasesRef.current).fontFamily

      document.body.appendChild(tempDiv)

      let maxWidth = 0
      let maxHeight = 0

      phrases.forEach((phrase) => {
        tempDiv.textContent = phrase
        const width = tempDiv.offsetWidth
        const height = tempDiv.offsetHeight

        maxWidth = Math.max(maxWidth, width)
        maxHeight = Math.max(maxHeight, height)
      })

      // Add a small buffer
      setContainerWidth(maxWidth + 20)
      setContainerHeight(maxHeight + 5)

      document.body.removeChild(tempDiv)
    }
  }, [phrases]);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentIndex = phrases.indexOf(currentPhrase)
      const nextIndex = (currentIndex + 1) % phrases.length
      setNextPhrase(phrases[nextIndex])
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentPhrase(phrases[nextIndex])
        setIsAnimating(false)
      }, 1200)
    }, 4000)

    return () => clearInterval(interval)
  }, [currentPhrase, phrases])

  return (
    <div
      className="sectionInfoCentered flex flex-row justify-center items-center max-sm:flex-col max-sm:mt-8"
      style={{
        height: headingHeight > 0 ? `${headingHeight}px` : "auto",
      }}
    >
      <h2 ref={headingRef} className="heading2Programs fixedHeading max-sm:flex-col max-sm:flex max-sm:w-full max-sm:items-center max-sm:justify-center">
        <span className="staticText dark:text-white">Train Popular</span>
        <span
          ref={phrasesRef}
          className="animationWrapper"
          style={{
            width: containerWidth > 0 ? `${containerWidth}px` : "auto",
            height: containerHeight > 0 ? `${containerHeight}px` : "auto",
          }}
        >
          {!isAnimating ? (
            <span className="staticPhrase" style={{ color: "#33bbcf" }}>
              {currentPhrase}
            </span>
          ) : (
            <>
              <span className="outgoing" style={{ color: "#33bbcf" }}>
                {currentPhrase}
              </span>
              <span className="incoming" style={{ color: "#33bbcf" }}>
                {nextPhrase}
              </span>
            </>
          )}
        </span>
        <span className="staticText dark:text-white">Programs</span>
      </h2>
    </div>
  )
}
