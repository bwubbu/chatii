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
  MessageCircle, Users, Clock, Star, TrendingUp, Calendar, 
  LogOut, Camera, Edit3, Activity, Heart,
  Zap, Target, CheckCircle, Trophy, BarChart3, AlertCircle, Loader2
} from "lucide-react"
import Link from "next/link"

interface UserStats {
  totalConversations: number
  totalMessages: number
  favoritePersona: string
  lastActivity: string
  joinDate: string
  trainingStats?: {
    totalSessions: number
    averageScore: number
    completedSessions: any[]
  }
}

interface Score {
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
  userResponse?: string
  aiMessage?: string
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
  allScores: Score[]
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
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
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

       // Then fetch messages
       const messagesResult = conversationIds.length > 0 
         ? await supabase.from("messages").select("id, created_at, conversation_id").in("conversation_id", conversationIds)
         : { data: [] }
      const messages = messagesResult.data || []

             // Calculate favorite persona
       const personaCounts: { [key: string]: number } = {}
       userConversations.forEach((conv: any) => {
         personaCounts[conv.persona_id] = (personaCounts[conv.persona_id] || 0) + 1
       })
       const favoritePersonaId = Object.keys(personaCounts).reduce((a, b) => 
         personaCounts[a] > personaCounts[b] ? a : b, Object.keys(personaCounts)[0] || ""
       )

      // Get last activity
      const lastActivity = messages.length > 0 
        ? new Date(Math.max(...messages.map(m => new Date(m.created_at).getTime()))).toISOString()
        : new Date().toISOString()

      // Fetch training sessions
      const trainingSessionsResult = await supabase
        .from("training_sessions")
        .select(
          `
          *,
          training_scenarios (
            title
          )
        `
        )
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(10)

      const completedSessions = trainingSessionsResult.data || []
      const trainingAverageScore = completedSessions.length > 0
        ? completedSessions.reduce((sum: number, s: any) => sum + (s.average_score || 0), 0) / completedSessions.length
        : 0

             const stats: UserStats = {
         totalConversations: userConversations.length,
         totalMessages: messages.length,
         favoritePersona: favoritePersonaId,
         lastActivity,
         joinDate: user?.created_at || new Date().toISOString(),
         trainingStats: {
           totalSessions: completedSessions.length,
           averageScore: trainingAverageScore,
           completedSessions: completedSessions
         }
       }

