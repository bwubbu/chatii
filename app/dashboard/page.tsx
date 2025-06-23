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
  MessageCircle, Users, Clock, Star, TrendingUp, Calendar, 
  LogOut, Camera, Edit3, Activity, Heart, Shield,
  Zap, Target, CheckCircle
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

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [newUsername, setNewUsername] = useState("")
  const [editingUsername, setEditingUsername] = useState(false)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f10] via-[#1a1a1f] to-[#23232a] flex items-center justify-center">
        <div className="text-white text-lg">Loading your dashboard...</div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

              <Card className="bg-[#1a1a1f]/80 border-gray-700 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Satisfaction Score</p>
                      <p className="text-2xl font-bold text-white">
                        {userStats.satisfactionScore > 0 ? userStats.satisfactionScore.toFixed(1) : "N/A"}
                        {userStats.satisfactionScore > 0 && <span className="text-lg text-gray-400">/5</span>}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                      <Heart className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 mr-1" />
                    <span className="text-yellow-400 text-sm">
                      {userStats.satisfactionScore >= 4 ? "Excellent" : userStats.satisfactionScore >= 3 ? "Good" : "Rate your chats!"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a1f]/80 border-gray-700 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Avg Session</p>
                      <p className="text-2xl font-bold text-white">{userStats.avgSessionDuration}m</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-600/20 rounded-lg flex items-center justify-center">
                      <Clock className="w-6 h-6 text-yellow-400" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <Target className="w-4 h-4 text-green-400 mr-1" />
                    <span className="text-green-400 text-sm">Quality time</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quick Actions & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                             <CardContent className="space-y-4">
                 <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white justify-start">
                   <MessageCircle className="w-4 h-4 mr-2" />
                   Go to Past Conversations
                 </Button>
                 <Link href="/personas" className="block">
                   <Button className="w-full bg-green-600 hover:bg-green-700 text-white justify-start">
                     <Users className="w-4 h-4 mr-2" />
                     Browse All Personas
                   </Button>
                 </Link>
               </CardContent>
            </Card>

            {/* System Status */}
            <Card className="bg-[#1a1a1f]/80 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-400" />
                  Fairness AI Status
                </CardTitle>
                <CardDescription className="text-gray-400">
                  System health and your experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">AI Fairness Score</span>
                  <Badge className="bg-green-600 text-white">4.8/5</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">System Status</span>
                  <Badge variant="outline" className="border-green-500 text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    Online
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Response Quality</span>
                  <Badge className="bg-blue-600 text-white">Excellent</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Bias Detection</span>
                  <Badge className="bg-purple-600 text-white">Active</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Welcome Message for New Users */}
          {userStats && userStats.totalConversations === 0 && (
            <Card className="bg-gradient-to-r from-green-900/50 to-blue-900/50 border-green-500/50">
              <CardContent className="p-8 text-center">
                <div className="flex items-center justify-center mb-4">
                  <Star className="w-8 h-8 text-yellow-400 mr-2" />
                  <h3 className="text-2xl font-bold text-white">Welcome to Chatii!</h3>
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
        </div>
      </div>
    </div>
  )
} 