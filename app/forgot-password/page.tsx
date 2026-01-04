"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, ArrowLeft, CheckCircle } from "lucide-react"
import { useTypingAnimation } from "@/hooks/use-typing-animation"
import { supabase } from "@/supabaseClient"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { displayText: welcomeText, isComplete: welcomeComplete } = useTypingAnimation({
    texts: ["Reset Your Password"],
    typeSpeed: 80,
    loop: false,
    cursorStyle: "hard",
    shouldStart: true,
  })

  const { displayText: quipText } = useTypingAnimation({
    texts: [
      "Don't worry, it happens to the best of us.",
      "Even our coffee machine forgets its password sometimes.",
      "We'll have you back in faster than you can say 'espresso'.",
      "Password recovery: because memory is overrated.",
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
    setIsLoading(true)
    setError(null)
    try {
      // Use environment variable if available, otherwise use window.location.origin
      const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, '') // Remove trailing slash
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/reset-password`,
      })
      if (error) {
        setError(error.message)
        setIsLoading(false)
        return
      }
      setIsEmailSent(true)
    } catch (error) {
      setError("Failed to send reset email.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendEmail = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Use environment variable if available, otherwise use window.location.origin
      const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, '') // Remove trailing slash
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/reset-password`,
      })
      if (error) {
        setError(error.message)
      }
    } catch (error) {
      setError("Failed to resend email.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#171717] flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white">
        <div>
          <h1 className="text-2xl font-bold mb-16">RamahAI</h1>
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

      {/* Right Side - Reset Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Header */}
          <div className="lg:hidden text-center">
            <h1 className="text-2xl font-bold text-white mb-8">RamahAI</h1>
          </div>

          <Card className="bg-[#0F0F0F] border-gray-600 shadow-2xl shadow-black/50">
            <CardContent className="p-8">
              {!isEmailSent ? (
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">Forgot Password?</h2>
                    <p className="text-gray-400 text-sm">
                      No worries! Enter your email address
                      <br />
                      and we'll send you a reset link
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
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-white text-gray-900 hover:bg-gray-100 font-medium disabled:opacity-50"
                    >
                      {isLoading ? "Sending Reset Link..." : "Send Reset Link"}
                    </Button>
                  </form>

                  <div className="mt-6 text-center">
                    <Link
                      href="/login"
                      className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Sign In
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Check Your Email</h2>
                    <p className="text-gray-400 text-sm">
                      We've sent a password reset link to
                      <br />
                      <span className="text-white font-medium">{email}</span>
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-[#2C2C2C] border border-gray-600 rounded-lg p-4">
                      <h3 className="text-white font-medium mb-2">What's next?</h3>
                      <ul className="text-gray-400 text-sm space-y-1">
                        <li>• Check your email inbox (and spam folder)</li>
                        <li>• <strong className="text-yellow-400">Important:</strong> Click the reset link in <strong>this same browser</strong></li>
                        <li>• Create a new secure password</li>
                        <li>• Sign in with your new password</li>
                      </ul>
                    </div>

                    <div className="text-center text-sm text-gray-400">
                      {"Didn't receive the email? "}
                      <button
                        onClick={handleResendEmail}
                        disabled={isLoading}
                        className="text-white hover:underline font-medium disabled:opacity-50"
                      >
                        {isLoading ? "Sending..." : "Resend"}
                      </button>
                    </div>

                    <Button
                      asChild
                      variant="outline"
                      className="w-full bg-transparent border-gray-600 text-white hover:bg-gray-800"
                    >
                      <Link href="/login">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Sign In
                      </Link>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
