"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, Lock } from "lucide-react"
import { useTypingAnimation } from "@/hooks/use-typing-animation"
import { supabase } from "@/supabaseClient"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { displayText: welcomeText, isComplete: welcomeComplete } = useTypingAnimation({
    texts: ["Welcome back to Chatii"],
    typeSpeed: 80,
    loop: false,
    cursorStyle: "hard",
    shouldStart: true,
  })

  const { displayText: quipText } = useTypingAnimation({
    texts: [
      "Would you like water with that?",
      "Our soup of the day is coffee.",
      "If you need anything, dial '0'—unless it's my budget for overtime.",
      "The Wi-Fi password is 'password123'—don't tell anyone.",
      "Today's special is whatever doesn't make me cry.",
    ],
    typeSpeed: 60,
    deleteSpeed: 30,
    delayBetweenTexts: 3000,
    loop: true,
    cursorStyle: "soft",
    startDelay: 500,
    shouldStart: welcomeComplete,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      setError(error.message)
    } else {
      // Optionally redirect or refresh
      window.location.href = "/";
    }
    setLoading(false)
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google" })
    if (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#171717] flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white">
        <div>
          <h1 className="text-2xl font-bold mb-16">Chatii</h1>
          <div className="space-y-6">
            <h2 className="text-4xl font-bold leading-tight">
              {welcomeText}
              <span className="cursor-hard-blink">|</span>
            </h2>
            <p className="text-lg text-gray-300 min-h-[1.5rem]">
              {quipText}
              {welcomeComplete && <span className="cursor-soft-blink">|</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Header */}
          <div className="lg:hidden text-center">
            <h1 className="text-2xl font-bold text-white mb-8">Chatii</h1>
          </div>

          <Card className="bg-[#0F0F0F] border-gray-600 shadow-2xl shadow-black/50">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Sign In</h2>
                <p className="text-gray-400 text-sm">
                  Please enter your details
                  <br />
                  to access your account
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error message */}
                {error && (
                  <div className="text-red-500 text-sm text-center">{error}</div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300 text-sm">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-[#2C2C2C] border-gray-600 text-white placeholder-gray-400 focus:border-gray-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-gray-300 text-sm">
                      Password
                    </Label>
                    <Link href="/forgot-password" className="text-sm text-white hover:underline font-medium">
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 bg-[#2C2C2C] border-gray-600 text-white placeholder-gray-400 focus:border-gray-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="border-gray-600 data-[state=checked]:bg-white data-[state=checked]:text-gray-900"
                  />
                  <Label htmlFor="remember" className="text-gray-300 text-sm">
                    Remember Me
                  </Label>
                </div>

                <Button type="submit" className="w-full bg-white text-gray-900 hover:bg-gray-100 font-medium" disabled={loading}>
                  {loading ? "Signing In..." : "Sign In"}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-[#0F0F0F] text-gray-400">Or Continue With</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  className="w-full bg-white text-gray-900 border-gray-300 hover:bg-gray-100"
                  disabled={loading}
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>
              </form>

              <p className="text-center text-sm text-gray-400 mt-6">
                {"Don't Have an Account? "}
                <Link href="/signup" className="text-white hover:underline font-medium">
                  Sign Up
                </Link>
                {" for free!"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
