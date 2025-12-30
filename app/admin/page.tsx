"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/supabaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart2, User, MessageCircle, Download, Activity, Users, Flag, ListChecks, 
  PlusCircle, Pencil, Trash2, Shield, Heart, Brain, TrendingUp, AlertTriangle,
  CheckCircle, Clock, Target, Zap, Eye, ThumbsUp, Star, UserCheck, Key,
  Mail, X, Check
} from "lucide-react"
import { Line, Bar, Doughnut, Radar } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
} from "chart.js"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PersonaForm, PersonaFormData } from "@/components/personas/PersonaForm"
import FeedbackTrainingDashboard from "@/components/admin/FeedbackTrainingDashboard"
import BiasDetectionInfo from "@/components/admin/BiasDetectionInfo"

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, ArcElement, RadialLinearScale
)

const ADMIN_EMAIL = "kyrodahero123@gmail.com"

interface AnalyticsData {
  totalUsers: number
  totalConversations: number
  totalMessages: number
  activeUsers24h: number
  avgSessionDuration: number
  fairnessScore: number
  userSatisfaction: number
  flaggedMessages: number
  conversationsByPersona: { [key: string]: number }
  personaNameMap: { [key: string]: string }
  usersByDemographics: {
    age: { [key: string]: number }
    gender: { [key: string]: number }
    role: { [key: string]: number }
  }
  surveyResults: {
    politeness: number
    fairness: number
    respectfulness: number
    trustworthiness: number
    competence: number
    likeability: number
  }
  timeSeriesData: {
    labels: string[]
    conversations: number[]
    users: number[]
    satisfaction: number[]
  }
  feedbackMessages: Array<{
    id: string
    open_ended: string
    created_at: string
    persona_id: string
    politeness: number
    fairness: number
    respectfulness: number
  }>
}

