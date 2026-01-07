"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/supabaseClient"
import { User } from "@supabase/supabase-js"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  MessageCircle, Users, TrendingUp, Calendar, 
  Camera, Edit3, Activity,
  Zap, Target, CheckCircle, Trophy, AlertCircle,
  Key, Copy, Eye, EyeOff
} from "lucide-react"
import Link from "next/link"

interface UserStats {
  totalConversations: number
  totalMessages: number
  favoritePersona: string
  avgSessionDuration: number
  lastActivity: string
  joinDate: string
  satisfactionScore: number
}

interface CompletedTrainingSession {
  id: string
  scenario_id: string
  started_at: string
  completed_at: string | null
  average_score: number | null
  overall_politeness: number | null
  overall_fairness: number | null
  overall_professionalism: number | null
  overall_empathy: number | null
  feedback_summary: string | null
  total_messages: number | null
  training_scenarios?: {
    title: string
    description: string
  }
}

interface APIKey {
  id: string
  name: string
  key?: string
  created_at: string
  usage_count: number
  rate_limit: number
  last_used?: string
  is_active?: boolean
  persona_id?: string
}

interface TrainingResponse {
  id: string
  session_id: string
  ai_message: string
  user_response: string
  message_number: number
  politeness_score: number
  fairness_score: number
  professionalism_score: number
  empathy_score: number
  overall_score: number
  strengths: string[]
  improvements: string[]
  detailed_feedback: string | null
}

interface SessionSummary {
  totalResponses: number
  averageScores: {
    politeness: number
    fairness: number
    likeability: number
    competence: number
    respectfulness: number
    trustworthiness: number
    overall: number
  }
  allScores: Array<{
    scores: {
      politeness: number
      fairness: number
      likeability: number
      competence: number
      respectfulness: number
      trustworthiness: number
      overall: number
    }
    strengths: string[]
    improvements: string[]
    detailedFeedback: string
    userResponse: string
    aiMessage: string
  }>
  allStrengths: string[]
  allImprovements: string[]
  overallFeedback: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [newUsername, setNewUsername] = useState("")
  const [editingUsername, setEditingUsername] = useState(false)
  const [completedSessions, setCompletedSessions] = useState<CompletedTrainingSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [selectedSession, setSelectedSession] = useState<CompletedTrainingSession | null>(null)
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [apiKeys, setApiKeys] = useState<APIKey[]>([])
  const [loadingApiKeys, setLoadingApiKeys] = useState(true)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const { toast } = useToast ? useToast() : { toast: () => {} }

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setAvatarUrl(user?.user_metadata?.avatar_url || null)
      setNewUsername(user?.user_metadata?.username || "")
      setLoading(false)
      
