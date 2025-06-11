"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Home, Users, Sparkles, Zap, MessageCircle } from "lucide-react"
import { useChatAnimation } from "@/hooks/use-chat-animation"
import { useEffect, useState } from "react"
import { supabase } from "@/supabaseClient"

export default function LandingPage() {
  const { currentScenario, visibleMessages, isTyping } = useChatAnimation()

  return (
    <div className="min-h-screen bg-[#171717] relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 animate-float">
          <MessageCircle className="w-6 h-6 text-white/20" />
        </div>
        <div className="absolute top-40 right-32 animate-float-delayed">
          <Sparkles className="w-4 h-4 text-white/20" />
        </div>
        <div className="absolute bottom-32 left-32 animate-float">
          <Zap className="w-5 h-5 text-white/20" />
        </div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col lg:flex-row items-center justify-center gap-x-8 px-6 lg:px-12 py-12 lg:py-20">
        {/* Left Side - Content */}
        <div className="flex-1 max-w-xl mb-12 lg:mb-0">
          <div className="space-y-8">
            <div className="space-y-6">
              <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight">
                Welcome to
                <br />
                <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Chatii
                </span>
              </h1>

              <p className="text-xl lg:text-2xl text-gray-300 leading-relaxed">
                We strive to provide you the most fair and polite conversational bots no matter the occasion!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100 font-semibold px-8 py-4 text-lg">
                Try Them Out!
              </Button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto">
                  <MessageCircle className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-white font-semibold">Natural Conversations</h3>
                <p className="text-gray-400 text-sm">Human-like interactions that feel authentic</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto">
                  <Zap className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-white font-semibold">Lightning Fast</h3>
                <p className="text-gray-400 text-sm">Instant responses for seamless experiences</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-white font-semibold">Smart & Adaptive</h3>
                <p className="text-gray-400 text-sm">Learns and adapts to your specific needs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Chat Demo */}
        <div className="flex-1 max-w-xl w-full">
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
            <div className="h-96 p-6 space-y-4 overflow-y-auto">
              {visibleMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isBot ? "justify-start" : "justify-end"} animate-fade-in`}
                >
                  <div
                    className={`max-w-xs px-4 py-3 rounded-2xl ${
                      message.isBot ? "bg-[#2C2C2C] text-white rounded-bl-sm" : "bg-white text-gray-900 rounded-br-sm"
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
            </div>

            {/* Chat Input (Disabled for demo) */}
            <div className="border-t border-gray-600 p-4">
              <div className="flex space-x-3">
                <div className="flex-1 bg-[#2C2C2C] rounded-full px-4 py-2 text-gray-400 text-sm"></div>
                <Button size="sm" disabled className="rounded-full">
                  Send
                </Button>
              </div>
            </div>
          </Card>

          {/* Scenario Indicators */}
          <div className="flex justify-center space-x-2 mt-6">
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
        </div>
      </main>
    </div>
  )
}
