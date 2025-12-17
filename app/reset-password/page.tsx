"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react"
import { useTypingAnimation } from "@/hooks/use-typing-animation"
import { supabase } from "@/supabaseClient"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isValidToken, setIsValidToken] = useState(true)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")
  const accessToken = searchParams.get("access_token")
  const refreshToken = searchParams.get("refresh_token")
  const type = searchParams.get("type")

  const { displayText: welcomeText, isComplete: welcomeComplete } = useTypingAnimation({
    texts: ["Create New Password"],
    typeSpeed: 80,
    loop: false,
    cursorStyle: "hard",
    shouldStart: true,
  })

  const { displayText: quipText } = useTypingAnimation({
    texts: [
      "Make it strong, like our coffee.",
      "Something you'll remember, unlike where you put your keys.",
      "Mix it up with numbers, symbols, and uppercase letters.",
      "Your future self will thank you for this.",
    ],
    typeSpeed: 60,
    deleteSpeed: 30,
    delayBetweenTexts: 3000,
    loop: true,
    cursorStyle: "soft",
    startDelay: 500,
    shouldStart: welcomeComplete,
  })

  useEffect(() => {
    // Check if this is a password recovery request
    if (type === 'recovery' && accessToken && refreshToken) {
      // Set the session with the tokens from the URL
      const setSession = async () => {
        try {
          // Clear any existing session first
          await supabase.auth.signOut()
          
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          
          if (error) {
            console.error('Error setting session:', error)
            setError(`Session error: ${error.message}`)
            setIsValidToken(false)
          } else if (data.user) {
            // Double-check the user is valid
            const { data: userData, error: userError } = await supabase.auth.getUser()
            if (userError || !userData.user) {
              console.error('Error verifying user:', userError)
              setError('Unable to verify user identity. Please request a new reset link.')
              setIsValidToken(false)
            } else {
              setIsValidToken(true)
              setError(null)
            }
          } else {
            setError('Invalid session data received.')
            setIsValidToken(false)
          }
        } catch (error) {
          console.error('Error setting session:', error)
          setError('Failed to establish session. Please request a new reset link.')
          setIsValidToken(false)
        }
      }
      setSession()
    } else if (type === 'recovery') {
      // Recovery type but missing tokens
      setError('Incomplete reset link. Please request a new one.')
      setIsValidToken(false)
    } else {
      // No valid recovery parameters found
      setError('Invalid reset link format. Please request a new one.')
      setIsValidToken(false)
    }
  }, [type, accessToken, refreshToken])

  useEffect(() => {
    // Calculate password strength
    const calculateStrength = (pwd: string) => {
      let strength = 0
      if (pwd.length >= 8) strength += 1
      if (/[a-z]/.test(pwd)) strength += 1
      if (/[A-Z]/.test(pwd)) strength += 1
      if (/[0-9]/.test(pwd)) strength += 1
      if (/[^A-Za-z0-9]/.test(pwd)) strength += 1
      return strength
    }

    setPasswordStrength(calculateStrength(password))
  }, [password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError("Passwords do not match!")
      return
    }
    if (passwordStrength < 3) {
      setError("Please choose a stronger password")
      return
    }
    setIsLoading(true)
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError("Invalid or expired reset link. Please request a new one.")
        setIsLoading(false)
        return
      }

      // Update the user's password
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError(error.message)
        setIsLoading(false)
        return
      }
      setIsSuccess(true)
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (error) {
      setError("Failed to reset password. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const getStrengthColor = (strength: number) => {
    if (strength < 2) return "bg-red-500"
    if (strength < 4) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getStrengthText = (strength: number) => {
    if (strength < 2) return "Weak"
    if (strength < 4) return "Medium"
    return "Strong"
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-[#171717] flex items-center justify-center p-8">
        <Card className="bg-[#0F0F0F] border-gray-600 shadow-2xl shadow-black/50 w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Reset Link Issue</h2>
            <p className="text-gray-400 text-sm mb-4">
              {error || "This password reset link is invalid or has expired."}
            </p>
            <div className="bg-[#2C2C2C] border border-gray-600 rounded-lg p-4 mb-6 text-left">
              <h3 className="text-white font-medium mb-2 text-sm">Common causes:</h3>
              <ul className="text-gray-400 text-xs space-y-1">
                <li>• Using the link in a different browser</li>
                <li>• Link has expired (usually 1 hour)</li>
                <li>• Link was already used</li>
                <li>• Browser blocking cookies/storage</li>
              </ul>
            </div>
            <Button asChild className="w-full bg-white text-gray-900 hover:bg-gray-100">
              <Link href="/forgot-password">Request New Link</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
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
              {!isSuccess ? (
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">Reset Password</h2>
                    <p className="text-gray-400 text-sm">Enter your new password below</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Error message */}
                    {error && (
                      <div className="text-red-500 text-sm text-center">{error}</div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-gray-300 text-sm">
                        New Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter new password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 pr-10 bg-[#2C2C2C] border-gray-600 text-white placeholder-gray-400 focus:border-gray-500"
                          required
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {password && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Password strength</span>
                            <span
                              className={`${passwordStrength >= 3 ? "text-green-500" : passwordStrength >= 2 ? "text-yellow-500" : "text-red-500"}`}
                            >
                              {getStrengthText(passwordStrength)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(passwordStrength)}`}
                              style={{ width: `${(passwordStrength / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-gray-300 text-sm">
                        Confirm New Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10 pr-10 bg-[#2C2C2C] border-gray-600 text-white placeholder-gray-400 focus:border-gray-500"
                          required
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-red-500 text-xs">Passwords do not match</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading || password !== confirmPassword || passwordStrength < 3}
                      className="w-full bg-white text-gray-900 hover:bg-gray-100 font-medium disabled:opacity-50"
                    >
                      {isLoading ? "Updating Password..." : "Update Password"}
                    </Button>
                  </form>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Password Updated!</h2>
                    <p className="text-gray-400 text-sm mb-6">
                      Your password has been successfully updated.
                      <br />
                      Redirecting you to sign in...
                    </p>
                    <Button asChild className="w-full bg-white text-gray-900 hover:bg-gray-100">
                      <Link href="/login">Continue to Sign In</Link>
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