interface APIKey {
  id: string;
  name: string;
  key?: string;
  created_at: string;
  usage_count: number;
  rate_limit: number;
  user_id?: string;
  user_email?: string;
  last_used?: string;
  is_active?: boolean;
  persona_id?: string;
}

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [personas, setPersonas] = useState<any[]>([])
  const [flaggedMessages, setFlaggedMessages] = useState<any[]>([])
  const [isPersonaFormOpen, setIsPersonaFormOpen] = useState(false)
  const [editingPersona, setEditingPersona] = useState<PersonaFormData | null>(null)
  const [apiKeys, setApiKeys] = useState<APIKey[]>([])
  const [personaRequests, setPersonaRequests] = useState<any[]>([])
  const [editingRequest, setEditingRequest] = useState<any>(null)
  const [adminNotes, setAdminNotes] = useState("")
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
      if (!user || user.email !== ADMIN_EMAIL) {
        router.replace("/")
      }
    }
    getUser()
  }, [router])

  useEffect(() => {
    if (user && user.email === ADMIN_EMAIL) {
      fetchAnalyticsData()
      if (activeTab === "personas") {
        fetchPersonas()
      }
      if (activeTab === "moderation") {
        fetchFlaggedMessages()
      }
      if (activeTab === "api-keys") {
        fetchAPIKeys()
      }
      if (activeTab === "persona-requests") {
        fetchPersonaRequests()
      }
    }
  }, [user, activeTab])

  const fetchAnalyticsData = async () => {
    try {
      // Fetch all data in parallel
      const [
        conversationsResult,
        messagesResult,
        feedbackResult,
        flaggedResult,
        demographicsResult,
        personasResult
      ] = await Promise.all([
        supabase.from("conversations").select("id, persona_id, created_at, user_id"),
        supabase.from("messages").select("id, conversation_id, created_at"),
        supabase.from("feedback_questionnaire").select("id, open_ended, created_at, persona_id, politeness, fairness, respectfulness, trustworthiness, competence, likeability"),
        supabase.from("flagged_messages").select("id, created_at"),
        supabase.from("demographics").select("*"),
        supabase.from("personas").select("id, title")
      ])

      const conversations = conversationsResult.data || []
      const messages = messagesResult.data || []
      const feedback = feedbackResult.data || []
      const flagged = flaggedResult.data || []
      const demographics = demographicsResult.data || []
      const personas = personasResult.data || []

      // Calculate metrics
      const uniqueUsers = new Set(conversations.map(c => c.user_id)).size
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const activeUsers24h = conversations.filter(c => new Date(c.created_at) > last24h).length

      // Persona distribution
      const conversationsByPersona: { [key: string]: number } = {}
      conversations.forEach(c => {
        conversationsByPersona[c.persona_id] = (conversationsByPersona[c.persona_id] || 0) + 1
      })

      // Create persona name mapping for display
      const personaNameMap: { [key: string]: string } = {}
      personas.forEach(p => {
        personaNameMap[p.id] = p.title || 'Unknown Persona'
      })

      // Demographics analysis
      const usersByDemographics = {
        age: {} as { [key: string]: number },
        gender: {} as { [key: string]: number },
        role: {} as { [key: string]: number }
      }

      demographics.forEach(d => {
        if (d.age) {
          const ageGroup = d.age < 25 ? '18-24' : d.age < 35 ? '25-34' : d.age < 45 ? '35-44' : d.age < 55 ? '45-54' : '55+'
          usersByDemographics.age[ageGroup] = (usersByDemographics.age[ageGroup] || 0) + 1
        }
        if (d.gender) {
          usersByDemographics.gender[d.gender] = (usersByDemographics.gender[d.gender] || 0) + 1
        }
        if (d.role) {
          usersByDemographics.role[d.role] = (usersByDemographics.role[d.role] || 0) + 1
        }
      })

      // Survey results averages
      const surveyResults = {
        politeness: feedback.reduce((sum, f) => sum + (f.politeness || 0), 0) / Math.max(feedback.length, 1),
        fairness: feedback.reduce((sum, f) => sum + (f.fairness || 0), 0) / Math.max(feedback.length, 1),
        respectfulness: feedback.reduce((sum, f) => sum + (f.respectfulness || 0), 0) / Math.max(feedback.length, 1),
        trustworthiness: feedback.reduce((sum, f) => sum + (f.trustworthiness || 0), 0) / Math.max(feedback.length, 1),
        competence: feedback.reduce((sum, f) => sum + (f.competence || 0), 0) / Math.max(feedback.length, 1),
        likeability: feedback.reduce((sum, f) => sum + (f.likeability || 0), 0) / Math.max(feedback.length, 1)
      }

      // Time series data (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        return date.toISOString().split('T')[0]
      })

      const timeSeriesData = {
        labels: last7Days.map(date => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        conversations: last7Days.map(date => 
          conversations.filter(c => c.created_at.startsWith(date)).length
        ),
        users: last7Days.map(date => 
          new Set(conversations.filter(c => c.created_at.startsWith(date)).map(c => c.user_id)).size
        ),
        satisfaction: last7Days.map(date => {
          const dayFeedback = feedback.filter(f => f.created_at.startsWith(date))
          return dayFeedback.length > 0 
            ? dayFeedback.reduce((sum, f) => sum + ((f.politeness + f.fairness + f.respectfulness) / 3), 0) / dayFeedback.length
            : 0
        })
      }

      const analyticsData: AnalyticsData = {
        totalUsers: uniqueUsers,
        totalConversations: conversations.length,
        totalMessages: messages.length,
        activeUsers24h,
        avgSessionDuration: 8.5, // Mock data - would need session tracking
        fairnessScore: surveyResults.fairness,
        userSatisfaction: (surveyResults.politeness + surveyResults.fairness + surveyResults.respectfulness) / 3,
        flaggedMessages: flagged.length,
        conversationsByPersona,
        personaNameMap,
        usersByDemographics,
        surveyResults,
        timeSeriesData,
        feedbackMessages: feedback.filter(f => f.open_ended && f.open_ended.trim().length > 0)
      }

      setAnalyticsData(analyticsData)
    } catch (error) {
      console.error("Error fetching analytics data:", error)
    }
  }

  const fetchPersonas = async () => {
    // Debug: Check current user
    const { data: { user } } = await supabase.auth.getUser()
    console.log('Current user:', user?.email)
    
    const { data, error } = await supabase.from("personas").select("*")
    if (error) {
      console.error('Fetch personas error:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
    } else {
      console.log('Fetched personas:', data)
      setPersonas(data || [])
    }
  }

  const fetchFlaggedMessages = async () => {
    console.log('Fetching flagged messages...')
    const { data, error } = await supabase.from("flagged_messages").select("*").order('created_at', { ascending: false })
    if (error) {
      console.error('Error fetching flagged messages:', error)
    } else {
      console.log('Fetched flagged messages:', data)
      setFlaggedMessages(data || [])
    }
  }

  const handlePersonaSubmit = async (data: PersonaFormData) => {
    let avatarUrl = (editingPersona as any)?.avatar_url || null;
    if (data.avatarImage) {
      const fileExt = data.avatarImage.name.split('.').pop();
      const filePath = `avatars/${data.title.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, data.avatarImage, { upsert: true });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        avatarUrl = urlData.publicUrl;
      }
    }
    if (editingPersona) {
      const { error } = await supabase.from('personas').update({
        title: data.title,
        description: data.description,
        avatar_url: avatarUrl,
        is_active: data.isActive,
        system_prompt: data.systemPrompt,
      }).eq('id', editingPersona.id);
      if (error) console.error('Update error:', error);
    } else {
      // Debug: Check current user before insert
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Inserting as user:', user?.email)
      
      const { error } = await supabase.from('personas').insert({
        title: data.title,
        description: data.description,
        avatar_url: avatarUrl,
        is_active: data.isActive,
        system_prompt: data.systemPrompt,
      });
      if (error) {
        console.error('Insert error:', error);
        console.error('Insert error details:', JSON.stringify(error, null, 2));
      }
    }
    setIsPersonaFormOpen(false);
    setEditingPersona(null);
    fetchPersonas();
  };

  const handleEditPersona = (persona: any) => {
    // Convert database column names to form field names
    const formData = {
      id: persona.id,
      title: persona.title,
      description: persona.description,
      isActive: persona.is_active,
      systemPrompt: persona.system_prompt,
      avatar_url: persona.avatar_url, // Keep this for reference in submit
    };
    setEditingPersona(formData)
    setIsPersonaFormOpen(true)
  }

  const handleDeletePersona = async (id: string) => {
    await supabase.from('personas').delete().eq('id', id)
    fetchPersonas()
  }

  const fetchAPIKeys = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch("/api/api-keys", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        let data: any;
        try {
          const responseText = await response.text();
          if (!responseText || responseText.trim().length === 0) {
            console.error("Empty response from API keys endpoint");
            return;
          }
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error("Failed to parse API keys response:", parseError);
          return;
        }
        setApiKeys(data.apiKeys || []);
      } else {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error("Failed to fetch API keys:", response.status, errorText);
      }
    } catch (error) {
      console.error("Error fetching API keys:", error);
    }
  };


  const deleteAPIKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Please log in to delete API keys");
        return;
      }

      const response = await fetch("/api/api-keys", {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ keyId }),
      });

      if (response.ok) {
        // Refresh the API keys list
        await fetchAPIKeys();
      } else {
        const error = await response.json();
        alert(`Failed to delete API key: ${error.error}`);
      }
    } catch (error: any) {
      console.error("Error deleting API key:", error);
      alert(`Error: ${error.message}`);
    }
  };


  const fetchPersonaRequests = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch("/api/persona-requests", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPersonaRequests(data.requests || []);
      } else {
        console.error("Failed to fetch persona requests:", response.status);
      }
    } catch (error) {
      console.error("Error fetching persona requests:", error);
    }
  };

  const updatePersonaRequest = async (requestId: string, status: string, notes?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Please log in to update requests");
        return;
      }

      const response = await fetch("/api/persona-requests", {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          status,
          admin_notes: notes || adminNotes || null,
        }),
      });

      if (response.ok) {
        await fetchPersonaRequests();
        setEditingRequest(null);
        setAdminNotes("");
        alert("Request updated successfully");
      } else {
        const error = await response.json();
        alert(`Failed to update request: ${error.error}`);
      }
    } catch (error: any) {
      console.error("Error updating persona request:", error);
      alert(`Error: ${error.message}`);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>
  }

  if (!analyticsData) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading analytics...</div>
  }

  // Chart configurations
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      x: { grid: { color: "#333" }, ticks: { color: "#888" } },
      y: { grid: { color: "#333" }, ticks: { color: "#888" } },
    },
  }

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      r: {
        angleLines: { color: "#333" },
        grid: { color: "#333" },
        pointLabels: { color: "#888", font: { size: 12 } },
        ticks: { color: "#888", backdropColor: "transparent" },
        min: 0,
        max: 5,
      },
    },
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: "#888", padding: 20 }
      },
    },
  }

  return (
    <div className="min-h-screen bg-[#171717]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Fairness AI Dashboard</h1>
          <p className="text-gray-400">Monitor system performance, user satisfaction, and fairness metrics</p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-8">
          <button 
            onClick={() => setActiveTab("overview")}
            className={`flex items-center px-4 py-2 rounded-md transition-colors ${
              activeTab === "overview" 
                ? "bg-green-600 text-white font-medium" 
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <BarChart2 className="w-4 h-4 mr-2" /> Overview
          </button>
          <button 
            onClick={() => setActiveTab("fairness")}
            className={`flex items-center px-4 py-2 rounded-md transition-colors ${
              activeTab === "fairness" 
                ? "bg-green-600 text-white font-medium" 
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Shield className="w-4 h-4 mr-2" /> Fairness Metrics
          </button>
          <button 
            onClick={() => setActiveTab("bias-info")}
            className={`flex items-center px-4 py-2 rounded-md transition-colors ${
              activeTab === "bias-info" 
                ? "bg-green-600 text-white font-medium" 
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Brain className="w-4 h-4 mr-2" /> How It Works
          </button>
          <button 
            onClick={() => setActiveTab("engagement")}
            className={`flex items-center px-4 py-2 rounded-md transition-colors ${
              activeTab === "engagement" 
                ? "bg-green-600 text-white font-medium" 
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <TrendingUp className="w-4 h-4 mr-2" /> User Engagement
          </button>
          <button 
            onClick={() => setActiveTab("personas")}
            className={`flex items-center px-4 py-2 rounded-md transition-colors ${
              activeTab === "personas" 
                ? "bg-green-600 text-white font-medium" 
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Users className="w-4 h-4 mr-2" /> Personas
          </button>
          <button 
            onClick={() => setActiveTab("api-keys")}
            className={`flex items-center px-4 py-2 rounded-md transition-colors ${
              activeTab === "api-keys" 
                ? "bg-green-600 text-white font-medium" 
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Key className="w-4 h-4 mr-2" /> API Keys
          </button>
          <button 
            onClick={() => setActiveTab("moderation")}
            className={`flex items-center px-4 py-2 rounded-md transition-colors ${
              activeTab === "moderation" 
                ? "bg-green-600 text-white font-medium" 
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Flag className="w-4 h-4 mr-2" /> Moderation
          </button>
          <button 
            onClick={() => setActiveTab("training")}
            className={`flex items-center px-4 py-2 rounded-md transition-colors ${
              activeTab === "training" 
                ? "bg-green-600 text-white font-medium" 
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Brain className="w-4 h-4 mr-2" /> AI Training
          </button>
          <button 
            onClick={() => setActiveTab("persona-requests")}
            className={`flex items-center px-4 py-2 rounded-md transition-colors ${
              activeTab === "persona-requests" 
                ? "bg-green-600 text-white font-medium" 
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Mail className="w-4 h-4 mr-2" /> Persona Requests
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Users</p>
                      <p className="text-2xl font-bold text-white">{analyticsData.totalUsers.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
                    <span className="text-green-400 text-sm">+12% from last week</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Fairness Score</p>
                      <p className="text-2xl font-bold text-white">{analyticsData.fairnessScore.toFixed(1)}/5</p>
                    </div>
                    <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                      <Shield className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-1" />
                    <span className="text-green-400 text-sm">Excellent rating</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">User Satisfaction</p>
                      <p className="text-2xl font-bold text-white">{analyticsData.userSatisfaction.toFixed(1)}/5</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                      <Heart className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 mr-1" />
                    <span className="text-yellow-400 text-sm">Above average</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Active Users (24h)</p>
                      <p className="text-2xl font-bold text-white">{analyticsData.activeUsers24h}</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-600/20 rounded-lg flex items-center justify-center">
                      <Activity className="w-6 h-6 text-yellow-400" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center">
                    <Eye className="w-4 h-4 text-blue-400 mr-1" />
                    <span className="text-blue-400 text-sm">Real-time data</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Conversation Trends</CardTitle>
                  <CardDescription className="text-gray-400">Daily conversations over the last week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <Line 
                      data={{
                        labels: analyticsData.timeSeriesData.labels,
                        datasets: [{
                          label: "Conversations",
                          data: analyticsData.timeSeriesData.conversations,
                          borderColor: "#22d3ee",
                          backgroundColor: "#22d3ee",
                          tension: 0.4,
                        }]
                      }}
                      options={chartOptions}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">User Demographics</CardTitle>
                  <CardDescription className="text-gray-400">Age distribution of users</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <Doughnut 
                      data={{
                        labels: Object.keys(analyticsData.usersByDemographics.age),
                        datasets: [{
                          data: Object.values(analyticsData.usersByDemographics.age),
                          backgroundColor: [
                            "#3b82f6", "#22d3ee", "#a78bfa", "#fbbf24", "#f87171"
                          ],
                          borderWidth: 0,
                        }]
                      }}
                      options={doughnutOptions}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Fairness Metrics Tab */}
        {activeTab === "fairness" && (
          <div className="space-y-6">
            {/* Fairness Score Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-gray-400 text-sm">Overall Fairness</p>
                      <p className="text-3xl font-bold text-green-400">{analyticsData.fairnessScore.toFixed(1)}</p>
                    </div>
                    <Shield className="w-8 h-8 text-green-400" />
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-400 h-2 rounded-full" 
                      style={{ width: `${(analyticsData.fairnessScore / 5) * 100}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-gray-400 text-sm">Flagged Messages</p>
                      <p className="text-3xl font-bold text-red-400">{analyticsData.flaggedMessages}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                  </div>
                  <p className="text-sm text-gray-400">
                    {((analyticsData.flaggedMessages / analyticsData.totalMessages) * 100).toFixed(2)}% of total messages
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-gray-400 text-sm">Bias Detection</p>
                      <p className="text-3xl font-bold text-blue-400">98.2%</p>
                    </div>
                    <Brain className="w-8 h-8 text-blue-400" />
                  </div>
                  <p className="text-sm text-gray-400">Accuracy in bias detection</p>
                </CardContent>
              </Card>
            </div>

            {/* Survey Results Radar Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Godspeed Survey Results</CardTitle>
                  <CardDescription className="text-gray-400">Average ratings across all dimensions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <Radar 
                      data={{
                        labels: ['Politeness', 'Fairness', 'Respectfulness', 'Trustworthiness', 'Competence', 'Likeability'],
                        datasets: [{
                          label: 'Average Rating',
                          data: [
                            analyticsData.surveyResults.politeness,
                            analyticsData.surveyResults.fairness,
                            analyticsData.surveyResults.respectfulness,
                            analyticsData.surveyResults.trustworthiness,
                            analyticsData.surveyResults.competence,
                            analyticsData.surveyResults.likeability
                          ],
                          backgroundColor: 'rgba(34, 197, 94, 0.2)',
                          borderColor: 'rgba(34, 197, 94, 1)',
                          borderWidth: 2,
                          pointBackgroundColor: 'rgba(34, 197, 94, 1)',
                        }]
                      }}
                      options={radarOptions}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Demographic Fairness</CardTitle>
                  <CardDescription className="text-gray-400">Satisfaction scores by user demographics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Gender Equality</span>
                        <span className="text-green-400">94%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="bg-green-400 h-2 rounded-full" style={{ width: '94%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Age Group Fairness</span>
                        <span className="text-green-400">91%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="bg-green-400 h-2 rounded-full" style={{ width: '91%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Role-based Equality</span>
                        <span className="text-green-400">96%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="bg-green-400 h-2 rounded-full" style={{ width: '96%' }}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* User Feedback Messages */}
            <Card className="bg-[#1a1a1f] border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-cyan-400" />
                  User Feedback Messages
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Optional messages from users who completed the feedback survey
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {analyticsData.feedbackMessages.length > 0 ? (
                    analyticsData.feedbackMessages
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((feedback) => (
                        <div key={feedback.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs text-cyan-400 border-cyan-400">
                                {analyticsData.personaNameMap[feedback.persona_id] || 'Unknown Persona'}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {new Date(feedback.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <Badge variant="secondary" className="text-xs">
                                Politeness: {feedback.politeness}/5
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                Fairness: {feedback.fairness}/5
                              </Badge>
                            </div>
                          </div>
                          <blockquote className="text-gray-200 italic border-l-4 border-cyan-400 pl-4">
                            "{feedback.open_ended}"
                          </blockquote>
                        </div>
                      ))
                  ) : (
                    <div className="text-center py-8">
                      <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No feedback messages yet</p>
                      <p className="text-gray-500 text-sm">Users can provide optional feedback when completing surveys</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* User Engagement Tab */}
        {activeTab === "engagement" && (
          <div className="space-y-6">
            {/* Engagement Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Avg Session Duration</p>
                      <p className="text-2xl font-bold text-white">{analyticsData.avgSessionDuration}m</p>
                    </div>
                    <Clock className="w-6 h-6 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Messages per Session</p>
                      <p className="text-2xl font-bold text-white">{(analyticsData.totalMessages / analyticsData.totalConversations).toFixed(1)}</p>
                    </div>
                    <MessageCircle className="w-6 h-6 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Return Rate</p>
                      <p className="text-2xl font-bold text-white">73%</p>
                    </div>
                    <UserCheck className="w-6 h-6 text-purple-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Completion Rate</p>
                      <p className="text-2xl font-bold text-white">89%</p>
                    </div>
                    <Target className="w-6 h-6 text-yellow-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Persona Performance */}
            <Card className="bg-[#1a1a1f] border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Persona Performance</CardTitle>
                <CardDescription className="text-gray-400">Conversations by persona</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Bar 
                    data={{
                      labels: Object.keys(analyticsData.conversationsByPersona).map(
                        personaId => analyticsData.personaNameMap[personaId] || 'Unknown Persona'
                      ),
                      datasets: [{
                        label: 'Conversations',
                        data: Object.values(analyticsData.conversationsByPersona),
                        backgroundColor: '#22d3ee',
                        borderRadius: 4,
                      }]
                    }}
                    options={chartOptions}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Personas Tab */}
        {activeTab === "personas" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Manage Personas</h2>
              <Button onClick={() => setIsPersonaFormOpen(true)} className="bg-green-600 hover:bg-green-700">
                <PlusCircle className="w-4 h-4 mr-2" /> Add Persona
              </Button>
            </div>
            <Card className="bg-[#1a1a1f] border-gray-700">
              <CardContent className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-gray-400">Avatar</TableHead>
                      <TableHead className="text-gray-400">Title</TableHead>
                      <TableHead className="text-gray-400">Description</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                      <TableHead className="text-gray-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {personas.map(persona => (
                      <TableRow key={persona.id} className="hover:bg-gray-800/50">
                        <TableCell>
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center overflow-hidden">
                            {persona.avatar_url ? (
                              <img src={persona.avatar_url} alt={persona.title} className="w-10 h-10 object-cover rounded-full" />
                            ) : (
                              <span className="text-lg font-bold text-white">{persona.title?.[0] || "?"}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-white">{persona.title}</TableCell>
                        <TableCell className="text-gray-300 max-w-xs truncate">{persona.description}</TableCell>
                        <TableCell>
                          <Badge variant={persona.is_active ? "default" : "secondary"} className={persona.is_active ? "" : "bg-green-600"}>
                            {persona.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditPersona(persona)}
                              className="hover:bg-blue-500/10"
                            >
                              <Pencil className="h-4 w-4 text-blue-400" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="hover:bg-red-500/10"
                              onClick={() => handleDeletePersona(persona.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === "api-keys" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">API Key Management</h2>
              <Badge variant="outline" className="border-blue-500 text-blue-400">
                {apiKeys.length} Active Keys
              </Badge>
            </div>
            
            {/* Existing API Keys */}
            <Card className="bg-[#1a1a1f] border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Active API Keys</CardTitle>
                <CardDescription className="text-gray-400">Manage existing API keys and monitor usage</CardDescription>
              </CardHeader>
              <CardContent>
                {apiKeys.length === 0 ? (
                  <div className="text-center py-8">
                    <Key className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-400 mb-2">No API keys generated yet</p>
                    <p className="text-sm text-gray-500">Generate API keys through the developers portal</p>
                  </div>
                ) : (
                    <div className="space-y-4">
                      {apiKeys.map((key) => (
                        <div key={key.id} className="flex items-center justify-between p-4 bg-[#171717] rounded-lg border border-gray-600">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-white">{key.name}</h3>
                              <Badge 
                                variant={key.usage_count >= key.rate_limit ? "destructive" : "default"}
                                className={key.usage_count >= key.rate_limit ? "" : "bg-green-600"}
                              >
                                {key.usage_count >= key.rate_limit ? "Limit Reached" : "Active"}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-300 mb-1">
                              <span className="text-gray-400">User:</span> {key.user_email || 'Unknown'}
                            </p>
                            <p className="text-sm text-gray-400">
                              Created: {new Date(key.created_at).toLocaleDateString()}
                            </p>
                            {key.last_used && (
                              <p className="text-sm text-gray-400">
                                Last used: {new Date(key.last_used).toLocaleDateString()}
                              </p>
                            )}
                            <p className="text-sm text-gray-400">
                              Usage: {key.usage_count}/{key.rate_limit} requests/hour
                            </p>
                          </div>
                          <div className="ml-4 flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteAPIKey(key.id)}
                              className="hover:bg-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Moderation Tab */}
        {activeTab === "moderation" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Content Moderation</h2>
              <Badge variant="outline" className="border-red-500 text-red-400">
                {flaggedMessages.length} Flagged Messages
              </Badge>
            </div>
            <Card className="bg-[#1a1a1f] border-gray-700">
              <CardContent className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-gray-400">Severity</TableHead>
                      <TableHead className="text-gray-400">Reason</TableHead>
                      <TableHead className="text-gray-400">Content</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                      <TableHead className="text-gray-400">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flaggedMessages.map(msg => (
                      <TableRow key={msg.id} className="hover:bg-gray-800/50">
                        <TableCell>
                          <Badge variant="destructive">HIGH</Badge>
                        </TableCell>
                        <TableCell className="text-red-400">{msg.reason}</TableCell>
                        <TableCell className="max-w-xs truncate text-gray-300">{msg.content}</TableCell>
                        <TableCell>
                          <Badge variant={msg.status === 'resolved' ? 'default' : 'secondary'}>
                            {msg.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-400">
                          {new Date(msg.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* AI Training Tab */}
        {activeTab === "training" && (
          <FeedbackTrainingDashboard />
        )}

        {/* Bias Detection Info Tab */}
        {activeTab === "bias-info" && (
          <BiasDetectionInfo />
        )}

        {/* Persona Requests Tab */}
        {activeTab === "persona-requests" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Persona Requests</h2>
              <Badge variant="outline" className="border-blue-500 text-blue-400">
                {personaRequests.filter(r => r.status === 'pending').length} Pending
              </Badge>
            </div>
            <Card className="bg-[#1a1a1f] border-gray-700">
              <CardContent className="p-6">
                {personaRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-400 mb-2">No persona requests yet</p>
                    <p className="text-sm text-gray-500">Users can request new personas from the personas page</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-gray-400">User</TableHead>
                        <TableHead className="text-gray-400">Persona Name</TableHead>
                        <TableHead className="text-gray-400">Description</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400">Date</TableHead>
                        <TableHead className="text-gray-400 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {personaRequests.map(request => (
                        <TableRow key={request.id} className="hover:bg-gray-800/50">
                          <TableCell className="text-gray-300">{request.user_email || 'Unknown'}</TableCell>
                          <TableCell className="font-medium text-white">{request.persona_name}</TableCell>
                          <TableCell className="text-gray-300 max-w-xs truncate">{request.description}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                request.status === 'approved' ? 'default' :
                                request.status === 'rejected' ? 'destructive' :
                                request.status === 'completed' ? 'default' :
                                'secondary'
                              }
                              className={
                                request.status === 'pending' ? 'bg-yellow-600' :
                                request.status === 'approved' ? 'bg-blue-600' :
                                request.status === 'completed' ? 'bg-green-600' :
                                ''
                              }
                            >
                              {request.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-400">
                            {new Date(request.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {request.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => updatePersonaRequest(request.id, 'approved')}
                                    className="hover:bg-green-500/10"
                                  >
                                    <Check className="h-4 w-4 text-green-400" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => updatePersonaRequest(request.id, 'rejected')}
                                    className="hover:bg-red-500/10"
                                  >
                                    <X className="h-4 w-4 text-red-400" />
                                  </Button>
                                </>
                              )}
                              {request.status === 'approved' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => updatePersonaRequest(request.id, 'completed')}
                                  className="hover:bg-green-500/10"
                                >
                                  <CheckCircle className="h-4 w-4 text-green-400" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingRequest(request);
                                  setAdminNotes(request.admin_notes || '');
                                }}
                                className="hover:bg-blue-500/10"
                              >
                                <Pencil className="h-4 w-4 text-blue-400" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Edit Request Modal */}
            {editingRequest && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <Card className="bg-[#1a1a1f] border-gray-700 w-full max-w-2xl m-4">
                  <CardHeader>
                    <CardTitle className="text-white">Edit Persona Request</CardTitle>
                    <CardDescription className="text-gray-400">
                      Update status and add admin notes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-gray-300">Persona Name</Label>
                      <p className="text-white font-medium">{editingRequest.persona_name}</p>
                    </div>
                    <div>
                      <Label className="text-gray-300">Description</Label>
                      <p className="text-gray-300">{editingRequest.description}</p>
                    </div>
                    <div>
                      <Label htmlFor="status" className="text-gray-300">Status</Label>
                      <select
                        id="status"
                        value={editingRequest.status}
                        onChange={(e) => setEditingRequest({...editingRequest, status: e.target.value})}
                        className="w-full bg-[#171717] border-gray-600 text-white rounded-md px-3 py-2 mt-1"
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="adminNotes" className="text-gray-300">Admin Notes</Label>
                      <textarea
                        id="adminNotes"
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        className="w-full bg-[#171717] border-gray-600 text-white rounded-md px-3 py-2 mt-1 min-h-[100px]"
                        placeholder="Add notes about this request..."
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingRequest(null);
                          setAdminNotes("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => updatePersonaRequest(editingRequest.id, editingRequest.status, adminNotes)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Save Changes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Persona Form Modal */}
        {isPersonaFormOpen && (
          <PersonaForm
            isOpen={isPersonaFormOpen}
            onClose={() => {
              setIsPersonaFormOpen(false)
              setEditingPersona(null)
            }}
            onSubmit={handlePersonaSubmit}
                         initialData={editingPersona || undefined}
          />
        )}
      </div>
    </div>
  )
} 