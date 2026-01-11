"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, Lock, User } from "lucide-react"
import { useTypingAnimation } from "@/hooks/use-typing-animation"
import { supabase } from "@/supabaseClient"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function SignUpForm() {
  const searchParams = useSearchParams()
  const isOAuthComplete = searchParams.get('complete_profile') === 'true'
  const oauthProvider = searchParams.get('oauth')
  
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [nationality, setNationality] = useState<string>("")
  const [age, setAge] = useState<string>("")
  const [race, setRace] = useState<string>("")
  const [gender, setGender] = useState<string>("")
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isOAuthUser, setIsOAuthUser] = useState(false)

  // Check if user is authenticated via OAuth and needs to complete profile
  useEffect(() => {
    const checkOAuthUser = async () => {
      if (isOAuthComplete) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setIsOAuthUser(true)
          // Pre-fill email and username from OAuth user
          setEmail(user.email || "")
          setUsername(user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split('@')[0] || "")
          // OAuth users don't need password
          setPassword("oauth-user")
          setConfirmPassword("oauth-user")
        }
      }
    }
    checkOAuthUser()
  }, [isOAuthComplete])

  const { displayText: welcomeText, isComplete: welcomeComplete } = useTypingAnimation({
    texts: ["Welcome to RamahAI"],
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
    startDelay: 500, // Small delay after welcome message completes
    shouldStart: welcomeComplete,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    
    // Validate demographic information (required for both regular and OAuth signup)
    if (!nationality || !age || !race || !gender) {
      setError("Please fill in all demographic information (Nationality, Age, Race, and Gender).")
      return
    }
    const ageNum = parseInt(age)
    if (isNaN(ageNum) || ageNum <= 0 || ageNum >= 150) {
      setError("Please enter a valid age.")
      return
    }
    
    if (!agreeToTerms) {
      setError("You must agree to the terms.")
      return
    }

    setLoading(true)

    // Handle OAuth users who just need to complete their profile
    if (isOAuthUser) {
      try {
        // Get current authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          setError("You must be signed in to complete your profile. Please try signing in again.")
          setLoading(false)
          return
        }

        // Update username in auth metadata if provided
        if (username && username.trim() !== "") {
          await supabase.auth.updateUser({
            data: { username: username.trim() }
          })
        }

        // Create user profile via API route
        const response = await fetch("/api/user-profiles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: user.id,
            nationality,
            age: ageNum,
            race,
            gender,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          console.error("Error creating user profile:", result)
          const errorDetails = result.details || result.error || 'Unknown error'
          const errorCode = result.code ? ` (Error code: ${result.code})` : ''
          setError(`Failed to save profile: ${errorDetails}${errorCode}. Please contact support if this issue persists.`)
          setLoading(false)
        } else {
          setSuccess("Profile completed successfully! Redirecting...")
          // Redirect to home page after a short delay
          setTimeout(() => {
            window.location.href = "/"
          }, 1500)
        }
      } catch (apiError: any) {
        console.error("Error calling profile API:", apiError)
        setError("Failed to save profile. Please contact support.")
        setLoading(false)
      }
      return
    }

    // Regular signup flow (non-OAuth users)
    // Validate email
    if (!email || email.trim() === "") {
      setError("Please enter an email address.")
      setLoading(false)
      return
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.")
      setLoading(false)
      return
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match!")
      setLoading(false)
      return
    }
    
    const trimmedEmail = email.trim()
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: { username },
      },
    })
    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }
    
    // If signup successful, create user profile via API route
    if (signUpData.user) {
      try {
        const response = await fetch("/api/user-profiles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: signUpData.user.id,
            nationality,
            age: ageNum,
            race,
            gender,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          console.error("Error creating user profile:", result)
          // Show more detailed error message
          const errorDetails = result.details || result.error || 'Unknown error'
          const errorCode = result.code ? ` (Error code: ${result.code})` : ''
          setError(`Account created but failed to save profile: ${errorDetails}${errorCode}. Please contact support if this issue persists.`)
        } else {
          setSuccess("Check your email for a confirmation link!")
        }
      } catch (apiError: any) {
        console.error("Error calling profile API:", apiError)
        setError("Account created but failed to save profile. Please contact support.")
      }
    } else {
      setSuccess("Check your email for a confirmation link!")
    }
    setLoading(false)
  }

  const handleGoogleSignUp = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({ 
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })
      
      if (error) {
        // Check for specific error types
        if (error.message?.includes('provider is not enabled') || error.message?.includes('Unsupported provider')) {
          setError("Google sign-in is not enabled. Please contact support or use email sign-up instead.")
        } else {
          setError(error.message || "Failed to sign in with Google. Please try again.")
        }
        setLoading(false)
      }
      // If successful, the user will be redirected to Google, so we don't setLoading(false) here
      // The redirect will happen automatically
    } catch (err: any) {
      console.error("Google sign-up error:", err)
      if (err?.message?.includes('provider is not enabled') || err?.message?.includes('Unsupported provider')) {
        setError("Google sign-in is not enabled. Please contact support or use email sign-up instead.")
      } else {
        setError("An error occurred during Google sign-up. Please try again.")
      }
      setLoading(false)
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

      {/* Right Side - Sign Up Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Header */}
          <div className="lg:hidden text-center">
            <h1 className="text-2xl font-bold text-white mb-8">RamahAI</h1>
          </div>

          <Card className="bg-[#0F0F0F] border-gray-600 shadow-2xl shadow-black/50">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {isOAuthUser ? "Complete Your Profile" : "Sign Up"}
                </h2>
                <p className="text-gray-400 text-sm">
                  {isOAuthUser 
                    ? "Please provide some information to personalize your experience"
                    : "Create an account to RamahAI to its fullest!"}
                </p>
              </div>

              {/* Error/Success message */}
              {error && (
                <div className="text-red-500 text-sm text-center">{error}</div>
              )}
              {success && (
                <div className="text-green-500 text-sm text-center">{success}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {!isOAuthUser && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-gray-300 text-sm">
                        Username
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="username"
                          type="text"
                          placeholder="Enter a username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="pl-10 bg-[#2C2C2C] border-gray-600 text-white placeholder-gray-400 focus:border-gray-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-300 text-sm">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter an email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 bg-[#2C2C2C] border-gray-600 text-white placeholder-gray-400 focus:border-gray-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-gray-300 text-sm">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter a password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 bg-[#2C2C2C] border-gray-600 text-white placeholder-gray-400 focus:border-gray-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-gray-300 text-sm">
                        Confirm Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Confirm your password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10 bg-[#2C2C2C] border-gray-600 text-white placeholder-gray-400 focus:border-gray-500"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {isOAuthUser && (
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-gray-300 text-sm">
                      Username (Optional)
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="username"
                        type="text"
                        placeholder="Enter a username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-10 bg-[#2C2C2C] border-gray-600 text-white placeholder-gray-400 focus:border-gray-500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Signed in as: {email}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="nationality" className="text-gray-300 text-sm">
                    Nationality
                  </Label>
                  <Select value={nationality} onValueChange={(value) => {
                    setNationality(value);
                    setRace(""); // Reset race when nationality changes
                  }} required>
                    <SelectTrigger className="bg-[#2C2C2C] border-gray-600 text-white focus:border-gray-500">
                      <SelectValue placeholder="Select your nationality" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2C2C2C] border-gray-600 text-white">
                      <SelectItem value="Malaysia">Malaysia</SelectItem>
                      <SelectItem value="Sweden">Sweden</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age" className="text-gray-300 text-sm">
                    Age
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="Enter your age"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="bg-[#2C2C2C] border-gray-600 text-white placeholder-gray-400 focus:border-gray-500"
                    min="1"
                    max="149"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="race" className="text-gray-300 text-sm">
                    Race
                  </Label>
                  <Select value={race} onValueChange={setRace} required>
                    <SelectTrigger className="bg-[#2C2C2C] border-gray-600 text-white focus:border-gray-500">
                      <SelectValue placeholder="Select your race" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2C2C2C] border-gray-600 text-white">
                      {nationality === "Malaysia" ? (
                        <>
                          <SelectItem value="Malay">Malay</SelectItem>
                          <SelectItem value="Malaysian Chinese">Malaysian Chinese</SelectItem>
                          <SelectItem value="Malaysian Indian">Malaysian Indian</SelectItem>
                        </>
                      ) : nationality === "Sweden" ? (
                        <SelectItem value="Swedish">Swedish</SelectItem>
                      ) : (
                        <>
                          <SelectItem value="Malay">Malay</SelectItem>
                          <SelectItem value="Malaysian Chinese">Malaysian Chinese</SelectItem>
                          <SelectItem value="Malaysian Indian">Malaysian Indian</SelectItem>
                          <SelectItem value="Swedish">Swedish</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-gray-300 text-sm">
                    Gender
                  </Label>
                  <Select value={gender} onValueChange={setGender} required>
                    <SelectTrigger className="bg-[#2C2C2C] border-gray-600 text-white focus:border-gray-500">
                      <SelectValue placeholder="Select your gender" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2C2C2C] border-gray-600 text-white">
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-xs text-gray-300 leading-relaxed">
                    <strong className="text-blue-400">Privacy & Data Usage:</strong> The demographic information you provide is used solely to personalize your AI chat experience. We do not use this data for malicious purposes, advertising, or sharing with third parties. Your information helps the AI adapt its communication style to better serve you.
                  </p>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={agreeToTerms}
                    onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
                    className="border-gray-600 data-[state=checked]:bg-white data-[state=checked]:text-gray-900 mt-1"
                  />
                  <Label htmlFor="terms" className="text-gray-300 text-sm leading-relaxed">
                    I agree to our Terms of Service and Privacy Policy
                  </Label>
                </div>

                <Button
                  type="submit"
                  disabled={!agreeToTerms || loading}
                  className="w-full bg-white text-gray-900 hover:bg-gray-100 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading 
                    ? (isOAuthUser ? "Completing Profile..." : "Signing Up...") 
                    : (isOAuthUser ? "Complete Profile" : "Sign Up")}
                </Button>

                {!isOAuthUser && (
                  <>
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
                      onClick={handleGoogleSignUp}
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
                  </>
                )}
              </form>

              <p className="text-center text-sm text-gray-400 mt-6">
                {"Already Have an Account? "}
                <Link href="/login" className="text-white hover:underline font-medium">
                  Sign In
                </Link>
                {" here!"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#171717] flex">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <SignUpForm />
    </Suspense>
  )
}
