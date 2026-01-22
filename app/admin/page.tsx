"use client"
import { useEffect, useLayoutEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/supabaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart2, User, MessageCircle, Download, Activity, Users, Flag, ListChecks, 
  PlusCircle, Pencil, Trash2, Shield, Heart, Brain, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, Clock, Target, Zap, Eye, ThumbsUp, Star, UserCheck, Key,
  Mail, X, Check, Power, PowerOff, Ban, Upload, Loader2
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { format } from "date-fns"
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
import { TrainingScenarioForm, TrainingScenarioFormData } from "@/components/training/TrainingScenarioForm"

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
  userGrowthPercent: number
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
  const [trainingScenarios, setTrainingScenarios] = useState<any[]>([])
  const [isTrainingScenarioFormOpen, setIsTrainingScenarioFormOpen] = useState(false)
  const [editingTrainingScenario, setEditingTrainingScenario] = useState<TrainingScenarioFormData | null>(null)
  const [selectedFlaggedMessage, setSelectedFlaggedMessage] = useState<any>(null)
  const [isFlaggedMessageDialogOpen, setIsFlaggedMessageDialogOpen] = useState(false)
  const [selectedPersonaRequest, setSelectedPersonaRequest] = useState<any>(null)
  const [isPersonaRequestDialogOpen, setIsPersonaRequestDialogOpen] = useState(false)
  
  // Export training data state
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [exportFormat] = useState<'embedding'>('embedding')
  
  // Export flagged messages state
  const [isExportingFlagged, setIsExportingFlagged] = useState(false)
  const [exportFlaggedError, setExportFlaggedError] = useState<string | null>(null)
  const [exportFlaggedSuccess, setExportFlaggedSuccess] = useState(false)
  const [exportFlaggedFormat] = useState<'embedding'>('embedding')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')
  const [scoreFilter, setScoreFilter] = useState<'high' | 'low' | 'custom'>('high')
  const [customMinScore, setCustomMinScore] = useState<string>('')
  const [customMaxScore, setCustomMaxScore] = useState<string>('')
  const [selectedPersonaForExport, setSelectedPersonaForExport] = useState<string>('all')
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  const [endDate, setEndDate] = useState<Date | undefined>(new Date())
  
  // Upload training data state
  const [isUploadingPositive, setIsUploadingPositive] = useState(false)
  const [isUploadingNegative, setIsUploadingNegative] = useState(false)
  const [uploadPositiveError, setUploadPositiveError] = useState<string | null>(null)
  const [uploadNegativeError, setUploadNegativeError] = useState<string | null>(null)
  const [uploadPositiveSuccess, setUploadPositiveSuccess] = useState(false)
  const [uploadNegativeSuccess, setUploadNegativeSuccess] = useState(false)
  const [uploadStats, setUploadStats] = useState<any>(null)
  
  // Training data insights
  const [trainingDataInsights, setTrainingDataInsights] = useState<{
    total: number
    highQuality: number
    lowQuality: number
    mediumQuality: number
    avgScore: number
  } | null>(null)
  const [isLoadingInsights, setIsLoadingInsights] = useState(false)
  
  // Tab loading states
  const [loadingOverview, setLoadingOverview] = useState(true)
  const [loadingPersonas, setLoadingPersonas] = useState(false)
  const [loadingApiKeys, setLoadingApiKeys] = useState(false)
  const [loadingModeration, setLoadingModeration] = useState(false)
  const [loadingPersonaRequests, setLoadingPersonaRequests] = useState(false)
  const [loadingTrainingScenarios, setLoadingTrainingScenarios] = useState(false)
  
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

  // Set loading state immediately when tab changes (synchronously before render)
  useLayoutEffect(() => {
    if (user && user.email === ADMIN_EMAIL) {
      // Set loading state synchronously for the active tab to prevent content flash
      if (activeTab === "overview") {
        setLoadingOverview(true);
      } else if (activeTab === "personas") {
        setLoadingPersonas(true);
      } else if (activeTab === "moderation") {
        setLoadingModeration(true);
      } else if (activeTab === "api-keys") {
        setLoadingApiKeys(true);
      } else if (activeTab === "persona-requests") {
        setLoadingPersonaRequests(true);
      } else if (activeTab === "training-scenarios") {
        setLoadingTrainingScenarios(true);
      }
    }
  }, [user, activeTab])

  useEffect(() => {
    if (user && user.email === ADMIN_EMAIL) {
      let isMounted = true;
      
      const loadData = async () => {
        try {
          // Always fetch analytics data (needed for overview and other tabs may use it)
          await fetchAnalyticsData();
          if (!isMounted) return;
          
          if (activeTab === "overview") {
            setLoadingOverview(false);
          } else if (activeTab === "personas") {
            await fetchPersonas();
            if (!isMounted) return;
            setLoadingPersonas(false);
          } else if (activeTab === "moderation") {
            await Promise.all([
              fetchFlaggedMessages(),
              fetchPersonas(),
              fetchTrainingDataInsights()
            ]);
            if (!isMounted) return;
            setLoadingModeration(false);
          } else if (activeTab === "api-keys") {
            await fetchAPIKeys();
            if (!isMounted) return;
            setLoadingApiKeys(false);
          } else if (activeTab === "persona-requests") {
            await fetchPersonaRequests();
            if (!isMounted) return;
            setLoadingPersonaRequests(false);
          } else if (activeTab === "training-scenarios") {
            await fetchTrainingScenarios();
            if (!isMounted) return;
            setLoadingTrainingScenarios(false);
          }
        } catch (error) {
          console.error("Error loading admin data:", error);
          // Reset loading state on error
          if (activeTab === "overview") setLoadingOverview(false);
          else if (activeTab === "personas") setLoadingPersonas(false);
          else if (activeTab === "moderation") setLoadingModeration(false);
          else if (activeTab === "api-keys") setLoadingApiKeys(false);
          else if (activeTab === "persona-requests") setLoadingPersonaRequests(false);
          else if (activeTab === "training-scenarios") setLoadingTrainingScenarios(false);
        }
      };
      
      loadData();
      
      return () => {
        isMounted = false;
      };
    }
  }, [user, activeTab])

  const fetchAnalyticsData = async () => {
    try {
      // Get session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("No session found");
        return;
      }

      // Fetch analytics data from API route that uses service role key (bypasses RLS)
      const response = await fetch("/api/admin/analytics", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const analyticsData: AnalyticsData = await response.json();
      setAnalyticsData(analyticsData)
    } catch (error) {
      console.error("Error fetching analytics data:", error)
      // Set empty data to prevent infinite loading
      setAnalyticsData({
        totalUsers: 0,
        totalConversations: 0,
        totalMessages: 0,
        activeUsers24h: 0,
        avgSessionDuration: 0,
        fairnessScore: 0,
        userSatisfaction: 0,
        flaggedMessages: 0,
        conversationsByPersona: {},
        personaNameMap: {},
        usersByDemographics: { age: {}, gender: {}, role: {} },
        surveyResults: {
          politeness: 0,
          fairness: 0,
          respectfulness: 0,
          trustworthiness: 0,
          competence: 0,
          likeability: 0
        },
        timeSeriesData: {
          labels: [],
          conversations: [],
          users: [],
          satisfaction: []
        },
        feedbackMessages: [],
        userGrowthPercent: 0
      })
    }
  }

  const fetchPersonas = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Fetch personas timeout')), 15000)
      );
      
      const queryPromise = supabase.from("personas").select("*");
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      if (error) {
        console.error('Fetch personas error:', error)
        setPersonas([])
      } else {
        setPersonas(data || [])
      }
    } catch (error) {
      console.error('Error fetching personas:', error)
      setPersonas([])
    }
  }

  const handleApproveFlaggedMessage = async (flagId: string) => {
    try {
      // Get session token for authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('You must be logged in to approve flagged messages')
        return
      }

      // Call API route that uses service role key to bypass RLS
      const response = await fetch('/api/flagged-messages', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          flagId,
          status: 'resolved'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to approve flagged message')
      }
      
      // Success - refresh the flagged messages list
      fetchFlaggedMessages()
      fetchTrainingDataInsights() // Also refresh insights to update the count
    } catch (err: any) {
      console.error('Error approving flagged message:', err)
      alert(`Failed to approve flagged message: ${err.message || 'Unknown error'}`)
    }
  }

  const handleRemoveFlaggedMessage = async (flagId: string) => {
    if (!confirm("Are you sure you want to remove this flagged message? This action cannot be undone.")) {
      return
    }
    const { error } = await supabase
      .from('flagged_messages')
      .delete()
      .eq('id', flagId)
    
    if (error) {
      console.error('Error removing flagged message:', error)
      alert('Failed to remove flagged message')
    } else {
      fetchFlaggedMessages()
    }
  }

  const fetchTrainingDataInsights = async () => {
    setIsLoadingInsights(true)
    try {
      // Build date filter
      const startDateStr = startDate ? startDate.toISOString().split('T')[0] : undefined
      const endDateStr = endDate ? endDate.toISOString().split('T')[0] : undefined
      
      // Build query for feedback data
      let feedbackQuery = supabase
        .from("feedback_questionnaire")
        .select("politeness, fairness, respectfulness, trustworthiness, competence, likeability")
      
      if (startDateStr) {
        feedbackQuery = feedbackQuery.gte("created_at", startDateStr)
      }
      if (endDateStr) {
        feedbackQuery = feedbackQuery.lte("created_at", endDateStr)
      }
      if (selectedPersonaForExport && selectedPersonaForExport !== 'all') {
        feedbackQuery = feedbackQuery.eq("persona_id", selectedPersonaForExport)
      }
      
      const { data: feedbackData, error: feedbackError } = await feedbackQuery
      
      if (feedbackError) {
        console.error("Error fetching training insights:", feedbackError)
        return
      }
      
      // Build query for resolved/approved flagged messages
      // Use API route to bypass RLS and get accurate count with persona info
      let approvedFlagsCount = 0
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const response = await fetch('/api/flagged-messages', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          })
          
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.flaggedMessages) {
              // Filter by status, date range, and persona
              let filteredFlags = result.flaggedMessages.filter((f: any) => {
                // Must be resolved
                if (f.status !== 'resolved') return false
                
                // Filter by date range
                if (startDateStr) {
                  const flagDate = new Date(f.created_at).toISOString().split('T')[0]
                  if (flagDate < startDateStr) return false
                }
                if (endDateStr) {
                  const flagDate = new Date(f.created_at).toISOString().split('T')[0]
                  if (flagDate > endDateStr) return false
                }
                
                // Filter by persona if specified
                if (selectedPersonaForExport && selectedPersonaForExport !== 'all') {
                  return f.persona?.id === selectedPersonaForExport
                }
                
                return true
              })
              
              approvedFlagsCount = filteredFlags.length
            }
          }
        }
      } catch (err) {
        console.error("Error fetching approved flags count:", err)
        // Fallback to direct query (may be limited by RLS)
        let flaggedQuery = supabase
          .from("flagged_messages")
          .select("id", { count: 'exact', head: true })
          .eq("status", "resolved")
        
        if (startDateStr) {
          flaggedQuery = flaggedQuery.gte("created_at", startDateStr)
        }
        if (endDateStr) {
          flaggedQuery = flaggedQuery.lte("created_at", endDateStr)
        }
        
        const { count, error: flaggedError } = await flaggedQuery
        
        if (!flaggedError && count !== null) {
          approvedFlagsCount = count
        } else if (flaggedError) {
          console.error("Error fetching flagged messages count:", flaggedError)
        }
      }
      
      if (!feedbackData || feedbackData.length === 0) {
        setTrainingDataInsights({
          total: 0,
          highQuality: 0,
          lowQuality: approvedFlagsCount,
          mediumQuality: 0,
          avgScore: 0
        })
        return
      }
      
      // Calculate insights from feedback data
      let totalScore = 0
      let highQualityCount = 0
      let mediumQualityCount = 0
      
      feedbackData.forEach((f: any) => {
        const avgScore = (
          (f.politeness || 0) +
          (f.fairness || 0) +
          (f.respectfulness || 0) +
          (f.trustworthiness || 0) +
          (f.competence || 0) +
          (f.likeability || 0)
        ) / 6
        
        totalScore += avgScore
        
        if (avgScore >= 4.0) {
          highQualityCount++
        } else {
          mediumQualityCount++
        }
      })
      
      setTrainingDataInsights({
        total: feedbackData.length,
        highQuality: highQualityCount,
        lowQuality: approvedFlagsCount, // Now represents approved/resolved flag messages
        mediumQuality: mediumQualityCount,
        avgScore: totalScore / feedbackData.length
      })
    } catch (error) {
      console.error("Error fetching training insights:", error)
    } finally {
      setIsLoadingInsights(false)
    }
  }

  // Update insights when filters change
  useEffect(() => {
    if (activeTab === "moderation") {
      fetchTrainingDataInsights()
    }
  }, [startDate, endDate, selectedPersonaForExport, activeTab])

  const handleExportTrainingData = async () => {
    setIsExporting(true)
    setExportError(null)
    setExportSuccess(false)

    try {
      // Build query parameters
      const params = new URLSearchParams()
      
      // Determine score range based on filter
      if (scoreFilter === 'high') {
        params.append('minScore', '4.0')
      } else if (scoreFilter === 'low') {
        params.append('maxScore', '2.5')
      } else if (scoreFilter === 'custom') {
        if (customMinScore) {
          params.append('minScore', customMinScore)
        }
        if (customMaxScore) {
          params.append('maxScore', customMaxScore)
        }
      }

      // Add date range
      if (startDate) {
        params.append('startDate', startDate.toISOString().split('T')[0])
      }
      if (endDate) {
        params.append('endDate', endDate.toISOString().split('T')[0])
      }

      // Add persona filter
      if (selectedPersonaForExport && selectedPersonaForExport !== 'all') {
        params.append('personaId', selectedPersonaForExport)
      }

      // Add format parameter
      params.append('format', exportFormat)

      // Get session token for authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('You must be logged in to export data')
      }

      // Call export API with auth token
      const response = await fetch(`/api/export-feedback?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Export failed')
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `feedback_training_data_${new Date().toISOString().split('T')[0]}.jsonl`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 5000)
    } catch (error: any) {
      console.error("Export error:", error)
      setExportError(error.message || "Failed to export data")
      setTimeout(() => setExportError(null), 5000)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportFlaggedMessages = async () => {
    setIsExportingFlagged(true)
    setExportFlaggedError(null)
    setExportFlaggedSuccess(false)

    try {
      // Build query parameters
      const params = new URLSearchParams()
      
      // Add date range
      if (startDate) {
        params.append('startDate', startDate.toISOString().split('T')[0])
      }
      if (endDate) {
        params.append('endDate', endDate.toISOString().split('T')[0])
      }

      // Add persona filter
      if (selectedPersonaForExport && selectedPersonaForExport !== 'all') {
        params.append('personaId', selectedPersonaForExport)
      }

      // Add severity filter
      if (selectedSeverity && selectedSeverity !== 'all') {
        params.append('severity', selectedSeverity)
      }

      // Only export resolved/approved flags
      params.append('status', 'resolved')

      // Add format parameter
      params.append('format', exportFlaggedFormat)

      // Get session token for authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('You must be logged in to export data')
      }

      // Call export API with auth token
      const response = await fetch(`/api/export-flagged-messages?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json()
        let errorMessage = errorData.error || 'Export failed'
        if (errorData.details) {
          errorMessage += `\n\n${errorData.details}`
        }
        if (errorData.foundFlags !== undefined) {
          errorMessage += `\n\nFound ${errorData.foundFlags} resolved flags, but ${errorData.exportedFlags || 0} could be exported.`
          if (errorData.foundFlags > 0 && errorData.exportedFlags === 0) {
            errorMessage += `\n\nThis usually means the flags don't have valid message_ids or the messages were deleted. Check the server console for details.`
          }
        }
        throw new Error(errorMessage)
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `flagged_messages_negative_examples_${new Date().toISOString().split('T')[0]}.jsonl`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setExportFlaggedSuccess(true)
      setTimeout(() => setExportFlaggedSuccess(false), 5000)
    } catch (error: any) {
      console.error("Export flagged messages error:", error)
      setExportFlaggedError(error.message || "Failed to export flagged messages")
      setTimeout(() => setExportFlaggedError(null), 5000)
    } finally {
      setIsExportingFlagged(false)
    }
  }

  const handleUploadPositive = async (file: File) => {
    setIsUploadingPositive(true)
    setUploadPositiveError(null)
    setUploadPositiveSuccess(false)
    setUploadStats(null)

    try {
      // Get session token for authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('You must be logged in to upload data')
      }

      // Create form data
      const formData = new FormData()
      formData.append('file', file)

      // Call upload API with auth token
      const response = await fetch('/api/upload-training-data', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      setUploadStats(result.results)
      setUploadPositiveSuccess(true)
      setTimeout(() => setUploadPositiveSuccess(false), 10000)
    } catch (error: any) {
      console.error("Upload positive error:", error)
      setUploadPositiveError(error.message || "Failed to upload data")
      setTimeout(() => setUploadPositiveError(null), 10000)
    } finally {
      setIsUploadingPositive(false)
    }
  }

  const handleUploadNegative = async (file: File) => {
    setIsUploadingNegative(true)
    setUploadNegativeError(null)
    setUploadNegativeSuccess(false)
    setUploadStats(null)

    try {
      // Get session token for authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('You must be logged in to upload data')
      }

      // Create form data
      const formData = new FormData()
      formData.append('file', file)

      // Call upload API with auth token
      const response = await fetch('/api/upload-training-data', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      setUploadStats(result.results)
      setUploadNegativeSuccess(true)
      setTimeout(() => setUploadNegativeSuccess(false), 10000)
    } catch (error: any) {
      console.error("Upload negative error:", error)
      setUploadNegativeError(error.message || "Failed to upload data")
      setTimeout(() => setUploadNegativeError(null), 10000)
    } finally {
      setIsUploadingNegative(false)
    }
  }

  const fetchFlaggedMessages = async () => {
    console.log('Fetching flagged messages...')
    
    // Get auth token for API calls
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.error('No session found')
      setFlaggedMessages([])
      return
    }
    
    try {
      // Use API route that bypasses RLS to get flagged messages with persona info
      const response = await fetch('/api/flagged-messages', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch flagged messages: ${response.status}`)
      }
      
      const result = await response.json()
      if (result.success && result.flaggedMessages) {
        setFlaggedMessages(result.flaggedMessages)
        return
      } else {
        throw new Error(result.error || 'Failed to fetch flagged messages')
      }
    } catch (err: any) {
      console.error('Error fetching flagged messages:', err)
      setFlaggedMessages([])
      return
    }
    
    // Fallback to direct query if API fails (old method)
    const { data, error } = await supabase
      .from("flagged_messages")
      .select("*")
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching flagged messages:', error)
      setFlaggedMessages([])
      return
    }
    
    // Enrich data with persona info, user context, and reporter info
    const enrichedData = await Promise.all((data || []).map(async (flag) => {
      let persona = null
      let userContext = null
      let previousReportsCount = 0
      let reporterEmail = null
      
      // Get message and conversation info
      if (flag.message_id) {
        try {
          const { data: message, error: messageError } = await supabase
            .from("messages")
            .select("conversation_id, created_at")
            .eq("id", flag.message_id)
            .single()
          
          if (!messageError && message?.conversation_id) {
            // Get conversation and persona
            const { data: conversation, error: convError } = await supabase
              .from("conversations")
              .select("persona_id")
              .eq("id", message.conversation_id)
              .single()
            
            if (!convError && conversation?.persona_id) {
              const { data: personaData, error: personaError } = await supabase
                .from("personas")
                .select("id, title, avatar_url")
                .eq("id", conversation.persona_id)
                .single()
              
              if (!personaError && personaData) {
                persona = personaData
              } else {
                console.warn(`Persona not found for ID: ${conversation.persona_id}`, personaError)
              }
              
              // Get user message context (the message before the flagged one)
              const { data: userMessage } = await supabase
                .from("messages")
                .select("content")
                .eq("conversation_id", message.conversation_id)
                .eq("sender", "user")
                .lt("created_at", message.created_at)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle()
              
              userContext = userMessage?.content || null
            } else {
              console.warn(`Conversation not found for ID: ${message.conversation_id}`, convError)
            }
          } else {
            console.warn(`Message not found for ID: ${flag.message_id}`, messageError)
          }
        } catch (err) {
          console.error(`Error fetching message/conversation for flag ${flag.id}:`, err)
        }
      } else {
        // If no message_id, try to find message by content match (fallback)
        // This is a best-effort approach for older flags that might not have message_id
        if (flag.content) {
          try {
            const { data: matchingMessages } = await supabase
              .from("messages")
              .select("conversation_id, created_at")
              .eq("content", flag.content)
              .eq("sender", "assistant")
              .order("created_at", { ascending: false })
              .limit(1)
            
            if (matchingMessages && matchingMessages.length > 0) {
              const message = matchingMessages[0]
              const { data: conversation } = await supabase
                .from("conversations")
                .select("persona_id")
                .eq("id", message.conversation_id)
                .single()
              
              if (conversation?.persona_id) {
                const { data: personaData } = await supabase
                  .from("personas")
                  .select("id, title, avatar_url")
                  .eq("id", conversation.persona_id)
                  .single()
                
                if (personaData) {
                  persona = personaData
                }
              }
            }
          } catch (err) {
            console.error(`Error in fallback persona lookup for flag ${flag.id}:`, err)
          }
        }
      }
      
      // Get reporter email and previous reports count
      if (flag.user_id) {
        // Get previous reports count
        const { count } = await supabase
          .from("flagged_messages")
          .select("*", { count: 'exact', head: true })
          .eq("user_id", flag.user_id)
        
        previousReportsCount = count || 0
        
        // Get email via API endpoint with auth token
        if (authToken) {
          try {
            const response = await fetch(`/api/user-email?userId=${flag.user_id}`, {
              headers: {
                'Authorization': `Bearer ${authToken}`
              }
            })
            if (response.ok) {
              const data = await response.json()
              reporterEmail = data.email || 'Unknown'
            } else {
              console.warn(`Failed to fetch email for user ${flag.user_id}:`, response.status)
              reporterEmail = 'Unknown'
            }
          } catch (err) {
            console.error('Error fetching user email:', err)
            reporterEmail = 'Unknown'
          }
        } else {
          console.warn('No auth token available for fetching user email')
          reporterEmail = 'Unknown'
        }
      } else {
        console.warn(`Flag ${flag.id} has no user_id`)
        reporterEmail = 'Unknown'
      }
      
      return {
        ...flag,
        persona,
        userContext,
        previousReportsCount,
        reporterEmail
      }
    }))
    
    console.log('Fetched flagged messages:', enrichedData)
    setFlaggedMessages(enrichedData)
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

  const handleTogglePersonaStatus = async (persona: any) => {
    const { error } = await supabase
      .from('personas')
      .update({ is_active: !persona.is_active })
      .eq('id', persona.id)
    
    if (error) {
      console.error('Error toggling persona status:', error)
      alert('Failed to update persona status')
    } else {
      fetchPersonas()
    }
  }

  const handleDeletePersona = async (id: string) => {
    if (!confirm("Are you sure you want to delete this persona? This action cannot be undone.")) {
      return
    }
    const { error } = await supabase.from('personas').delete().eq('id', id)
    if (error) {
      console.error('Error deleting persona:', error)
      alert('Failed to delete persona')
    } else {
      fetchPersonas()
    }
  }

  const fetchTrainingScenarios = async () => {
    const { data, error } = await supabase
      .from("training_scenarios")
      .select(`
        *,
        personas (
          id,
          title
        )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching training scenarios:", error)
    } else {
      setTrainingScenarios(data || [])
    }
  }

  const handleTrainingScenarioSubmit = async (data: TrainingScenarioFormData) => {
    const scenarioData: any = {
      title: data.title,
      description: data.description,
      scenario_type: data.scenario_type,
      difficulty_level: data.difficulty_level,
      initial_message: data.initial_message,
      system_prompt: data.system_prompt,
      expected_behaviors: data.expected_behaviors,
      persona_id: data.persona_id || null,
      is_active: data.is_active,
    }

    if (editingTrainingScenario && editingTrainingScenario.id) {
      const { error } = await supabase
        .from("training_scenarios")
        .update(scenarioData)
        .eq("id", editingTrainingScenario.id)

      if (error) {
        console.error("Error updating training scenario:", error)
        alert("Failed to update training scenario")
      } else {
        setIsTrainingScenarioFormOpen(false)
        setEditingTrainingScenario(null)
        fetchTrainingScenarios()
      }
    } else {
      const { error } = await supabase
        .from("training_scenarios")
        .insert(scenarioData)

      if (error) {
        console.error("Error creating training scenario:", error)
        alert("Failed to create training scenario")
      } else {
        setIsTrainingScenarioFormOpen(false)
        fetchTrainingScenarios()
      }
    }
  }

  const handleEditTrainingScenario = (scenario: any) => {
    const formData: TrainingScenarioFormData = {
      id: scenario.id,
      title: scenario.title,
      description: scenario.description || "",
      scenario_type: scenario.scenario_type,
      difficulty_level: scenario.difficulty_level,
      initial_message: scenario.initial_message,
      system_prompt: scenario.system_prompt,
      expected_behaviors: scenario.expected_behaviors || [],
      persona_id: scenario.persona_id || null,
      is_active: scenario.is_active,
    }
    setEditingTrainingScenario(formData)
    setIsTrainingScenarioFormOpen(true)
  }

  const handleDeleteTrainingScenario = async (id: string) => {
    if (!confirm("Are you sure you want to delete this training scenario? This action cannot be undone.")) {
      return
    }
    const { error } = await supabase
      .from("training_scenarios")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting training scenario:", error)
      alert("Failed to delete training scenario")
    } else {
      fetchTrainingScenarios()
    }
  }

  const handleToggleTrainingScenarioStatus = async (scenario: any) => {
    const { error } = await supabase
      .from("training_scenarios")
      .update({ is_active: !scenario.is_active })
      .eq("id", scenario.id)

    if (error) {
      console.error("Error toggling training scenario status:", error)
      alert("Failed to update training scenario status")
    } else {
      fetchTrainingScenarios()
    }
  }

  const fetchAPIKeys = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch("/api/api-keys?admin=true", {
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
        setSelectedPersonaRequest(null);
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f10] via-[#1a1a1f] to-[#23232a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading admin dashboard...</p>
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
            onClick={() => setActiveTab("training-scenarios")}
            className={`flex items-center px-4 py-2 rounded-md transition-colors ${
              activeTab === "training-scenarios" 
                ? "bg-green-600 text-white font-medium" 
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <Target className="w-4 h-4 mr-2" /> Training Scenarios
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
            <Flag className="w-4 h-4 mr-2" /> Data & Training
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
          <div className="space-y-8">
            {loadingOverview ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <>
            {/* Key Metrics Section */}
            <div>
              <h2 className="text-2xl font-bold text-white text-center mb-6">Key Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                    <CheckCircle className={`w-4 h-4 mr-1 ${
                      analyticsData.fairnessScore >= 4 ? 'text-green-400' : 
                      analyticsData.fairnessScore >= 3 ? 'text-yellow-400' : 
                      'text-red-400'
                    }`} />
                    <span className={`text-sm ${
                      analyticsData.fairnessScore >= 4 ? 'text-green-400' : 
                      analyticsData.fairnessScore >= 3 ? 'text-yellow-400' : 
                      'text-red-400'
                    }`}>
                      {analyticsData.fairnessScore >= 4 ? 'Excellent' : 
                       analyticsData.fairnessScore >= 3 ? 'Good' : 
                       analyticsData.fairnessScore >= 2 ? 'Fair' : 'Needs Improvement'} rating
                    </span>
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
                    <Star className={`w-4 h-4 mr-1 ${
                      analyticsData.userSatisfaction >= 4 ? 'text-green-400' : 
                      analyticsData.userSatisfaction >= 3 ? 'text-yellow-400' : 
                      'text-red-400'
                    }`} />
                    <span className={`text-sm ${
                      analyticsData.userSatisfaction >= 4 ? 'text-green-400' : 
                      analyticsData.userSatisfaction >= 3 ? 'text-yellow-400' : 
                      'text-red-400'
                    }`}>
                      {analyticsData.userSatisfaction >= 4 ? 'Excellent' : 
                       analyticsData.userSatisfaction >= 3 ? 'Good' : 
                       analyticsData.userSatisfaction >= 2 ? 'Fair' : 'Needs Improvement'}
                    </span>
                  </div>
                </CardContent>
              </Card>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Card className="bg-[#1a1a1f] border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Avg Session Duration</p>
                        <p className="text-2xl font-bold text-white">{analyticsData.avgSessionDuration.toFixed(1)}m</p>
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
                        <p className="text-2xl font-bold text-white">
                          {analyticsData.totalConversations > 0 
                            ? (analyticsData.totalMessages / analyticsData.totalConversations).toFixed(1)
                            : '0.0'}
                        </p>
                      </div>
                      <MessageCircle className="w-6 h-6 text-green-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Analytics & Performance Section */}
            <div>
              <h2 className="text-2xl font-bold text-white text-center mb-6">Analytics & Performance</h2>
              <div className="mb-6">
              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white font-semibold">Conversation Trends</CardTitle>
                  <CardDescription className="text-gray-400 text-sm">Daily conversations over the last week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
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
              </div>

              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white font-semibold">Conversations by Persona</CardTitle>
                  <CardDescription className="text-gray-400 text-sm">Distribution of conversations across different personas</CardDescription>
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

            {/* User Feedback & Survey Results Section */}
            <div>
              <h2 className="text-2xl font-bold text-white text-center mb-6">User Feedback & Survey Results</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white font-semibold">Survey Results</CardTitle>
                  <CardDescription className="text-gray-400 text-sm">Average ratings across all dimensions</CardDescription>
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
                  <CardTitle className="text-white font-semibold flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-cyan-400" />
                    User Feedback
                  </CardTitle>
                  <CardDescription className="text-gray-400 text-sm">
                    Recent feedback messages from users
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {analyticsData.feedbackMessages.length > 0 ? (
                      analyticsData.feedbackMessages
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .slice(0, 5)
                        .map((feedback) => (
                          <div key={feedback.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs text-cyan-400 border-cyan-400">
                                  {analyticsData.personaNameMap[feedback.persona_id] || 'Unknown Persona'}
                                </Badge>
                                <span className="text-xs text-gray-400">
                                  {new Date(feedback.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <blockquote className="text-gray-200 italic border-l-4 border-cyan-400 pl-4 text-sm">
                              "{feedback.open_ended}"
                            </blockquote>
                          </div>
                        ))
                    ) : (
                      <div className="text-center py-8">
                        <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">No feedback messages yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              </div>
            </div>
              </>
            )}
          </div>
        )}

        {/* Personas Tab */}
        {activeTab === "personas" && (
          <div className="space-y-6">
            {loadingPersonas ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <>
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Manage Personas</h2>
                <p className="text-gray-400">Create and manage AI personas for your platform</p>
              </div>
              <Button onClick={() => setIsPersonaFormOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
                <PlusCircle className="w-4 h-4 mr-2" /> Add Persona
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Personas</p>
                      <p className="text-2xl font-bold text-white">{personas.length}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-400 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Active</p>
                      <p className="text-2xl font-bold text-green-400">{personas.filter(p => p.is_active).length}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-400 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Inactive</p>
                      <p className="text-2xl font-bold text-gray-400">{personas.filter(p => !p.is_active).length}</p>
                    </div>
                    <X className="w-8 h-8 text-gray-400 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Personas Grid */}
            {personas.length === 0 ? (
              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-12">
                  <div className="text-center">
                    <Users className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No personas yet</h3>
                    <p className="text-gray-400 mb-6">Get started by creating your first AI persona</p>
                    <Button onClick={() => setIsPersonaFormOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
                      <PlusCircle className="w-4 h-4 mr-2" /> Create First Persona
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {personas.map(persona => (
                  <Card key={persona.id} className="bg-[#1a1a1f] border-gray-700 hover:border-green-500/50 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {persona.avatar_url ? (
                              <img src={persona.avatar_url} alt={persona.title} className="w-16 h-16 object-cover rounded-full" />
                            ) : (
                              <span className="text-2xl font-bold text-white">{persona.title?.[0] || "?"}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-white mb-1 truncate">{persona.title}</h3>
                            <Badge 
                              variant={persona.is_active ? "default" : "secondary"} 
                              className={persona.is_active ? "bg-green-600 text-white" : "bg-gray-600 text-gray-300"}
                            >
                              {persona.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-gray-200 text-sm mb-4 line-clamp-3 min-h-[3.75rem]">
                        {persona.description || 'No description provided'}
                      </p>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleTogglePersonaStatus(persona)}
                          className={`hover:bg-opacity-20 ${
                            persona.is_active 
                              ? 'hover:bg-yellow-500/20 text-yellow-400' 
                              : 'hover:bg-green-500/20 text-green-400'
                          }`}
                        >
                          {persona.is_active ? (
                            <>
                              <PowerOff className="h-4 w-4 mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Power className="h-4 w-4 mr-2" />
                              Activate
                            </>
                          )}
                        </Button>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditPersona(persona)}
                            className="hover:bg-blue-500/20 text-blue-400"
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="hover:bg-red-500/20 text-red-400"
                            onClick={() => handleDeletePersona(persona.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
              </>
            )}
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === "api-keys" && (
          <div className="space-y-6">
            {loadingApiKeys ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <>
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">API Key Management</h2>
                <p className="text-gray-400">Manage and monitor API key usage</p>
              </div>
              <Badge variant="outline" className="border-blue-500 text-blue-400">
                {apiKeys.length} Active Keys
              </Badge>
            </div>
            
            {/* Existing API Keys */}
            <Card className="bg-[#1a1a1f] border-gray-700">
              <CardHeader>
                <CardTitle className="text-white font-semibold">Active API Keys</CardTitle>
                <CardDescription className="text-gray-400 text-sm">Manage existing API keys and monitor usage</CardDescription>
              </CardHeader>
              <CardContent>
                {apiKeys.length === 0 ? (
                  <div className="text-center py-12">
                    <Key className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No API keys generated yet</h3>
                    <p className="text-gray-400">Generate API keys through the developers portal</p>
                  </div>
                ) : (
                    <div className="space-y-4">
                      {apiKeys.map((key) => (
                        <div key={key.id} className="flex items-center justify-between p-4 bg-[#171717] rounded-lg border border-gray-600">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold text-white">{key.name}</h3>
                              <Badge 
                                variant={key.usage_count >= key.rate_limit ? "destructive" : "default"}
                                className={key.usage_count >= key.rate_limit ? "" : "bg-green-600"}
                              >
                                {key.usage_count >= key.rate_limit ? "Limit Reached" : "Active"}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-200 mb-1">
                              <span className="text-gray-400">User:</span> {key.user_email || 'Unknown'}
                            </p>
                            <p className="text-sm text-gray-300">
                              Created: {new Date(key.created_at).toLocaleDateString()}
                            </p>
                            {key.last_used && (
                              <p className="text-sm text-gray-300">
                                Last used: {new Date(key.last_used).toLocaleDateString()}
                              </p>
                            )}
                            <p className="text-sm text-gray-300">
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
              </>
            )}
          </div>
        )}

        {/* Moderation & Training Data Tab */}
        {activeTab === "moderation" && (
          <div className="space-y-6">
            {loadingModeration ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <>
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Data Collection & Training</h2>
                <p className="text-gray-400">Review flagged messages and export training data</p>
              </div>
              <Badge variant="outline" className="border-red-500 text-red-400">
                {flaggedMessages.filter(m => m.status === 'pending').length} Pending
              </Badge>
            </div>

            {/* Training Data Insights */}
            {isLoadingInsights ? (
              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                </CardContent>
              </Card>
            ) : trainingDataInsights && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-[#1a1a1f] border-gray-700">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-400">Total Feedback</CardTitle>
                    <MessageCircle className="h-4 w-4 text-blue-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{trainingDataInsights.total}</div>
                    <p className="text-xs text-gray-400">Conversations with feedback</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-[#1a1a1f] border-gray-700">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-400">High Quality</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-400">{trainingDataInsights.highQuality}</div>
                    <p className="text-xs text-gray-400">Score ≥ 4.0</p>
                    {trainingDataInsights.total > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {((trainingDataInsights.highQuality / trainingDataInsights.total) * 100).toFixed(1)}%
                      </p>
                    )}
                  </CardContent>
                </Card>
                
                <Card className="bg-[#1a1a1f] border-gray-700">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-400">Approved Flags</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-400">{trainingDataInsights.lowQuality}</div>
                    <p className="text-xs text-gray-400">Resolved/Approved flag messages</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-[#1a1a1f] border-gray-700">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-400">Average Score</CardTitle>
                    <Star className="h-4 w-4 text-yellow-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">
                      {trainingDataInsights.avgScore.toFixed(2)}
                    </div>
                    <p className="text-xs text-gray-400">Out of 5.0</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Content Moderation Section */}
            <div>
              <h3 className="text-2xl font-bold text-white mb-4">Content Moderation</h3>

            {flaggedMessages.length === 0 ? (
              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-12">
                  <div className="text-center">
                    <Flag className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No flagged messages</h3>
                    <p className="text-gray-400">All clear! No messages have been flagged for review.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-0">
                  <div className="max-h-[380px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-[#1a1a1f] z-10">
                        <TableRow className="border-gray-700">
                          <TableHead className="text-gray-400">Persona</TableHead>
                          <TableHead className="text-gray-400">Severity</TableHead>
                          <TableHead className="text-gray-400">Status</TableHead>
                          <TableHead className="text-gray-400">Reason</TableHead>
                          <TableHead className="text-gray-400">Date</TableHead>
                          <TableHead className="text-gray-400">Reporter</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {flaggedMessages.map((flag) => {
                          const severity = flag.severity?.toUpperCase() || 'HIGH'
                          const status = flag.status || 'pending'
                          const date = new Date(flag.created_at)
                          const formattedDate = date.toLocaleDateString()
                          const formattedTime = date.toLocaleTimeString()
                          
                          return (
                            <TableRow 
                              key={flag.id} 
                              className="border-gray-700 cursor-pointer hover:bg-gray-800/50"
                              onClick={() => {
                                setSelectedFlaggedMessage(flag)
                                setIsFlaggedMessageDialogOpen(true)
                              }}
                            >
                              <TableCell className="text-white font-medium">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {flag.persona?.avatar_url ? (
                                      <img src={flag.persona.avatar_url} alt={flag.persona.title} className="w-8 h-8 object-cover rounded-full" />
                                    ) : (
                                      <span className="text-sm font-bold text-white">{flag.persona?.title?.[0] || "?"}</span>
                                    )}
                                  </div>
                                  <span>{flag.persona?.title || 'Unknown Persona'}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-300">
                                <Badge variant="destructive" className="bg-red-600">
                                  {severity}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-gray-300">
                                <Badge 
                                  variant={status === 'pending' ? 'secondary' : 'default'} 
                                  className={status === 'pending' ? 'bg-yellow-600 text-white' : 'bg-green-600 text-white'}
                                >
                                  {status.charAt(0).toUpperCase() + status.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-gray-300">
                                <span className="text-red-400">{flag.reason}</span>
                              </TableCell>
                              <TableCell className="text-gray-300">
                                <div className="text-sm">
                                  <div>{formattedDate}</div>
                                  <div className="text-gray-500">{formattedTime}</div>
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-300">
                                <div className="text-sm">
                                  <div>{flag.reporterEmail || 'Unknown'}</div>
                                  {flag.previousReportsCount > 0 && (
                                    <div className="text-gray-500 text-xs">
                                      {flag.previousReportsCount} previous report{flag.previousReportsCount !== 1 ? 's' : ''}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Flagged Message Detail Dialog */}
            <Dialog open={isFlaggedMessageDialogOpen} onOpenChange={setIsFlaggedMessageDialogOpen}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#1a1a1f] border-gray-700 text-white">
                {selectedFlaggedMessage && (
                  <>
                    <DialogHeader>
                      <DialogTitle className="text-white">Content Moderation Report</DialogTitle>
                      <DialogDescription className="text-gray-400">
                        Review flagged message details and take action
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                      {/* Header Section */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          {/* Persona Avatar */}
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {selectedFlaggedMessage.persona?.avatar_url ? (
                              <img src={selectedFlaggedMessage.persona.avatar_url} alt={selectedFlaggedMessage.persona.title} className="w-16 h-16 object-cover rounded-full" />
                            ) : (
                              <span className="text-2xl font-bold text-white">{selectedFlaggedMessage.persona?.title?.[0] || "?"}</span>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="destructive" className="bg-red-600">
                                {selectedFlaggedMessage.severity?.toUpperCase() || 'HIGH'}
                              </Badge>
                              <Badge 
                                variant={selectedFlaggedMessage.status === 'pending' ? 'secondary' : 'default'} 
                                className={selectedFlaggedMessage.status === 'pending' ? 'bg-yellow-600 text-white' : 'bg-green-600 text-white'}
                              >
                                {(selectedFlaggedMessage.status || 'pending').charAt(0).toUpperCase() + (selectedFlaggedMessage.status || 'pending').slice(1)}
                              </Badge>
                            </div>
                            <div className="text-gray-400 text-sm">
                              {new Date(selectedFlaggedMessage.created_at).toLocaleDateString()} {new Date(selectedFlaggedMessage.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Persona Name and Reason */}
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {selectedFlaggedMessage.persona?.title || 'Unknown Persona'}
                        </h3>
                        <p className="text-red-400 text-sm font-medium">{selectedFlaggedMessage.reason}</p>
                      </div>

                      {/* Flagged Response */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">Flagged Response</h4>
                        <div className="bg-[#171717] border border-gray-700 rounded-lg p-4">
                          <p className="text-gray-200 whitespace-pre-wrap">{selectedFlaggedMessage.content}</p>
                        </div>
                      </div>

                      {/* Context */}
                      {selectedFlaggedMessage.userContext && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-400 mb-2">Context</h4>
                          <div className="bg-[#171717] border border-gray-700 rounded-lg p-4">
                            <p className="text-gray-200">User: {selectedFlaggedMessage.userContext}</p>
                          </div>
                        </div>
                      )}

                      {/* Reporter Information */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">Reporter Information</h4>
                        <div className="space-y-1 text-sm">
                          <p className="text-gray-200">
                            <span className="text-gray-400">Email:</span> {selectedFlaggedMessage.reporterEmail || 'Unknown'}
                          </p>
                          <p className="text-gray-200">
                            <span className="text-gray-400">Previous Reports:</span> {selectedFlaggedMessage.previousReportsCount || 0}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {selectedFlaggedMessage.status === 'pending' && (
                        <div className="flex gap-3 pt-4 border-t border-gray-700">
                          <Button
                            onClick={() => {
                              handleApproveFlaggedMessage(selectedFlaggedMessage.id)
                              setIsFlaggedMessageDialogOpen(false)
                            }}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => {
                              handleRemoveFlaggedMessage(selectedFlaggedMessage.id)
                              setIsFlaggedMessageDialogOpen(false)
                            }}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>
            </div>

            {/* Training Data Management - Unified Section */}
            <Card className="bg-[#1a1a1f] border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Brain className="w-5 h-5 text-cyan-400" />
                  Training Data Management
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Export data from Supabase (download JSONL files) or upload new data to Supabase (insert from JSONL files). These are independent operations for managing training data for RAG/embeddings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Shared Filters */}
                <div className="space-y-4 pb-4 border-b border-gray-700">
                  <h3 className="text-lg font-semibold text-white">Shared Filters</h3>
                  
                  {/* Date Range */}
                  <div className="space-y-2">
                    <Label className="text-gray-300">Date Range</Label>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="flex-1 bg-[#23232a] border-gray-600 !text-gray-50 hover:!text-white justify-start text-left font-normal"
                          >
                            {startDate ? format(startDate, "PPP") : "Start date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-[#1a1a1f] border-gray-700">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            initialFocus
                            className="bg-[#1a1a1f]"
                            classNames={{
                              day: "text-gray-300 hover:text-white hover:bg-gray-700",
                              day_selected: "bg-cyan-500 text-white hover:bg-cyan-600 hover:text-white",
                              day_today: "bg-gray-800 text-white font-semibold",
                              day_outside: "text-gray-500 opacity-50",
                              caption_label: "text-gray-200",
                              nav_button: "text-gray-300 hover:text-white",
                              head_cell: "text-gray-400",
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="flex-1 bg-[#23232a] border-gray-600 !text-gray-50 hover:!text-white justify-start text-left font-normal"
                          >
                            {endDate ? format(endDate, "PPP") : "End date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-[#1a1a1f] border-gray-700">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            initialFocus
                            className="bg-[#1a1a1f]"
                            classNames={{
                              day: "text-gray-300 hover:text-white hover:bg-gray-700",
                              day_selected: "bg-cyan-500 text-white hover:bg-cyan-600 hover:text-white",
                              day_today: "bg-gray-800 text-white font-semibold",
                              day_outside: "text-gray-500 opacity-50",
                              caption_label: "text-gray-200",
                              nav_button: "text-gray-300 hover:text-white",
                              head_cell: "text-gray-400",
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Persona Filter */}
                  <div className="space-y-2">
                    <Label className="text-gray-300">Persona (Optional)</Label>
                    <Select value={selectedPersonaForExport} onValueChange={setSelectedPersonaForExport}>
                      <SelectTrigger className="bg-[#23232a] border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Personas</SelectItem>
                        {personas.map((persona) => (
                          <SelectItem key={persona.id} value={persona.id}>
                            {persona.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Positive Examples Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <h3 className="text-lg font-semibold text-white">Positive Examples</h3>
                  </div>
                  <p className="text-sm text-gray-400">High-quality feedback conversations that show what the chatbot SHOULD do.</p>
                  <div className="bg-blue-900/20 border border-blue-700/50 rounded-md p-3 text-sm text-blue-200">
                    <strong>Note:</strong> Export downloads data from Supabase. Upload/Insert adds new data to Supabase. These are independent operations - you can use either one.
                  </div>
                  
                  {/* Score Filter */}
                  <div className="space-y-2">
                    <Label className="text-gray-300">Score Range</Label>
                    <Select value={scoreFilter} onValueChange={(value: 'high' | 'low' | 'custom') => setScoreFilter(value)}>
                      <SelectTrigger className="bg-[#23232a] border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High Quality (≥ 4.0)</SelectItem>
                        <SelectItem value="low">Low Quality (&lt; 2.5)</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                    {scoreFilter === 'custom' && (
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label className="text-gray-400 text-sm">Min Score</Label>
                          <Input
                            type="number"
                            min="0"
                            max="5"
                            step="0.1"
                            value={customMinScore}
                            onChange={(e) => setCustomMinScore(e.target.value)}
                            className="bg-[#23232a] border-gray-600 text-white"
                            placeholder="0.0"
                          />
                        </div>
                        <div className="flex-1">
                          <Label className="text-gray-400 text-sm">Max Score</Label>
                          <Input
                            type="number"
                            min="0"
                            max="5"
                            step="0.1"
                            value={customMaxScore}
                            onChange={(e) => setCustomMaxScore(e.target.value)}
                            className="bg-[#23232a] border-gray-600 text-white"
                            placeholder="5.0"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Export and Upload Buttons */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleExportTrainingData}
                        disabled={isExporting}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isExporting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Exporting...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Export Positive Examples
                          </>
                        )}
                      </Button>
                      <label className="cursor-pointer">
                        <Button
                          type="button"
                          disabled={isUploadingPositive}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          asChild
                        >
                          <span>
                            {isUploadingPositive ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                Insert into Supabase
                              </>
                            )}
                          </span>
                        </Button>
                        <input
                          type="file"
                          accept=".jsonl"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              handleUploadPositive(file)
                            }
                          }}
                        />
                      </label>
                    </div>
                    {exportSuccess && (
                      <span className="text-green-400 text-sm">Export successful! File downloaded.</span>
                    )}
                    {exportError && (
                      <span className="text-red-400 text-sm">{exportError}</span>
                    )}
                    {uploadPositiveSuccess && (
                      <div className="space-y-1">
                        <span className="text-green-400 text-sm">✓ Successfully inserted into Supabase!</span>
                        {uploadStats && (
                          <div className="text-xs text-gray-400 ml-4">
                            Inserted: {uploadStats.positive.processed} positive examples into conversation_embeddings table
                            {uploadStats.positive.skipped > 0 && (
                              <span className="text-gray-500"> ({uploadStats.positive.skipped} duplicates skipped)</span>
                            )}
                            {uploadStats.positive.errors.length > 0 && (
                              <span className="text-yellow-400"> ({uploadStats.positive.errors.length} errors)</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {uploadPositiveError && (
                      <span className="text-red-400 text-sm">{uploadPositiveError}</span>
                    )}
                  </div>
                </div>

                {/* Negative Examples Section */}
                <div className="space-y-4 pt-4 border-t border-gray-700">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <h3 className="text-lg font-semibold text-white">Negative Examples</h3>
                  </div>
                  <p className="text-sm text-gray-400">Flagged messages that show what the chatbot should NOT do. Only exports resolved/approved flags.</p>
                  <div className="bg-blue-900/20 border border-blue-700/50 rounded-md p-3 text-sm text-blue-200">
                    <strong>Note:</strong> Export downloads data from Supabase. Upload/Insert adds new data to Supabase. These are independent operations - you can use either one.
                  </div>
                  
                  {/* Severity Filter */}
                  <div className="space-y-2">
                    <Label className="text-gray-300">Severity Filter (Optional)</Label>
                    <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                      <SelectTrigger className="bg-[#23232a] border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Severities</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Export and Upload Buttons */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleExportFlaggedMessages}
                        disabled={isExportingFlagged}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {isExportingFlagged ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Exporting...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Export Negative Examples
                          </>
                        )}
                      </Button>
                      <label className="cursor-pointer">
                        <Button
                          type="button"
                          disabled={isUploadingNegative}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          asChild
                        >
                          <span>
                            {isUploadingNegative ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                Insert into Supabase
                              </>
                            )}
                          </span>
                        </Button>
                        <input
                          type="file"
                          accept=".jsonl"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              handleUploadNegative(file)
                            }
                          }}
                        />
                      </label>
                    </div>
                    {exportFlaggedSuccess && (
                      <span className="text-green-400 text-sm">Export successful! File downloaded.</span>
                    )}
                    {exportFlaggedError && (
                      <span className="text-red-400 text-sm">{exportFlaggedError}</span>
                    )}
                    {uploadNegativeSuccess && (
                      <div className="space-y-1">
                        <span className="text-green-400 text-sm">✓ Successfully inserted into Supabase!</span>
                        {uploadStats && (
                          <div className="text-xs text-gray-400 ml-4">
                            Inserted: {uploadStats.negative.processed} negative examples into flag_negative_examples table
                            {uploadStats.negative.skipped > 0 && (
                              <span className="text-gray-500"> ({uploadStats.negative.skipped} duplicates skipped)</span>
                            )}
                            {uploadStats.negative.errors.length > 0 && (
                              <span className="text-yellow-400"> ({uploadStats.negative.errors.length} errors)</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {uploadNegativeError && (
                      <span className="text-red-400 text-sm">{uploadNegativeError}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
              </>
            )}
          </div>
        )}

        {/* Persona Requests Tab */}
        {activeTab === "persona-requests" && (
          <div className="space-y-6">
            {loadingPersonaRequests ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <>
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Persona Requests</h2>
                <p className="text-gray-400">Review and manage persona requests from users</p>
              </div>
              <Badge variant="outline" className="border-blue-500 text-blue-400">
                {personaRequests.filter(r => r.status === 'pending').length} Pending
              </Badge>
            </div>
            {personaRequests.length === 0 ? (
              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-12">
                  <div className="text-center">
                    <Mail className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No persona requests yet</h3>
                    <p className="text-gray-400">Users can request new personas from the personas page</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-0">
                  <div className="max-h-[600px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-700">
                          <TableHead className="text-gray-400">User</TableHead>
                          <TableHead className="text-gray-400">Persona Name</TableHead>
                          <TableHead className="text-gray-400">Description</TableHead>
                          <TableHead className="text-gray-400">Status</TableHead>
                          <TableHead className="text-gray-400">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {personaRequests.map(request => {
                          const date = new Date(request.created_at)
                          const formattedDate = date.toLocaleDateString()
                          const formattedTime = date.toLocaleTimeString()
                          
                          return (
                            <TableRow 
                              key={request.id} 
                              className="border-gray-700 cursor-pointer hover:bg-gray-800/50"
                              onClick={() => {
                                setSelectedPersonaRequest(request)
                                setAdminNotes(request.admin_notes || '')
                                setIsPersonaRequestDialogOpen(true)
                              }}
                            >
                              <TableCell className="text-gray-200">{request.user_email || 'Unknown'}</TableCell>
                              <TableCell className="font-semibold text-white">{request.persona_name}</TableCell>
                              <TableCell className="text-gray-200 max-w-xs truncate">{request.description}</TableCell>
                              <TableCell>
                                <Badge 
                                  variant={
                                    request.status === 'approved' ? 'default' :
                                    request.status === 'rejected' ? 'destructive' :
                                    request.status === 'completed' ? 'default' :
                                    'secondary'
                                  }
                                  className={
                                    request.status === 'pending' ? 'bg-yellow-600 text-white' :
                                    request.status === 'approved' ? 'bg-blue-600 text-white' :
                                    request.status === 'completed' ? 'bg-green-600 text-white' :
                                    'bg-red-600 text-white'
                                  }
                                >
                                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-gray-300">
                                <div className="text-sm">
                                  <div>{formattedDate}</div>
                                  <div className="text-gray-500">{formattedTime}</div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Persona Request Detail Dialog */}
            <Dialog open={isPersonaRequestDialogOpen} onOpenChange={(open) => {
              setIsPersonaRequestDialogOpen(open)
              if (!open) {
                setSelectedPersonaRequest(null)
                setAdminNotes("")
              }
            }}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#1a1a1f] border-gray-700 text-white">
                {selectedPersonaRequest && (
                  <>
                    <DialogHeader>
                      <DialogTitle className="text-white">Persona Request Details</DialogTitle>
                      <DialogDescription className="text-gray-400">
                        Review and manage persona request
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                      {/* Request Header */}
                      <div className="bg-[#171717] border border-gray-700 rounded-lg p-4">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl font-bold text-white">{selectedPersonaRequest.persona_name?.[0] || "?"}</span>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge 
                                variant={
                                  selectedPersonaRequest.status === 'approved' ? 'default' :
                                  selectedPersonaRequest.status === 'rejected' ? 'destructive' :
                                  selectedPersonaRequest.status === 'completed' ? 'default' :
                                  'secondary'
                                }
                                className={
                                  selectedPersonaRequest.status === 'pending' ? 'bg-yellow-600 text-white' :
                                  selectedPersonaRequest.status === 'approved' ? 'bg-blue-600 text-white' :
                                  selectedPersonaRequest.status === 'completed' ? 'bg-green-600 text-white' :
                                  'bg-red-600 text-white'
                                }
                              >
                                {selectedPersonaRequest.status.charAt(0).toUpperCase() + selectedPersonaRequest.status.slice(1)}
                              </Badge>
                            </div>
                            <div className="text-gray-400 text-sm">
                              {new Date(selectedPersonaRequest.created_at).toLocaleDateString()} {new Date(selectedPersonaRequest.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Persona Name */}
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Persona Name</h3>
                        <div className="bg-[#171717] border border-gray-700 rounded-lg p-4">
                          <p className="text-white font-medium">{selectedPersonaRequest.persona_name}</p>
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">Description</h4>
                        <div className="bg-[#171717] border border-gray-700 rounded-lg p-4">
                          <p className="text-gray-200 whitespace-pre-wrap">{selectedPersonaRequest.description}</p>
                        </div>
                      </div>

                      {/* User Information */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">Requested By</h4>
                        <div className="bg-[#171717] border border-gray-700 rounded-lg p-4">
                          <p className="text-gray-200">
                            <span className="text-gray-400">Email:</span> {selectedPersonaRequest.user_email || 'Unknown'}
                          </p>
                        </div>
                      </div>

                      {/* Admin Notes */}
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

                      {/* Status Selection */}
                      <div>
                        <Label htmlFor="status" className="text-gray-300">Status</Label>
                        <select
                          id="status"
                          value={selectedPersonaRequest.status}
                          onChange={(e) => setSelectedPersonaRequest({...selectedPersonaRequest, status: e.target.value})}
                          className="w-full bg-[#171717] border-gray-600 text-white rounded-md px-3 py-2 mt-1"
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-4 border-t border-gray-700">
                        {selectedPersonaRequest.status === 'pending' && (
                          <>
                            <Button
                              onClick={() => {
                                updatePersonaRequest(selectedPersonaRequest.id, 'approved', adminNotes)
                                setIsPersonaRequestDialogOpen(false)
                              }}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              onClick={() => {
                                updatePersonaRequest(selectedPersonaRequest.id, 'rejected', adminNotes)
                                setIsPersonaRequestDialogOpen(false)
                              }}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </>
                        )}
                        {selectedPersonaRequest.status === 'approved' && (
                          <Button
                            onClick={() => {
                              updatePersonaRequest(selectedPersonaRequest.id, 'completed', adminNotes)
                              setIsPersonaRequestDialogOpen(false)
                            }}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark as Completed
                          </Button>
                        )}
                        <Button
                          onClick={() => {
                            setIsPersonaRequestDialogOpen(false)
                            setAdminNotes("")
                          }}
                          className="bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>

              </>
            )}
          </div>
        )}

        {/* Training Scenarios Tab */}
        {activeTab === "training-scenarios" && (
          <div className="space-y-6">
            {loadingTrainingScenarios ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <>
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Manage Training Scenarios</h2>
                <p className="text-gray-400">Create and manage training scenarios for users to practice with</p>
              </div>
              <Button 
                onClick={() => {
                  setEditingTrainingScenario(null)
                  setIsTrainingScenarioFormOpen(true)
                }} 
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <PlusCircle className="w-4 h-4 mr-2" /> Add Scenario
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Scenarios</p>
                      <p className="text-2xl font-bold text-white">{trainingScenarios.length}</p>
                    </div>
                    <Target className="w-8 h-8 text-blue-400 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Active</p>
                      <p className="text-2xl font-bold text-green-400">
                        {trainingScenarios.filter(s => s.is_active).length}
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-400 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Linked to Personas</p>
                      <p className="text-2xl font-bold text-purple-400">
                        {trainingScenarios.filter(s => s.persona_id).length}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-purple-400 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Scenarios Table */}
            {trainingScenarios.length === 0 ? (
              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-12">
                  <div className="text-center">
                    <Target className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No training scenarios yet</h3>
                    <p className="text-gray-400 mb-6">Get started by creating your first training scenario</p>
                    <Button 
                      onClick={() => {
                        setEditingTrainingScenario(null)
                        setIsTrainingScenarioFormOpen(true)
                      }} 
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <PlusCircle className="w-4 h-4 mr-2" /> Create First Scenario
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-[#1a1a1f] border-gray-700">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-400">Title</TableHead>
                        <TableHead className="text-gray-400">Persona</TableHead>
                        <TableHead className="text-gray-400">Type</TableHead>
                        <TableHead className="text-gray-400">Difficulty</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trainingScenarios.map((scenario) => (
                        <TableRow key={scenario.id} className="border-gray-700">
                          <TableCell className="text-white font-medium">
                            {scenario.title}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {scenario.personas ? (
                              <Badge variant="outline" className="border-purple-500 text-purple-400">
                                {scenario.personas.title}
                              </Badge>
                            ) : (
                              <span className="text-gray-500">None</span>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            <Badge variant="outline" className="border-gray-500 text-gray-400">
                              {scenario.scenario_type.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            <Badge 
                              variant="outline" 
                              className={
                                scenario.difficulty_level <= 2 
                                  ? "border-green-500 text-green-400"
                                  : scenario.difficulty_level === 3
                                  ? "border-yellow-500 text-yellow-400"
                                  : "border-red-500 text-red-400"
                              }
                            >
                              Level {scenario.difficulty_level}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            <Badge 
                              variant={scenario.is_active ? "default" : "secondary"} 
                              className={scenario.is_active ? "bg-green-600 text-white" : "bg-gray-600 text-gray-300"}
                            >
                              {scenario.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleTrainingScenarioStatus(scenario)}
                                className={`hover:bg-opacity-20 ${
                                  scenario.is_active 
                                    ? 'hover:bg-yellow-500/20 text-yellow-400' 
                                    : 'hover:bg-green-500/20 text-green-400'
                                }`}
                              >
                                {scenario.is_active ? (
                                  <>
                                    <PowerOff className="h-4 w-4 mr-1" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Power className="h-4 w-4 mr-1" />
                                    Activate
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditTrainingScenario(scenario)}
                                className="hover:bg-blue-500/20 text-blue-400"
                              >
                                <Pencil className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="hover:bg-red-500/20 text-red-400"
                                onClick={() => handleDeleteTrainingScenario(scenario.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
              </>
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

        {isTrainingScenarioFormOpen && (
          <TrainingScenarioForm
            isOpen={isTrainingScenarioFormOpen}
            onClose={() => {
              setIsTrainingScenarioFormOpen(false)
              setEditingTrainingScenario(null)
            }}
            onSubmit={handleTrainingScenarioSubmit}
            initialData={editingTrainingScenario || undefined}
          />
        )}
      </div>
    </div>
  )
}