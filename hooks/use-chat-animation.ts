"use client"

import { useState, useEffect } from "react"

interface ChatMessage {
  id: string
  text: string
  isBot: boolean
  delay: number
}

interface ChatScenario {
  title: string
  messages: ChatMessage[]
}

const chatScenarios: ChatScenario[] = [
  {
    title: "Hotel Reception",
    messages: [
      { id: "1", text: "Can I know how many types of rooms you offer?", isBot: false, delay: 1000 },
      {
        id: "2",
        text: "Good afternoon! Welcome to our hotel. I'd be delighted to assist you with check-in. May I have your reservation name?",
        isBot: true,
        delay: 2000,
      },
      { id: "3", text: "It's under Johnson.", isBot: false, delay: 1500 },
      {
        id: "4",
        text: "Perfect! I found your reservation, Mr. Johnson. You're in our deluxe suite on the 12th floor. Here's your key card!",
        isBot: true,
        delay: 2000,
      },
    ],
  },
  {
    title: "Restaurant Service",
    messages: [
      { id: "1", text: "What's your soup of the day?", isBot: false, delay: 1000 },
      {
        id: "2",
        text: "Today we have a delicious tomato basil soup and our signature mushroom bisque. Both are made fresh daily!",
        isBot: true,
        delay: 2000,
      },
      { id: "3", text: "I'll take the mushroom bisque, please.", isBot: false, delay: 1500 },
      {
        id: "4",
        text: "Excellent choice! One mushroom bisque coming right up. Would you like some fresh bread with that?",
        isBot: true,
        delay: 2000,
      },
    ],
  },
  {
    title: "Customer Support",
    messages: [
      { id: "1", text: "I'm having trouble with my account login.", isBot: false, delay: 1000 },
      {
        id: "2",
        text: "I'm sorry to hear you're having trouble! I'm here to help. Can you tell me what error message you're seeing?",
        isBot: true,
        delay: 2000,
      },
      {
        id: "3",
        text: "It says 'invalid credentials' but I'm sure my password is correct.",
        isBot: false,
        delay: 1500,
      },
      {
        id: "4",
        text: "Let me help you reset your password. I'll send a secure reset link to your email address right away.",
        isBot: true,
        delay: 2000,
      },
    ],
  },
]

export function useChatAnimation() {
  const [currentScenario, setCurrentScenario] = useState(0)
  const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    const scenario = chatScenarios[currentScenario]
    let messageIndex = 0
    let timeoutId: NodeJS.Timeout

    const showNextMessage = () => {
      if (messageIndex < scenario.messages.length) {
        const message = scenario.messages[messageIndex]

        setIsTyping(true)

        timeoutId = setTimeout(() => {
          setVisibleMessages((prev) => [...prev, message])
          setIsTyping(false)
          messageIndex++

          if (messageIndex < scenario.messages.length) {
            timeoutId = setTimeout(showNextMessage, message.delay)
          } else {
            // Wait before starting next scenario
            timeoutId = setTimeout(() => {
              setVisibleMessages([])
              setCurrentScenario((prev) => (prev + 1) % chatScenarios.length)
            }, 3000)
          }
        }, message.delay)
      }
    }

    // Reset and start animation
    setVisibleMessages([])
    timeoutId = setTimeout(showNextMessage, 1000)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [currentScenario])

  return {
    currentScenario: chatScenarios[currentScenario],
    visibleMessages,
    isTyping,
  }
}