      if (user) {
        await fetchUserStats(user.id)
        await fetchCompletedTrainingSessions(user.id)
        await fetchApiKeys()
      }
    }
    getUser()
  }, [])

  const fetchUserStats = async (userId: string) => {
    try {
      // Fetch user's conversations first
      const conversationsResult = await supabase
        .from("conversations")
        .select("id, created_at, persona_id")
        .eq("user_id", userId)

             const userConversations = conversationsResult.data || []
       const conversationIds = userConversations.map(c => c.id)

       // Then fetch messages and feedback
       const [messagesResult, feedbackResult] = await Promise.all([
         conversationIds.length > 0 
           ? supabase.from("messages").select("id, created_at, conversation_id").in("conversation_id", conversationIds)
           : Promise.resolve({ data: [] }),
         supabase.from("feedback_questionnaire").select("politeness, fairness, respectfulness, created_at")
       ])
      const messages = messagesResult.data || []
      const feedback = feedbackResult.data || []

             // Calculate favorite persona
       const personaCounts: { [key: string]: number } = {}
       userConversations.forEach((conv: any) => {
         personaCounts[conv.persona_id] = (personaCounts[conv.persona_id] || 0) + 1
       })
       const favoritePersonaId = Object.keys(personaCounts).reduce((a, b) => 
         personaCounts[a] > personaCounts[b] ? a : b, Object.keys(personaCounts)[0] || ""
       )

      // Calculate satisfaction score
      const satisfactionScore = feedback.length > 0 
        ? feedback.reduce((sum, f) => sum + ((f.politeness + f.fairness + f.respectfulness) / 3), 0) / feedback.length
        : 0

      // Get last activity
      const lastActivity = messages.length > 0 
        ? new Date(Math.max(...messages.map(m => new Date(m.created_at).getTime()))).toISOString()
        : new Date().toISOString()

             const stats: UserStats = {
         totalConversations: userConversations.length,
         totalMessages: messages.length,
         favoritePersona: favoritePersonaId,
         avgSessionDuration: 8.5, // Mock data - would need session tracking
         lastActivity,
         joinDate: user?.created_at || new Date().toISOString(),
         satisfactionScore
       }

      setUserStats(stats)
    } catch (error) {
      console.error("Error fetching user stats:", error)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      if (!user) return
      const file = event.target.files?.[0]
      if (!file) return
      const fileExt = file.name.split('.').pop()
      const filePath = `avatars/${user.id}.${fileExt}`
      
      let { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
      if (uploadError) throw uploadError
      
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const publicUrl = data.publicUrl
      
      const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } })
      if (updateError) throw updateError
      
      setAvatarUrl(publicUrl)
      toast({ title: "Avatar updated successfully!" })
    } catch (error) {
      toast({ title: "Error uploading avatar", variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  const handleUsernameChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUsername.trim()) {
      toast({ title: "Username cannot be empty", variant: "destructive" })
      return
    }
    try {
      const { error } = await supabase.auth.updateUser({ data: { username: newUsername } })
      if (error) throw error
      setUser((prev) => prev ? { ...prev, user_metadata: { ...prev.user_metadata, username: newUsername } } : prev)
      setEditingUsername(false)
      toast({ title: "Username updated successfully!" })
    } catch (error) {
      toast({ title: "Error updating username", description: String(error), variant: "destructive" })
    }
  }

  const fetchCompletedTrainingSessions = async (userId: string) => {
    try {
      setLoadingSessions(true)
      const { data, error } = await supabase
        .from("training_sessions")
        .select(`
          *,
          training_scenarios (
            title,
            description
          )
        `)
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(10)

      if (error) throw error
      setCompletedSessions((data || []) as CompletedTrainingSession[])
    } catch (error) {
      console.error("Error fetching completed training sessions:", error)
    } finally {
      setLoadingSessions(false)
    }
  }

  const fetchSessionSummary = async (session: CompletedTrainingSession) => {
    try {
      setLoadingSummary(true)
      setSelectedSession(session)

      // Fetch all training responses for this session
      const { data: responses, error } = await supabase
        .from("training_responses")
        .select("*")
        .eq("session_id", session.id)
        .order("message_number", { ascending: true })

      if (error) throw error

      const trainingResponses = (responses || []) as TrainingResponse[]

      if (trainingResponses.length === 0) {
        // If no detailed responses, create summary from session data
        const summary: SessionSummary = {
          totalResponses: session.total_messages || 0,
          averageScores: {
            politeness: session.overall_politeness || 0,
            fairness: session.overall_fairness || 0,
            likeability: 0, // Not stored in session
            competence: session.overall_professionalism || 0,
            respectfulness: 0, // Not stored in session
            trustworthiness: 0, // Not stored in session
            overall: session.average_score || 0,
          },
          allScores: [],
          allStrengths: [],
          allImprovements: [],
          overallFeedback: session.feedback_summary || "No detailed feedback available.",
        }
        setSessionSummary(summary)
        return
      }

      // Calculate averages
      const avgPoliteness = trainingResponses.reduce((sum, r) => sum + r.politeness_score, 0) / trainingResponses.length
      const avgFairness = trainingResponses.reduce((sum, r) => sum + r.fairness_score, 0) / trainingResponses.length
      const avgProfessionalism = trainingResponses.reduce((sum, r) => sum + r.professionalism_score, 0) / trainingResponses.length
      const avgEmpathy = trainingResponses.reduce((sum, r) => sum + r.empathy_score, 0) / trainingResponses.length
      const avgOverall = trainingResponses.reduce((sum, r) => sum + r.overall_score, 0) / trainingResponses.length

      // Collect all strengths and improvements
      const allStrengthsSet = new Set<string>()
      const allImprovementsSet = new Set<string>()

      trainingResponses.forEach((r) => {
        if (r.strengths) {
          r.strengths.forEach((s) => allStrengthsSet.add(s))
        }
        if (r.improvements) {
          r.improvements.forEach((i) => allImprovementsSet.add(i))
        }
      })

      // Build summary
      const summary: SessionSummary = {
        totalResponses: trainingResponses.length,
        averageScores: {
          politeness: avgPoliteness,
          fairness: avgFairness,
          likeability: avgProfessionalism, // Using professionalism as proxy
          competence: avgProfessionalism,
          respectfulness: avgEmpathy, // Using empathy as proxy
          trustworthiness: avgOverall, // Using overall as proxy
          overall: avgOverall,
        },
        allScores: trainingResponses.map((r) => ({
          scores: {
            politeness: r.politeness_score,
            fairness: r.fairness_score,
            likeability: r.professionalism_score,
            competence: r.professionalism_score,
            respectfulness: r.empathy_score,
            trustworthiness: r.overall_score,
            overall: r.overall_score,
          },
          strengths: r.strengths || [],
          improvements: r.improvements || [],
          detailedFeedback: r.detailed_feedback || "",
          userResponse: r.user_response,
          aiMessage: r.ai_message,
        })),
        allStrengths: Array.from(allStrengthsSet),
        allImprovements: Array.from(allImprovementsSet),
        overallFeedback: session.feedback_summary || "Great job completing this training session!",
      }

      setSessionSummary(summary)
    } catch (error) {
      console.error("Error fetching session summary:", error)
      toast({ title: "Error loading session summary", variant: "destructive" })
    } finally {
      setLoadingSummary(false)
    }
  }

  const getScoreBadgeColor = (score: number | null) => {
    if (!score) return "bg-gray-600"
    if (score >= 8) return "bg-green-600"
    if (score >= 6) return "bg-yellow-600"
    return "bg-red-600"
  }

  const getScoreColor = (score: number | null) => {
    if (score === null || score === undefined) return "text-gray-400"
    if (score >= 8) return "text-green-400"
    if (score >= 6) return "text-yellow-400"
    return "text-red-400"
  }

  const fetchApiKeys = async () => {
    try {
      setLoadingApiKeys(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch("/api/api-keys", {
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const { apiKeys } = await response.json()
        setApiKeys(apiKeys || [])
      }
    } catch (error) {
      console.error("Error fetching API keys:", error)
    } finally {
      setLoadingApiKeys(false)
    }
  }

  const maskApiKey = (key: string) => {
    if (!key || key.length < 8) return "••••••••"
    const start = key.substring(0, 4)
    const end = key.substring(key.length - 4)
    return `${start}${"•".repeat(Math.max(8, key.length - 8))}${end}`
  }

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys)
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId)
    } else {
      newVisible.add(keyId)
    }
    setVisibleKeys(newVisible)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({ title: "Copied to clipboard!" })
    } catch (error) {
      toast({ title: "Failed to copy", variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f10] via-[#1a1a1f] to-[#23232a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    router.push("/login")
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f10] via-[#1a1a1f] to-[#23232a]">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Welcome back, {user?.user_metadata?.username || "User"}! 👋
              </h1>
              <p className="text-gray-400 text-lg">Here's what's happening with your AI conversations</p>
          </div>

          {/* Profile Section */}
          <Card className="bg-gradient-to-br from-[#1a1a1f] to-[#23232a] border-gray-700 backdrop-blur-sm shadow-xl">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side - Avatar & User Info */}
                <div className="flex flex-col items-center lg:items-start">
                {/* Avatar */}
                  <div className="relative mb-6">
                    <Avatar className="h-28 w-28 border-4 border-green-400/50 shadow-2xl ring-4 ring-green-500/20">
                    <AvatarImage src={avatarUrl || undefined} alt="Profile" />
                      <AvatarFallback className="text-3xl bg-gradient-to-br from-green-400 to-blue-500 text-white font-bold">
                      {user?.user_metadata?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="avatar-upload"
                      className="absolute -bottom-1 -right-1 bg-gradient-to-br from-green-600 to-green-700 rounded-full p-2.5 cursor-pointer shadow-xl hover:from-green-700 hover:to-green-800 transition-all hover:scale-110 border-2 border-[#1a1a1f]"
                    title="Change profile picture"
                  >
                    <Input 
                      id="avatar-upload" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleAvatarUpload} 
                      disabled={uploading} 
                    />
                    <Camera className="w-4 h-4 text-white" />
                  </label>
                </div>

                {/* User Info */}
                  <div className="w-full">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                    {editingUsername ? (
                        <form onSubmit={handleUsernameChange} className="flex gap-2 w-full md:w-auto">
                        <Input
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          className="bg-gray-800 border-gray-600 text-white"
                          placeholder="Enter username"
                        />
                        <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button 
                          type="button" 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setEditingUsername(false)}
                            className="border-gray-600 text-gray-300 hover:bg-gray-800"
                        >
                          Cancel
                        </Button>
                      </form>
                    ) : (
                        <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold text-white">
                          {user?.user_metadata?.username || "Anonymous User"}
                        </h2>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingUsername(true)}
                            className="text-gray-400 hover:text-white hover:bg-gray-800/50"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-[#23232a] rounded-lg border border-gray-700/50">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <MessageCircle className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-xs text-gray-400 mb-0.5">Email</p>
                          <p className="text-sm font-medium text-white">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-[#23232a] rounded-lg border border-gray-700/50">
                        <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-green-400" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-xs text-gray-400 mb-0.5">Joined</p>
                          <p className="text-sm font-medium text-white">
                            {new Date(userStats?.joinDate || user.created_at || "").toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                    </p>
                  </div>
                </div>
                      <div className="flex items-center gap-3 p-3 bg-[#23232a] rounded-lg border border-gray-700/50">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <Activity className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-xs text-gray-400 mb-0.5">Last Active</p>
                          <p className="text-sm font-medium text-white">
                            {userStats?.lastActivity ? new Date(userStats.lastActivity).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            }) : "Today"}
                          </p>
                 </div>
              </div>
                    </div>
                  </div>
                  </div>

                {/* Right Side - Stats */}
                {userStats && (
                  <div className="flex flex-col gap-4 h-full">
                    <Card className="bg-[#23232a] border-blue-500/20 backdrop-blur-sm hover:border-blue-500/40 transition-all flex-1">
                      <CardContent className="p-6 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
                            <MessageCircle className="w-6 h-6 text-blue-500/70" />
                          </div>
                          <div className="text-right">
                            <p className="text-gray-400 text-sm mb-1">Total Conversations</p>
                            <p className="text-2xl font-bold text-white">{userStats.totalConversations}</p>
                          </div>
                        </div>
                        <div className="pt-4 border-t border-gray-700/50 mt-auto">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-blue-500/70" />
                            <span className="text-blue-500/70 text-sm font-medium">Active user</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-[#23232a] border-blue-500/20 backdrop-blur-sm hover:border-blue-500/40 transition-all flex-1">
                      <CardContent className="p-6 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
                            <Zap className="w-6 h-6 text-blue-500/70" />
                          </div>
                          <div className="text-right">
                            <p className="text-gray-400 text-sm mb-1">Messages Sent</p>
                            <p className="text-2xl font-bold text-white">{userStats.totalMessages}</p>
                          </div>
                        </div>
                        <div className="pt-4 border-t border-gray-700/50 mt-auto">
                          <div className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4 text-blue-500/70" />
                            <span className="text-blue-500/70 text-sm font-medium">
                              {userStats.totalConversations > 0 ? (userStats.totalMessages / userStats.totalConversations).toFixed(1) : 0} avg per chat
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

            {/* Quick Actions & API Keys */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card className="bg-gradient-to-br from-[#1a1a1f] to-[#23232a] border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white font-semibold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Quick Actions
                </CardTitle>
                <CardDescription className="text-gray-400 text-sm">
                  Jump into your favorite activities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/developers" className="block">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white justify-start h-12 shadow-lg shadow-blue-500/20">
                    <Key className="w-5 h-5 mr-3" />
                    <span className="font-medium">Manage API Keys</span>
                  </Button>
                </Link>
                <Link href="/personas" className="block">
                  <Button className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white justify-start h-12 shadow-lg shadow-green-500/20">
                    <Users className="w-5 h-5 mr-3" />
                    <span className="font-medium">Browse All Personas</span>
                  </Button>
                </Link>
                <Link href="/training" className="block">
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white justify-start h-12 shadow-lg shadow-purple-500/20">
                    <Target className="w-5 h-5 mr-3" />
                    <span className="font-medium">Fairness Training Mode</span>
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* API Keys */}
            <Card className="bg-gradient-to-br from-[#1a1a1f] to-[#23232a] border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white font-semibold flex items-center gap-2">
                  <Key className="w-5 h-5 text-blue-400" />
                  Your API Keys
                </CardTitle>
                <CardDescription className="text-gray-400 text-sm">
                  Manage your API keys for integrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingApiKeys ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
                    <p className="text-gray-400 text-sm">Loading API keys...</p>
                  </div>
                ) : apiKeys.length === 0 ? (
                  <div className="text-center py-8">
                    <Key className="w-12 h-12 text-gray-600 mx-auto mb-3 opacity-50" />
                    <p className="text-gray-400 text-sm mb-4">No API keys generated yet</p>
                    <Link href="/developers">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Key className="w-4 h-4 mr-2" />
                        Generate API Key
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {apiKeys.map((apiKey) => (
                      <div
                        key={apiKey.id}
                        className="p-4 bg-[#23232a] rounded-lg border border-gray-700/50 hover:border-blue-500/50 transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white mb-1 truncate">
                              {apiKey.name}
                            </p>
                            <div className="flex items-center gap-2">
                              <code className="text-xs text-gray-300 font-mono bg-[#1a1a1f] px-2 py-1 rounded">
                                {visibleKeys.has(apiKey.id) && apiKey.key
                                  ? apiKey.key
                                  : maskApiKey(apiKey.key || apiKey.id)}
                              </code>
                              {apiKey.key && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleKeyVisibility(apiKey.id)}
                                  className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                                >
                                  {visibleKeys.has(apiKey.id) ? (
                                    <EyeOff className="w-3 h-3" />
                                  ) : (
                                    <Eye className="w-3 h-3" />
                                  )}
                                </Button>
                              )}
                              {apiKey.key && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyToClipboard(apiKey.key!)}
                                  className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          {apiKey.is_active === false && (
                            <Badge variant="outline" className="border-gray-600 text-gray-400 text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                          <span>Used {apiKey.usage_count} times</span>
                          {apiKey.last_used && (
                            <span>
                              Last: {new Date(apiKey.last_used).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Completed Training Sessions */}
            <Card className="bg-[#1a1a1f]/80 border-gray-700 backdrop-blur-sm">
              <CardHeader>
              <CardTitle className="text-white font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-400" />
                Completed Training Sessions
                </CardTitle>
              <CardDescription className="text-gray-400 text-sm">
                Review summaries and performance from your completed training sessions
                </CardDescription>
              </CardHeader>
            <CardContent>
              {loadingSessions ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading training sessions...</p>
                </div>
              ) : completedSessions.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="w-16 h-16 text-gray-600 mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold text-white mb-2">No completed training sessions</h3>
                  <p className="text-gray-400 mb-6">Complete training sessions to see your performance summaries here.</p>
                  <Link href="/training">
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                      <Target className="w-4 h-4 mr-2" />
                      Start Training
                  </Button>
                </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {completedSessions.map((session) => (
                    <Card 
                      key={session.id} 
                      className="bg-[#23232a] border-gray-700 cursor-pointer hover:border-purple-500/50 transition-all"
                      onClick={() => fetchSessionSummary(session)}
                    >
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="text-lg font-semibold text-white mb-1">
                                  {session.training_scenarios?.title || "Training Session"}
                                </h3>
                                <p className="text-sm text-gray-400">
                                  Completed {session.completed_at 
                                    ? new Date(session.completed_at).toLocaleDateString('en-US', { 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })
                                    : 'Recently'}
                                </p>
                              </div>
                              {session.average_score !== null && (
                                <Badge className={`${getScoreBadgeColor(session.average_score)} text-white text-sm px-3 py-1`}>
                                  {session.average_score.toFixed(1)}/10
                                </Badge>
                              )}
                            </div>
                            
                            {session.feedback_summary && (
                              <div className="mb-4 p-4 bg-[#1a1a1f] rounded-lg border border-gray-700">
                                <p className="text-sm text-gray-300 leading-relaxed line-clamp-2">
                                  {session.feedback_summary}
                                </p>
                              </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {session.overall_politeness !== null && (
                                <div>
                                  <p className="text-xs text-gray-400 mb-1">Politeness</p>
                                  <p className={`text-sm font-semibold ${getScoreColor(session.overall_politeness)}`}>
                                    {session.overall_politeness.toFixed(1)}/10
                                  </p>
                                </div>
                              )}
                              {session.overall_fairness !== null && (
                                <div>
                                  <p className="text-xs text-gray-400 mb-1">Fairness</p>
                                  <p className={`text-sm font-semibold ${getScoreColor(session.overall_fairness)}`}>
                                    {session.overall_fairness.toFixed(1)}/10
                                  </p>
                                </div>
                              )}
                              {session.overall_professionalism !== null && (
                                <div>
                                  <p className="text-xs text-gray-400 mb-1">Professionalism</p>
                                  <p className={`text-sm font-semibold ${getScoreColor(session.overall_professionalism)}`}>
                                    {session.overall_professionalism.toFixed(1)}/10
                                  </p>
                                </div>
                              )}
                              {session.overall_empathy !== null && (
                                <div>
                                  <p className="text-xs text-gray-400 mb-1">Empathy</p>
                                  <p className={`text-sm font-semibold ${getScoreColor(session.overall_empathy)}`}>
                                    {session.overall_empathy.toFixed(1)}/10
                                  </p>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-3">Click to view full summary</p>
                          </div>
                </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              </CardContent>
            </Card>

          {/* Session Summary Dialog */}
          <Dialog 
            open={!!selectedSession} 
            onOpenChange={(open) => {
              if (!open) {
                setSelectedSession(null)
                setSessionSummary(null)
              }
            }}
          >
            <DialogContent 
              className="max-w-4xl max-h-[90vh] bg-[#1a1a1f] border-gray-700 text-white overflow-hidden"
            >
              {loadingSummary ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
                  <DialogTitle className="text-2xl font-bold text-white mb-2">
                    Loading Summary...
                  </DialogTitle>
                  <DialogDescription className="text-gray-400 text-center">
                    Please wait while we load your training session results.
                  </DialogDescription>
                </div>
              ) : sessionSummary ? (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-white text-2xl">
                      <Trophy className="h-6 w-6 text-yellow-500" />
                      Training Session Results
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                      {selectedSession?.training_scenarios?.title || "Your complete performance evaluation"}
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="max-h-[70vh] pr-4">
                    <div className="space-y-6">
                      {/* Overall Score */}
                      <div className="text-center p-4 bg-[#23232a] rounded-lg">
                        <div className="text-sm text-gray-400 mb-2">Overall Average Score</div>
                        <div className={`text-5xl font-bold ${getScoreColor(sessionSummary.averageScores.overall)}`}>
                          {sessionSummary.averageScores.overall.toFixed(1)}/10
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          Based on {sessionSummary.totalResponses} response{sessionSummary.totalResponses !== 1 ? 's' : ''}
                        </div>
                      </div>

                      {/* Score Breakdown */}
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Score Breakdown</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-[#23232a] rounded-lg">
                            <span className="text-gray-300">Politeness</span>
                            <span className={`text-lg font-bold ${getScoreColor(sessionSummary.averageScores.politeness)}`}>
                              {sessionSummary.averageScores.politeness.toFixed(1)}/10
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-[#23232a] rounded-lg">
                            <span className="text-gray-300">Fairness</span>
                            <span className={`text-lg font-bold ${getScoreColor(sessionSummary.averageScores.fairness)}`}>
                              {sessionSummary.averageScores.fairness.toFixed(1)}/10
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-[#23232a] rounded-lg">
                            <span className="text-gray-300">Likeability</span>
                            <span className={`text-lg font-bold ${getScoreColor(sessionSummary.averageScores.likeability)}`}>
                              {sessionSummary.averageScores.likeability.toFixed(1)}/10
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-[#23232a] rounded-lg">
                            <span className="text-gray-300">Competence</span>
                            <span className={`text-lg font-bold ${getScoreColor(sessionSummary.averageScores.competence)}`}>
                              {sessionSummary.averageScores.competence.toFixed(1)}/10
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-[#23232a] rounded-lg">
                            <span className="text-gray-300">Respectfulness</span>
                            <span className={`text-lg font-bold ${getScoreColor(sessionSummary.averageScores.respectfulness)}`}>
                              {sessionSummary.averageScores.respectfulness.toFixed(1)}/10
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-[#23232a] rounded-lg">
                            <span className="text-gray-300">Trustworthiness</span>
                            <span className={`text-lg font-bold ${getScoreColor(sessionSummary.averageScores.trustworthiness)}`}>
                              {sessionSummary.averageScores.trustworthiness.toFixed(1)}/10
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Strengths */}
                      {sessionSummary.allStrengths.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            Strengths
                          </h3>
                          <div className="space-y-2">
                            {sessionSummary.allStrengths.map((strength, index) => (
                              <div key={index} className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                                <p className="text-sm text-gray-300">• {strength}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Areas for Improvement */}
                      {sessionSummary.allImprovements.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-yellow-500" />
                            Areas for Improvement
                          </h3>
                          <div className="space-y-2">
                            {sessionSummary.allImprovements.map((improvement, index) => (
                              <div key={index} className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                <p className="text-sm text-gray-300">• {improvement}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Overall Feedback */}
                      <div className="p-4 bg-[#23232a] rounded-lg border border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-400 mb-2">Overall Feedback</h3>
                        <p className="text-sm text-gray-300">{sessionSummary.overallFeedback}</p>
                      </div>

                      {/* Individual Response Scores */}
                      {sessionSummary.allScores.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-3">Individual Response Scores</h3>
                          <div className="space-y-3">
                            {sessionSummary.allScores.map((score, index) => (
                              <div key={index} className="p-3 bg-[#23232a] rounded-lg border border-gray-700">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs text-gray-400">Response #{index + 1}</span>
                                  <span className={`text-sm font-bold ${getScoreColor(score.scores.overall)}`}>
                                    {score.scores.overall.toFixed(1)}/10
                                  </span>
                                </div>
                                {score.userResponse && (
                                  <div className="mb-3 p-2 bg-[#1a1a1f] rounded border border-gray-600/50">
                                    <div className="text-xs text-gray-400 mb-1">Your Response:</div>
                                    <p className="text-sm text-gray-200 italic">"{score.userResponse}"</p>
                                  </div>
                                )}
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div>
                                    <span className="text-gray-500">Pol:</span>{" "}
                                    <span className={getScoreColor(score.scores.politeness)}>
                                      {score.scores.politeness.toFixed(1)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Fair:</span>{" "}
                                    <span className={getScoreColor(score.scores.fairness)}>
                                      {score.scores.fairness.toFixed(1)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Like:</span>{" "}
                                    <span className={getScoreColor(score.scores.likeability)}>
                                      {score.scores.likeability.toFixed(1)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Comp:</span>{" "}
                                    <span className={getScoreColor(score.scores.competence)}>
                                      {score.scores.competence.toFixed(1)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Resp:</span>{" "}
                                    <span className={getScoreColor(score.scores.respectfulness)}>
                                      {score.scores.respectfulness.toFixed(1)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Trust:</span>{" "}
                                    <span className={getScoreColor(score.scores.trustworthiness)}>
                                      {score.scores.trustworthiness.toFixed(1)}
                                    </span>
                                  </div>
                                </div>
                                {score.detailedFeedback && (
                                  <div className="mt-3 pt-3 border-t border-gray-700">
                                    <p className="text-xs text-gray-300 leading-relaxed">
                                      {score.detailedFeedback}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </>
              ) : null}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
} 