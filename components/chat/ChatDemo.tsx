"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useChatAnimation } from "@/hooks/use-chat-animation";

export function ChatDemo() {
  const { currentScenario, visibleMessages, isTyping } = useChatAnimation();

  return (
    <Card className="bg-[#0F0F0F]/80 backdrop-blur-sm border-gray-600 shadow-2xl shadow-black/50 overflow-hidden">
      {/* Chat Header */}
      <div className="bg-[#2C2C2C] px-6 py-4 border-b border-gray-600">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <div className="ml-4 text-white font-medium">{currentScenario.title}</div>
        </div>
      </div>

      {/* Chat Messages */}
      <CardContent className="h-96 p-6 space-y-4 overflow-y-auto">
        {visibleMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isBot ? "justify-start" : "justify-end"} animate-fade-in`}
          >
            <div
              className={`max-w-xs px-4 py-3 rounded-2xl ${
                message.isBot 
                  ? "bg-[#2C2C2C] text-white rounded-bl-sm" 
                  : "bg-white text-gray-900 rounded-br-sm"
              }`}
            >
              <p className="text-sm leading-relaxed">{message.text}</p>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-[#2C2C2C] text-white px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Chat Input (Disabled for demo) */}
      <div className="border-t border-gray-600 p-4">
        <div className="flex space-x-3">
          <div className="flex-1 bg-[#2C2C2C] rounded-full px-4 py-2 text-gray-400 text-sm flex items-center">
            Type your message...
          </div>
          <Button size="sm" disabled className="rounded-full">
            Send
          </Button>
        </div>
      </div>

      {/* Scenario Indicators */}
      <div className="flex justify-center space-x-2 pb-4">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === (visibleMessages.length > 0 ? Math.floor(Date.now() / 10000) % 3 : 0)
                ? "bg-white"
                : "bg-white/30"
            }`}
          />
        ))}
      </div>
    </Card>
  );
} 