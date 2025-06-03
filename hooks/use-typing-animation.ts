"use client"

import { useState, useEffect } from "react"

interface UseTypingAnimationProps {
  texts: string[]
  typeSpeed?: number
  deleteSpeed?: number
  delayBetweenTexts?: number
  loop?: boolean
  cursorStyle?: "soft" | "hard"
  startDelay?: number
  shouldStart?: boolean
}

export function useTypingAnimation({
  texts,
  typeSpeed = 100,
  deleteSpeed = 50,
  delayBetweenTexts = 2000,
  loop = true,
  cursorStyle = "soft",
  startDelay = 0,
  shouldStart = true,
}: UseTypingAnimationProps) {
  const [displayText, setDisplayText] = useState("")
  const [currentTextIndex, setCurrentTextIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
    if (!shouldStart || texts.length === 0) return

    // Handle start delay
    if (!hasStarted && startDelay > 0) {
      const startTimeout = setTimeout(() => {
        setHasStarted(true)
      }, startDelay)
      return () => clearTimeout(startTimeout)
    } else if (!hasStarted) {
      setHasStarted(true)
    }
  }, [shouldStart, startDelay, hasStarted, texts.length])

  useEffect(() => {
    if (!hasStarted || texts.length === 0 || isComplete) return

    const currentText = texts[currentTextIndex]

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          // Typing
          if (displayText.length < currentText.length) {
            setDisplayText(currentText.slice(0, displayText.length + 1))
          } else {
            // Finished typing current text
            if (texts.length === 1) {
              setIsComplete(true)
              return
            }
            setTimeout(() => setIsDeleting(true), delayBetweenTexts)
          }
        } else {
          // Deleting
          if (displayText.length > 0) {
            setDisplayText(displayText.slice(0, -1))
          } else {
            // Finished deleting
            setIsDeleting(false)
            const nextIndex = (currentTextIndex + 1) % texts.length
            setCurrentTextIndex(nextIndex)

            if (!loop && nextIndex === 0) {
              setIsComplete(true)
            }
          }
        }
      },
      isDeleting ? deleteSpeed : typeSpeed,
    )

    return () => clearTimeout(timeout)
  }, [
    displayText,
    currentTextIndex,
    isDeleting,
    texts,
    typeSpeed,
    deleteSpeed,
    delayBetweenTexts,
    loop,
    isComplete,
    hasStarted,
  ])

  return { displayText, isComplete, cursorStyle, hasStarted }
}