      setUserStats(stats)
    } catch (error) {
      console.error("Error fetching user stats:", error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
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

  const fetchSessionSummary = async (sessionId: string) => {
    setIsLoadingSummary(true)
    setSessionSummary(null)
    
    try {
      console.log("Fetching session summary for session:", sessionId)
      
      // Fetch all training responses for this session
      const { data: responses, error } = await supabase
        .from("training_responses")
        .select("*")
        .eq("session_id", sessionId)
        .order("message_number", { ascending: true })

      if (error) {
        console.error("Error fetching session responses:", error)
        console.error("Error details:", JSON.stringify(error, null, 2))
        toast({ title: "Error loading session summary", variant: "destructive" })
        setIsLoadingSummary(false)
        return
      }

      console.log("Fetched responses:", responses?.length || 0, "responses")
      console.log("Sample response:", responses?.[0])

      if (!responses || responses.length === 0) {
        console.warn("No responses found for session:", sessionId)
        toast({ title: "No responses found for this session", variant: "destructive" })
        setIsLoadingSummary(false)
        return
      }

      // Reconstruct scores from database (handle both old and new schema)
      const allScores: Score[] = responses.map((resp, index) => {
        try {
          // Safely get numeric values, defaulting to 0 if null/undefined
          const getNumeric = (val: any, fallback: number = 0) => {
            if (val === null || val === undefined) return fallback;
            const num = Number(val);
            return isNaN(num) ? fallback : num;
          };

          // Safely get array values
          const getArray = (val: any): string[] => {
            if (Array.isArray(val)) return val;
            if (typeof val === 'string') {
              try {
                const parsed = JSON.parse(val);
                return Array.isArray(parsed) ? parsed : [];
              } catch {
                return [];
              }
            }
            return [];
          };

          const score: Score = {
            scores: {
              politeness: getNumeric(resp.politeness_score),
              fairness: getNumeric(resp.fairness_score),
              likeability: getNumeric(resp.likeability_score, getNumeric(resp.empathy_score, getNumeric(resp.overall_score))),
              competence: getNumeric(resp.competence_score, getNumeric(resp.professionalism_score, getNumeric(resp.overall_score))),
              respectfulness: getNumeric(resp.respectfulness_score, getNumeric(resp.politeness_score, getNumeric(resp.overall_score))),
              trustworthiness: getNumeric(resp.trustworthiness_score, getNumeric(resp.overall_score)),
              overall: getNumeric(resp.overall_score),
            },
            strengths: getArray(resp.strengths),
            improvements: getArray(resp.improvements),
            detailedFeedback: resp.detailed_feedback || "",
            userResponse: resp.user_response || "",
            aiMessage: resp.ai_message || "",
          };

          return score;
        } catch (err) {
          console.error(`Error processing response ${index}:`, err, resp);
          // Return a default score structure to prevent crash
          return {
            scores: {
              politeness: 0,
              fairness: 0,
              likeability: 0,
              competence: 0,
              respectfulness: 0,
              trustworthiness: 0,
              overall: 0,
            },
            strengths: [],
            improvements: [],
            detailedFeedback: "Error loading feedback for this response",
            userResponse: resp.user_response || "",
            aiMessage: resp.ai_message || "",
          };
        }
      })

      console.log("Reconstructed scores:", allScores.length, "scores")

      // Calculate averages with safety checks
      const totalResponses = allScores.length
      if (totalResponses === 0) {
        toast({ title: "No valid responses found for this session", variant: "destructive" })
        setIsLoadingSummary(false)
        return
      }

      const averageScores = {
        politeness: allScores.reduce((sum, s) => sum + (s.scores.politeness || 0), 0) / totalResponses,
        fairness: allScores.reduce((sum, s) => sum + (s.scores.fairness || 0), 0) / totalResponses,
        likeability: allScores.reduce((sum, s) => sum + (s.scores.likeability || 0), 0) / totalResponses,
        competence: allScores.reduce((sum, s) => sum + (s.scores.competence || 0), 0) / totalResponses,
        respectfulness: allScores.reduce((sum, s) => sum + (s.scores.respectfulness || 0), 0) / totalResponses,
        trustworthiness: allScores.reduce((sum, s) => sum + (s.scores.trustworthiness || 0), 0) / totalResponses,
        overall: allScores.reduce((sum, s) => sum + (s.scores.overall || 0), 0) / totalResponses,
      }

      // Validate averages are numbers
      Object.keys(averageScores).forEach(key => {
        const value = averageScores[key as keyof typeof averageScores]
        if (isNaN(value) || !isFinite(value)) {
          averageScores[key as keyof typeof averageScores] = 0
        }
      })

      // Aggregate all strengths and improvements
      const allStrengths = Array.from(
        new Set(allScores.flatMap((s) => s.strengths))
      )
      const allImprovements = Array.from(
        new Set(allScores.flatMap((s) => s.improvements))
      )

      // Generate overall feedback - improved and more concise
      const topScore = Math.max(
        averageScores.politeness,
        averageScores.fairness,
        averageScores.likeability,
        averageScores.competence,
        averageScores.respectfulness,
        averageScores.trustworthiness
      );
      const lowestScore = Math.min(
        averageScores.politeness,
        averageScores.fairness,
        averageScores.likeability,
        averageScores.competence,
        averageScores.respectfulness,
        averageScores.trustworthiness
      );
      
      const getTopMetric = () => {
        if (topScore === averageScores.politeness) return "politeness";
        if (topScore === averageScores.fairness) return "fairness";
        if (topScore === averageScores.likeability) return "likeability";
        if (topScore === averageScores.competence) return "competence";
        if (topScore === averageScores.respectfulness) return "respectfulness";
        return "trustworthiness";
      };
      
      const overallFeedback = `You completed ${totalResponses} response${totalResponses !== 1 ? 's' : ''} with an overall score of ${averageScores.overall.toFixed(1)}/10. ${
        averageScores.overall >= 8
          ? `Outstanding performance! Your ${getTopMetric()} was particularly strong.`
          : averageScores.overall >= 6
          ? `Solid effort! Continue building on your strengths while focusing on areas that scored below ${lowestScore.toFixed(1)}.`
          : `Keep practicing! Focus on the improvement areas below to enhance your skills.`
      }`

      const summary: SessionSummary = {
        totalResponses,
        averageScores,
        allScores,
        allStrengths,
        allImprovements,
        overallFeedback,
      }

      console.log("Generated summary:", summary)
      console.log("Summary validation:", {
        totalResponses: summary.totalResponses,
        allScoresLength: summary.allScores.length,
        hasAverageScores: !!summary.averageScores,
        allStrengthsLength: summary.allStrengths.length,
        allImprovementsLength: summary.allImprovements.length,
      })

      // Validate summary before setting
      if (!summary || !summary.allScores || summary.allScores.length === 0) {
        console.error("Invalid summary generated:", summary)
        toast({ 
          title: "Error generating summary", 
          description: "Summary data is invalid or incomplete",
          variant: "destructive" 
        })
        setIsLoadingSummary(false)
        return
      }

      setSessionSummary(summary)
      console.log("Session summary set successfully")
    } catch (error) {
      console.error("Error fetching session summary:", error)
      console.error("Error details:", error)
      toast({ 
        title: "Error loading session summary", 
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive" 
      })
      setSessionSummary(null)
    } finally {
      setIsLoadingSummary(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-400"
    if (score >= 6) return "text-yellow-400"
    return "text-red-400"
  }

  const handleSessionClick = (session: any) => {
    fetchSessionSummary(session.id)
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Welcome back, {user?.user_metadata?.username || "User"}! 👋
              </h1>
              <p className="text-gray-400 text-lg">Here's what's happening with your AI conversations</p>
            </div>
                         <Button
               onClick={handleLogout}
               className="bg-red-600 hover:bg-red-700 text-white"
             >
               <LogOut className="w-4 h-4 mr-2" />
               Logout
             </Button>
          </div>

          {/* Profile Section */}
          <Card className="bg-[#1a1a1f]/80 border-gray-700 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Avatar */}
                <div className="relative">
                  <Avatar className="h-24 w-24 border-4 border-green-400 shadow-xl">
                    <AvatarImage src={avatarUrl || undefined} alt="Profile" />
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-green-400 to-blue-500 text-white">
                      {user?.user_metadata?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute -bottom-2 -right-2 bg-green-600 rounded-full p-2 cursor-pointer shadow-lg hover:bg-green-700 transition-colors"
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
                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                    {editingUsername ? (
                      <form onSubmit={handleUsernameChange} className="flex gap-2">
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
                        >
                          Cancel
                        </Button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h2 className="text-3xl font-bold text-white">
                          {user?.user_metadata?.username || "Anonymous User"}
                        </h2>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingUsername(true)}
                          className="text-gray-400 hover:text-white"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 text-gray-300">
                    <p className="flex items-center justify-center md:justify-start gap-2">
                      <span className="text-gray-400">Email:</span> {user.email}
                    </p>
                    <p className="flex items-center justify-center md:justify-start gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-400">Joined:</span> 
                      {new Date(userStats?.joinDate || user.created_at || "").toLocaleDateString()}
                    </p>
                    <p className="flex items-center justify-center md:justify-start gap-2">
                      <Activity className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-400">Last active:</span> 
                      {userStats?.lastActivity ? new Date(userStats.lastActivity).toLocaleDateString() : "Today"}
                    </p>
                  </div>
                </div>

                                 {/* Quick Actions */}
                 <div className="flex flex-col gap-3">
                   <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                     <MessageCircle className="w-4 h-4 mr-2" />
                     Go to Past Conversations
                   </Button>
                   <Link href="/personas">
                     <Button className="bg-green-600 hover:bg-green-700 text-white w-full">
                       <Users className="w-4 h-4 mr-2" />
                       Browse All Personas
                     </Button>
                   </Link>
                 </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          {userStats && (
            <div className={`grid grid-cols-1 md:grid-cols-2 ${userStats.trainingStats?.totalSessions > 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
              <Card className="bg-[#1a1a1f]/80 border-gray-700 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Conversations</p>
                      <p className="text-2xl font-bold text-white">{userStats.totalConversations}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
                    <span className="text-green-400 text-sm">Active user</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a1f]/80 border-gray-700 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Messages Sent</p>
                      <p className="text-2xl font-bold text-white">{userStats.totalMessages}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                      <Zap className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <TrendingUp className="w-4 h-4 text-blue-400 mr-1" />
                    <span className="text-blue-400 text-sm">
                      {userStats.totalConversations > 0 ? (userStats.totalMessages / userStats.totalConversations).toFixed(1) : 0} avg per chat
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Training Stats Card - Only show if user has completed training sessions */}
              {userStats.trainingStats && userStats.trainingStats.totalSessions > 0 && (
                <Card className="bg-[#1a1a1f]/80 border-gray-700 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Training Score</p>
                        <p className={`text-2xl font-bold ${
                          userStats.trainingStats.averageScore >= 8 ? "text-green-400" :
                          userStats.trainingStats.averageScore >= 6 ? "text-yellow-400" : "text-red-400"
                        }`}>
                          {userStats.trainingStats.averageScore.toFixed(1)}/10
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-purple-400" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center">
                      <BarChart3 className="w-4 h-4 text-purple-400 mr-1" />
                      <span className="text-purple-400 text-sm">{userStats.trainingStats.totalSessions} sessions</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <Card className="bg-[#1a1a1f]/80 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Quick Actions
              </CardTitle>
              <CardDescription className="text-gray-400">
                Jump into your favorite activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white justify-start h-auto py-4">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-semibold">Past Conversations</div>
                      <div className="text-xs opacity-80">View your chat history</div>
                    </div>
                  </div>
                </Button>
                <Link href="/personas" className="block">
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white justify-start h-auto py-4">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5" />
                      <div className="text-left">
                        <div className="font-semibold">Browse Personas</div>
                        <div className="text-xs opacity-80">Explore AI characters</div>
                      </div>
                    </div>
                  </Button>
                </Link>
                <Link href="/training" className="block">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white justify-start h-auto py-4">
                    <div className="flex items-center gap-3">
                      <Target className="w-5 h-5" />
                      <div className="text-left">
                        <div className="font-semibold">Training Mode</div>
                        <div className="text-xs opacity-80">Practice customer service</div>
                      </div>
                    </div>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Welcome Message for New Users */}
          {userStats && userStats.totalConversations === 0 && (
            <Card className="bg-gradient-to-r from-green-900/50 to-blue-900/50 border-green-500/50">
              <CardContent className="p-8 text-center">
                <div className="flex items-center justify-center mb-4">
                  <Star className="w-8 h-8 text-yellow-400 mr-2" />
                  <h3 className="text-2xl font-bold text-white">Welcome to RamahAI!</h3>
                  <Star className="w-8 h-8 text-yellow-400 ml-2" />
                </div>
                <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                  You're all set to experience fair and ethical AI conversations. 
                  Start by choosing a persona and begin your first chat!
                </p>
                <Link href="/personas">
                  <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white">
                    <Users className="w-5 h-5 mr-2" />
                    Browse Personas to Start
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Training Sessions Section */}
          {userStats?.trainingStats && userStats.trainingStats.totalSessions > 0 && (
            <div className="mt-8">
              <Card className="bg-[#1a1a1f]/80 border-gray-700 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-400" />
                        Training Sessions
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Your completed training sessions and performance
                      </CardDescription>
                    </div>
                    <Link href="/training">
                      <Button variant="outline" size="sm" className="border-purple-500 text-purple-400 hover:bg-purple-500/10">
                        View All
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Training Stats Summary */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-[#23232a] rounded-lg">
                      <div className="text-sm text-gray-400 mb-1">Total Sessions</div>
                      <div className="text-2xl font-bold text-white">{userStats.trainingStats.totalSessions}</div>
                    </div>
                    <div className="p-4 bg-[#23232a] rounded-lg">
                      <div className="text-sm text-gray-400 mb-1">Average Score</div>
                      <div className={`text-2xl font-bold ${
                        userStats.trainingStats.averageScore >= 8 ? "text-green-400" :
                        userStats.trainingStats.averageScore >= 6 ? "text-yellow-400" : "text-red-400"
                      }`}>
                        {userStats.trainingStats.averageScore.toFixed(1)}/10
                      </div>
                    </div>
                  </div>

                  {/* Completed Sessions List */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white mb-3">Recent Completed Sessions</h3>
                    {userStats.trainingStats.completedSessions.slice(0, 5).map((session: any) => (
                      <Card 
                        key={session.id}
                        className="bg-[#23232a] border-gray-700 hover:border-purple-500/50 transition-all cursor-pointer"
                        onClick={() => handleSessionClick(session)}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-white">
                                {session.training_scenarios?.title || "Training Session"}
                              </h4>
                              <p className="text-xs text-gray-400">
                                {new Date(session.completed_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Trophy className="h-4 w-4 text-yellow-500" />
                              <span className={`text-lg font-bold ${
                                session.average_score >= 8 ? "text-green-400" :
                                session.average_score >= 6 ? "text-yellow-400" : "text-red-400"
                              }`}>
                                {session.average_score?.toFixed(1) || "N/A"}/10
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {userStats.trainingStats.completedSessions.length > 5 && (
                      <Link href="/training">
                        <Button variant="ghost" className="w-full text-purple-400 hover:text-purple-300">
                          View All {userStats.trainingStats.totalSessions} Sessions →
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Session Summary Dialog */}
          <Dialog 
            open={isLoadingSummary || !!sessionSummary} 
            onOpenChange={(open) => {
              if (!open && !isLoadingSummary) {
                setSessionSummary(null)
              }
            }}
          >
            <DialogContent 
              className="max-w-4xl max-h-[90vh] bg-[#1a1a1f] border-gray-700 text-white overflow-hidden"
              onInteractOutside={(e) => {
                if (isLoadingSummary) {
                  e.preventDefault()
                }
              }}
              onEscapeKeyDown={(e) => {
                if (isLoadingSummary) {
                  e.preventDefault()
                }
              }}
            >
              {isLoadingSummary ? (
                // Loading State
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 text-purple-500 animate-spin mb-4" />
                  <DialogTitle className="text-2xl font-bold text-white mb-2">
                    Loading Summary...
                  </DialogTitle>
                  <DialogDescription className="text-gray-400 text-center">
                    Please wait while we load your training session results.
                  </DialogDescription>
                </div>
              ) : sessionSummary ? (
                // Summary Content
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-white text-2xl">
                      <Trophy className="h-6 w-6 text-yellow-500" />
                      Training Session Results
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Your complete performance evaluation
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

                      {/* Close Button */}
                      <Button
                        onClick={() => setSessionSummary(null)}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white mt-4"
                      >
                        Close
                      </Button>
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