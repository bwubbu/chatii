"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/supabaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart2, User, MessageCircle, Download, Activity, Users, Flag, ListChecks, 
  PlusCircle, Pencil, Trash2, Shield, Heart, TrendingUp, AlertTriangle,
  CheckCircle, Clock, Target, Zap, Eye, ThumbsUp, Star, Key, Copy, Mail, X, Check,
  Loader2
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
import { Textarea } from "@/components/ui/textarea"
import { PersonaForm, PersonaFormData } from "@/components/personas/PersonaForm"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

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
    nationality: { [key: string]: number }
    race: { [key: string]: number }
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
  trainingStats: {
    totalSessions: number
    completedSessions: number
    activeSessions: number
    averageScore: number
    completionRate: number
  }
}

interface APIKey {
  id: string;
  name: string;
  created_at: string;
  usage_count: number;
  rate_limit: number;
  user_id?: string;
  last_used?: string;
  is_active?: boolean;
  user_email?: string | null;
  persona_name?: string | null;
}

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [personas, setPersonas] = useState<any[]>([])
  const [flaggedMessages, setFlaggedMessages] = useState<any[]>([])
  const [approvedFlagCount, setApprovedFlagCount] = useState<number>(0)
  const [isGeneratingNegativeExamples, setIsGeneratingNegativeExamples] = useState(false)
  const [moderationDialog, setModerationDialog] = useState<{
    open: boolean
    type: "success" | "error"
    title: string
    message: string
  }>({
    open: false,
    type: "success",
    title: "",
    message: "",
  })
  const [isPersonaFormOpen, setIsPersonaFormOpen] = useState(false)
  const [editingPersona, setEditingPersona] = useState<PersonaFormData | null>(null)
  const [apiKeys, setApiKeys] = useState<APIKey[]>([])
  const [personaRequests, setPersonaRequests] = useState<any[]>([])
  const [editingNotes, setEditingNotes] = useState<{ [key: string]: string }>({})
  const [showNotesInput, setShowNotesInput] = useState<{ [key: string]: boolean }>({})
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
      if (activeTab === "user-requests") {
        fetchPersonaRequests()
      }
    }
  }, [user, activeTab])

  const fetchAnalyticsData = async () => {
    try {
      // Fetch all data in parallel (training sessions separately to handle errors gracefully)
      const [
        conversationsResult,
        messagesResult,
        feedbackResult,
        flaggedResult,
        userProfilesResult,
        personasResult
      ] = await Promise.all([
        supabase.from("conversations").select("id, persona_id, created_at, user_id"),
        supabase.from("messages").select("id, conversation_id, created_at"),
        supabase.from("feedback_questionnaire").select("id, open_ended, created_at, persona_id, politeness, fairness, respectfulness, trustworthiness, competence, likeability"),
        supabase.from("flagged_messages").select("id, created_at"),
        supabase.from("user_profiles").select("id, user_id, age, gender, nationality, race"),
        supabase.from("personas").select("id, title")
      ])

      // Fetch training sessions separately to handle errors gracefully
      let trainingSessions: any[] = []
      try {
        const trainingSessionsResult = await supabase.from("training_sessions").select("id, status, average_score")
        trainingSessions = trainingSessionsResult.data || []
      } catch (trainingError) {
        console.error("Error fetching training sessions:", trainingError)
        trainingSessions = []
      }

      const conversations = conversationsResult.data || []
      const messages = messagesResult.data || []
      const feedback = feedbackResult.data || []
      const flagged = flaggedResult.data || []
      const userProfiles = userProfilesResult.data || []
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

      // Demographics analysis from user_profiles
      const usersByDemographics = {
        age: {} as { [key: string]: number },
        gender: {} as { [key: string]: number },
        nationality: {} as { [key: string]: number },
        race: {} as { [key: string]: number }
      }

      userProfiles.forEach(profile => {
        if (profile.age) {
          const ageGroup = profile.age < 25 ? '18-24' : profile.age < 35 ? '25-34' : profile.age < 45 ? '35-44' : profile.age < 55 ? '45-54' : '55+'
          usersByDemographics.age[ageGroup] = (usersByDemographics.age[ageGroup] || 0) + 1
        }
        if (profile.gender) {
          usersByDemographics.gender[profile.gender] = (usersByDemographics.gender[profile.gender] || 0) + 1
        }
        if (profile.nationality) {
          usersByDemographics.nationality[profile.nationality] = (usersByDemographics.nationality[profile.nationality] || 0) + 1
        }
        if (profile.race) {
          usersByDemographics.race[profile.race] = (usersByDemographics.race[profile.race] || 0) + 1
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

      // Calculate training session statistics
      const totalSessions = trainingSessions.length
      const completedSessions = trainingSessions.filter(s => s.status === 'completed').length
      const activeSessions = trainingSessions.filter(s => s.status === 'in_progress').length
      const sessionsWithScores = trainingSessions.filter(s => s.average_score != null)
      const averageScore = sessionsWithScores.length > 0
        ? sessionsWithScores.reduce((sum, s) => sum + (s.average_score || 0), 0) / sessionsWithScores.length
        : 0
      const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0

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
        feedbackMessages: feedback.filter(f => f.open_ended && f.open_ended.trim().length > 0),
        trainingStats: {
          totalSessions,
          completedSessions,
          activeSessions,
          averageScore,
          completionRate
        }
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
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("No session found");
        return;
      }

      const response = await fetch("/api/flagged-messages", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        setFlaggedMessages(result.messages || []);
        setApprovedFlagCount(result.approvedCount || 0);
      } else {
        const errorData = await response.json();
        console.error("Error fetching flagged messages:", errorData);
        setFlaggedMessages([]);
      }
    } catch (error) {
      console.error("Error fetching flagged messages:", error);
      setFlaggedMessages([]);
    }
  }

  const handleFlagAction = async (flagId: string, action: "approve" | "remove") => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Please log in to perform this action");
        return;
      }

      // Confirm action
      const confirmMessage = action === "approve" 
        ? "Approve this flag? It will be saved for fine-tuning to improve the bot's responses."
        : "Remove this flag? This will mark it as a false flag.";
      
      if (!confirm(confirmMessage)) {
        return;
      }

      const response = await fetch("/api/flagged-messages", {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ flagId, action }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message || `Flag ${action === "approve" ? "approved" : "removed"} successfully`);
        fetchFlaggedMessages(); // Refresh the list
      } else {
        const errorData = await response.json();
        alert(`Failed to ${action} flagged message: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error performing flag action:", error);
      alert("An unexpected error occurred");
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
        const data = await response.json();
        setApiKeys(data.apiKeys || []);
      } else {
        console.error("Failed to fetch API keys");
      }
    } catch (error) {
      console.error("Error fetching API keys:", error);
    }
  };

  const fetchPersonaRequests = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("No session found");
        return;
      }

      // Use API route to fetch requests (bypasses RLS issues)
      const response = await fetch("/api/persona-requests", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        setPersonaRequests(result.requests || []);
      } else {
        const errorData = await response.json();
        console.error("Error fetching persona requests:", errorData);
        setPersonaRequests([]);
      }
    } catch (error) {
      console.error("Error fetching persona requests:", error);
      setPersonaRequests([]);
    }
  };

  const updateRequestStatus = async (requestId: string, status: string, notes?: string) => {
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
          admin_notes: notes || null
        }),
      });

      if (response.ok) {
        fetchPersonaRequests(); // Refresh the list
        setShowNotesInput({ ...showNotesInput, [requestId]: false });
        setEditingNotes({ ...editingNotes, [requestId]: "" });
      } else {
        const errorData = await response.json();
        alert(`Failed to update request: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error updating request status:", error);
      alert("An unexpected error occurred");
    }
  };

  const saveAdminNotes = async (requestId: string) => {
    const notes = editingNotes[requestId] || "";
    await updateRequestStatus(requestId, personaRequests.find(r => r.id === requestId)?.status || 'pending', notes);
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f10] via-[#1a1a1f] to-[#23232a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f10] via-[#1a1a1f] to-[#23232a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading analytics...</p>
        </div>
      </div>
    )
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
            onClick={() => setActiveTab("user-requests")}
            className={`flex items-center px-4 py-2 rounded-md transition-colors ${
              activeTab === "user-requests" 
                ? "bg-green-600 text-white font-medium" 
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Mail className="w-4 h-4 mr-2" /> User Requests
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>

            {/* Survey Results Radar Chart */}
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

        {/* User Engagement Tab - Training Sessions */}
        {activeTab === "engagement" && analyticsData?.trainingStats && (
          <div className="space-y-6">
            {/* Training Session Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Training Sessions</p>
                      <p className="text-2xl font-bold text-white">{analyticsData.trainingStats.totalSessions}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                      <Activity className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Average Score</p>
                      <p className="text-2xl font-bold text-white">{analyticsData.trainingStats.averageScore.toFixed(1)}/10</p>
                    </div>
                    <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                      <Target className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Completion Rate</p>
                      <p className="text-2xl font-bold text-white">{analyticsData.trainingStats.completionRate.toFixed(1)}%</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Active Sessions</p>
                      <p className="text-2xl font-bold text-white">{analyticsData.trainingStats.activeSessions}</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-600/20 rounded-lg flex items-center justify-center">
                      <Clock className="w-6 h-6 text-yellow-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Training Session Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Session Status Distribution</CardTitle>
                  <CardDescription className="text-gray-400">Breakdown of training sessions by status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <Doughnut 
                      data={{
                        labels: ['Completed', 'In Progress', 'Abandoned'],
                        datasets: [{
                          data: [
                            analyticsData.trainingStats.completedSessions,
                            analyticsData.trainingStats.activeSessions,
                            analyticsData.trainingStats.totalSessions - analyticsData.trainingStats.completedSessions - analyticsData.trainingStats.activeSessions
                          ],
                          backgroundColor: [
                            "#22c55e", // green for completed
                            "#eab308", // yellow for in progress
                            "#ef4444"  // red for abandoned
                          ],
                          borderWidth: 0,
                        }]
                      }}
                      options={doughnutOptions}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Training Performance</CardTitle>
                  <CardDescription className="text-gray-400">Key metrics overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Average Score</span>
                        <span className="text-green-400">{analyticsData.trainingStats.averageScore.toFixed(1)}/10</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-green-400 h-2 rounded-full" 
                          style={{ width: `${(analyticsData.trainingStats.averageScore / 10) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Completion Rate</span>
                        <span className="text-purple-400">{analyticsData.trainingStats.completionRate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-purple-400 h-2 rounded-full" 
                          style={{ width: `${analyticsData.trainingStats.completionRate}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gray-700">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-400 text-sm">Completed</p>
                          <p className="text-2xl font-bold text-white">{analyticsData.trainingStats.completedSessions}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">In Progress</p>
                          <p className="text-2xl font-bold text-white">{analyticsData.trainingStats.activeSessions}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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
            
            <div className="space-y-6">
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
                      <p className="text-sm text-gray-500">Generate your first API key above to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {apiKeys.map((key) => (
                        <div key={key.id} className="flex items-center justify-between p-4 bg-[#171717] rounded-lg border border-gray-600">
                          <div className="flex-1">
                            <h3 className="font-semibold text-white">{key.name}</h3>
                            <p className="text-sm text-gray-400">
                              Persona: {key.persona_name || "Not linked"}
                            </p>
                            <p className="text-sm text-gray-400">
                              Owner: {key.user_email || key.user_id || "Unknown"}
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
                            <Badge 
                              variant={key.usage_count >= key.rate_limit ? "destructive" : "default"}
                              className={key.usage_count >= key.rate_limit ? "" : "bg-green-600"}
                            >
                              {key.usage_count >= key.rate_limit ? "Limit Reached" : "Active"}
                            </Badge>
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
          </div>
        )}

        {/* Moderation Tab */}
        {activeTab === "moderation" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Content Moderation</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Approved flags available for negative examples:{" "}
                  <span className="font-semibold text-white">{approvedFlagCount}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-red-500 text-red-400">
                  {flaggedMessages.length} Pending Flags
                </Badge>
                <Button
                  onClick={async () => {
                    try {
                      setIsGeneratingNegativeExamples(true);
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) {
                        setModerationDialog({
                          open: true,
                          type: "error",
                          title: "Admin session required",
                          message: "Please log in as the admin user before generating negative examples.",
                        })
                        return;
                      }
                      const response = await fetch("/api/moderation/ingest-flags", {
                        method: "POST",
                        headers: {
                          "Authorization": `Bearer ${session.access_token}`,
                          "Content-Type": "application/json",
                        },
                      });
                      const result = await response.json();
                      if (!response.ok || !result.success) {
                        setModerationDialog({
                          open: true,
                          type: "error",
                          title: "No negative examples generated",
                          message: result.message || "Failed to generate negative examples from approved flags.",
                        })
                      } else {
                        setModerationDialog({
                          open: true,
                          type: "success",
                          title: "Negative examples generated",
                          message: result.message || "Negative examples were generated successfully from approved flags.",
                        })
                        fetchFlaggedMessages();
                      }
                    } catch (err) {
                      console.error("Error generating negative examples:", err);
                      setModerationDialog({
                        open: true,
                        type: "error",
                        title: "Unexpected error",
                        message: "An unexpected error occurred while generating negative examples. Please try again.",
                      })
                    } finally {
                      setIsGeneratingNegativeExamples(false);
                    }
                  }}
                  disabled={isGeneratingNegativeExamples}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  title="Generate 'what NOT to do' examples for the model"
                >
                  {isGeneratingNegativeExamples ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Generate Negative Examples
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              {flaggedMessages.length === 0 ? (
                <Card className="bg-[#1a1a1f] border-gray-700">
                  <CardContent className="p-12 text-center">
                    <Flag className="w-16 h-16 mx-auto mb-4 text-gray-600 opacity-50" />
                    <p className="text-gray-400 text-lg">No pending flagged messages</p>
                  </CardContent>
                </Card>
              ) : (
                flaggedMessages.map((flag) => (
                  <Card key={flag.id} className="bg-[#1a1a1f] border-gray-700">
                    <CardContent className="p-6">
                      {/* Header with Persona and Status */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {flag.persona?.avatar_url ? (
                            <img
                              src={flag.persona.avatar_url}
                              alt={flag.persona.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
                              <Users className="w-6 h-6 text-white" />
                            </div>
                          )}
                          <div>
                            <h3 className="text-lg font-bold text-white">{flag.persona?.name || "Unknown Persona"}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="destructive" className="bg-red-600 text-white">
                                HIGH
                              </Badge>
                              <Badge variant="secondary" className="bg-gray-700 text-gray-300 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Pending
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-400">
                          <p>{new Date(flag.created_at).toLocaleDateString()}</p>
                          <p>{new Date(flag.created_at).toLocaleTimeString()}</p>
                        </div>
                      </div>

                      {/* Flag Reason */}
                      <div className="mb-4">
                        <p className="text-red-400 font-medium">{flag.reason}</p>
                      </div>

                      {/* Flagged Response */}
                      <div className="mb-4">
                        <Label className="text-gray-400 text-sm mb-2 block">Flagged Response</Label>
                        <div className="bg-[#23232a] border border-gray-700 rounded-lg p-4">
                          <p className="text-gray-200">{flag.message_content || flag.content}</p>
                        </div>
                      </div>

                      {/* Context */}
                      {flag.context && (
                        <div className="mb-4">
                          <Label className="text-gray-400 text-sm mb-2 block">Context</Label>
                          <div className="bg-[#2a2a2f] border border-gray-700 rounded-lg p-4">
                            <p className="text-gray-300">
                              <span className="font-medium text-white">User:</span> {flag.context}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Reporter Information */}
                      <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
                        <Label className="text-gray-400 text-sm mb-2 block">Reporter Information</Label>
                        <div className="text-sm text-gray-300 space-y-1">
                          <p>Email: <span className="text-white font-medium">{flag.reporter?.email || "Unknown"}</span></p>
                          <p>Previous Reports: <span className="text-white font-medium">{flag.reporter?.previous_reports || 0}</span></p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-end gap-2 mt-4">
                        <Button
                          onClick={() => handleFlagAction(flag.id, "approve")}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          title="Approve and save for fine-tuning"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleFlagAction(flag.id, "remove")}
                          variant="destructive"
                          className="bg-red-600 hover:bg-red-700"
                          title="Mark as false flag"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "user-requests" && (
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
                  <div className="text-center py-8 text-gray-400">
                    <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No persona requests yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {personaRequests.map((request) => (
                      <Card key={request.id} className="bg-[#23232a] border-gray-600">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xl font-bold text-white">{request.persona_name}</h3>
                                <Badge 
                                  variant={
                                    request.status === 'pending' ? 'secondary' :
                                    request.status === 'approved' ? 'default' :
                                    request.status === 'completed' ? 'default' :
                                    'destructive'
                                  }
                                  className={
                                    request.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500' :
                                    request.status === 'approved' ? 'bg-blue-500/20 text-blue-400 border-blue-500' :
                                    request.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500' :
                                    'bg-red-500/20 text-red-400 border-red-500'
                                  }
                                >
                                  {request.status}
                                </Badge>
                              </div>
                              <p className="text-gray-300 mb-3">{request.description}</p>
                              <div className="text-sm text-gray-400 space-y-1">
                                <p>Requested by: <span className="text-white font-medium">{request.user_email || 'Loading...'}</span></p>
                                <p>Submitted: {new Date(request.created_at).toLocaleString()}</p>
                                {request.admin_notes && !showNotesInput[request.id] && (
                                  <div className="mt-2 p-2 bg-gray-800/50 rounded text-gray-300">
                                    <strong>Admin Notes:</strong> {request.admin_notes}
                                  </div>
                                )}
                                {showNotesInput[request.id] && (
                                  <div className="mt-2 space-y-2">
                                    <Textarea
                                      value={editingNotes[request.id] || request.admin_notes || ""}
                                      onChange={(e) => setEditingNotes({ ...editingNotes, [request.id]: e.target.value })}
                                      placeholder="Add admin notes (e.g., why approved/rejected, follow-up actions, etc.)"
                                      className="bg-[#2C2C2C] border-gray-600 text-white placeholder-gray-400 focus:border-gray-500 min-h-[80px]"
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => saveAdminNotes(request.id)}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                      >
                                        Save Notes
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setShowNotesInput({ ...showNotesInput, [request.id]: false });
                                          setEditingNotes({ ...editingNotes, [request.id]: "" });
                                        }}
                                        className="border-gray-600 text-gray-300"
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                )}
                                {!showNotesInput[request.id] && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setShowNotesInput({ ...showNotesInput, [request.id]: true });
                                      setEditingNotes({ ...editingNotes, [request.id]: request.admin_notes || "" });
                                    }}
                                    className="mt-2 text-xs text-gray-400 hover:text-white"
                                  >
                                    {request.admin_notes ? "Edit Notes" : "Add Notes"}
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 ml-4">
                              {request.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => updateRequestStatus(request.id, 'approved')}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    <Check className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      const notes = prompt("Add a note (optional):");
                                      updateRequestStatus(request.id, 'rejected', notes || undefined);
                                    }}
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              {request.status === 'approved' && (
                                <Button
                                  size="sm"
                                  onClick={() => updateRequestStatus(request.id, 'completed')}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Mark Complete
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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

      {/* Moderation result dialog */}
      <AlertDialog
        open={moderationDialog.open}
        onOpenChange={(open) =>
          setModerationDialog((prev) => ({
            ...prev,
            open,
          }))
        }
      >
        <AlertDialogContent className="bg-[#111111] border-gray-700">
          <AlertDialogHeader>
            <div className="flex flex-col items-center text-center space-y-4">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  moderationDialog.type === "success"
                    ? "bg-emerald-900/40 border border-emerald-500/60"
                    : "bg-red-900/40 border border-red-500/60"
                }`}
              >
                {moderationDialog.type === "success" ? (
                  <Check className="w-8 h-8 text-emerald-400 animate-pulse" />
                ) : (
                  <X className="w-8 h-8 text-red-400 animate-bounce" />
                )}
              </div>
              <AlertDialogTitle className="text-white">
                {moderationDialog.title || (moderationDialog.type === "success" ? "Success" : "Something went wrong")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300 whitespace-pre-line">
                {moderationDialog.message}
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-purple-600 hover:bg-purple-700 text-white">
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}