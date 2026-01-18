"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Play, Trophy, TrendingUp, Trash2, Target, CheckCircle, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface TrainingScenario {
  id: string;
  title: string;
  description: string;
  scenarioType: string;
  difficulty: number;
  initialMessage: string;
  systemPrompt: string;
  expectedBehaviors: string[];
  persona?: {
    id: string;
    title: string;
    description?: string;
  };
}

interface TrainingSession {
  id: string;
  scenario_id: string;
  started_at: string;
  completed_at: string | null;
  average_score: number | null;
  status: string;
  training_scenarios?: {
    title: string;
  };
}

export default function TrainingPage() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<TrainingScenario[]>([]);
  const [recentSessions, setRecentSessions] = useState<TrainingSession[]>([]);
  const [sessionStats, setSessionStats] = useState({
    totalSessions: 0,
    averageScore: 0,
  });
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      await fetchScenarios();
      if (isMounted) {
        await fetchRecentSessions();
      }
      if (isMounted) {
        await fetchSessionStats();
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Refresh data when page becomes visible or window gains focus
  useEffect(() => {
    const handleFocus = () => {
      fetchRecentSessions();
      fetchSessionStats();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const fetchScenarios = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Fetch scenarios timeout')), 20000)
      );
      
      const fetchPromise = fetch("/api/training-mode/generate-scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

      if (response.ok) {
        // Fetch all active scenarios from database with persona information
        const queryTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 15000)
        );
        
        const queryPromise = supabase
          .from("training_scenarios")
          .select(`
            *,
            personas (
              id,
              title,
              description
            )
          `)
          .eq("is_active", true)
          .order("difficulty_level", { ascending: true });

        const { data, error } = await Promise.race([queryPromise, queryTimeoutPromise]) as any;

        if (!error && data) {
          setScenarios(
            data.map((s: any) => ({
              id: s.id,
              title: s.title,
              description: s.description,
              scenarioType: s.scenario_type,
              difficulty: s.difficulty_level,
              initialMessage: s.initial_message,
              systemPrompt: s.system_prompt,
              expectedBehaviors: s.expected_behaviors || [],
              persona: s.personas ? {
                id: s.personas.id,
                title: s.personas.title,
                description: s.personas.description,
              } : undefined,
            }))
          );
        } else {
          setScenarios([]);
        }
      } else {
        setScenarios([]);
      }
    } catch (error) {
      console.error("Error fetching scenarios:", error);
      setScenarios([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentSessions = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Fetch sessions timeout')), 15000)
      );
      
      const authPromise = supabase.auth.getUser();
      const {
        data: { user },
      } = await Promise.race([authPromise, timeoutPromise]) as any;

      if (!user) {
        setRecentSessions([]);
        return;
      }

      // Fetch only in-progress sessions (recent sessions)
      // Explicitly filter out completed sessions
      const queryPromise = supabase
        .from("training_sessions")
        .select(
          `
          *,
          training_scenarios (
            title
          )
        `
        )
        .eq("user_id", user.id)
        .eq("status", "in_progress")
        .neq("status", "completed") // Double-check: exclude completed
        .order("started_at", { ascending: false })
        .limit(5);

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (!error && data) {
        // Additional filter in case database query doesn't work perfectly
        const inProgressOnly = data.filter((s: any) => s.status === "in_progress");
        setRecentSessions(inProgressOnly as any);
      } else {
        console.error("Error fetching recent sessions:", error);
        setRecentSessions([]);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      setRecentSessions([]);
    }
  };

  const fetchSessionStats = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Fetch stats timeout')), 15000)
      );
      
      const authPromise = supabase.auth.getUser();
      const {
        data: { user },
      } = await Promise.race([authPromise, timeoutPromise]) as any;

      if (!user) {
        setSessionStats({
          totalSessions: 0,
          averageScore: 0,
        });
        return;
      }

      // Fetch all completed sessions for stats
      const queryPromise = supabase
        .from("training_sessions")
        .select("average_score")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .not("average_score", "is", null);

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (!error && data && data.length > 0) {
        const totalSessions = data.length;
        const averageScore = data.reduce((sum: number, s: any) => sum + (s.average_score || 0), 0) / totalSessions;
        setSessionStats({
          totalSessions,
          averageScore,
        });
      } else {
        setSessionStats({
          totalSessions: 0,
          averageScore: 0,
        });
      }
    } catch (error) {
      console.error("Error fetching session stats:", error);
      setSessionStats({
        totalSessions: 0,
        averageScore: 0,
      });
    }
  };

  const handleDeleteClick = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation(); // Prevent navigation when clicking delete
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setSessionToDelete(sessionId);
      setDeleteDialogOpen(true);
    } catch (error) {
      console.error('Error checking authentication:', error);
      router.push("/login");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!sessionToDelete) return;

    try {
      // Get current user to verify ownership
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("You must be logged in to delete sessions.");
        return;
      }

      // First verify the session belongs to the user (extra safety check)
      const { data: sessionData, error: fetchError } = await supabase
        .from("training_sessions")
        .select("user_id")
        .eq("id", sessionToDelete)
        .single();

      if (fetchError || !sessionData) {
        alert("Session not found.");
        return;
      }

      if (sessionData.user_id !== user.id) {
        alert("You don't have permission to delete this session.");
        return;
      }

      // Delete the session (CASCADE will automatically delete related training_responses)
      // RLS will also enforce ownership
      const { error, data } = await supabase
        .from("training_sessions")
        .delete()
        .eq("id", sessionToDelete)
        .select();

      if (error) {
        console.error("Error deleting session:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        
        // Check if it's a permissions error
        if (error.message?.includes("permission") || error.code === "42501") {
          alert("You don't have permission to delete this session. Please ensure the DELETE policy is set up in your database.");
        } else {
          alert(`Failed to delete session: ${error.message || "Unknown error"}. Please check console for details.`);
        }
        return;
      }

      // Success - refresh the sessions list and stats
      await fetchRecentSessions();
      await fetchSessionStats();
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    } catch (error: any) {
      console.error("Error deleting session:", error);
      alert(`Failed to delete session: ${error.message || "Unknown error"}. Please try again.`);
    }
  };

  const startTraining = async (scenarioId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      router.push(`/training/${scenarioId}`);
    } catch (error) {
      console.error('Error checking authentication:', error);
      router.push("/login");
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return "bg-green-500";
    if (difficulty === 3) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      frustrated: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
      demanding: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
      rude: "bg-red-500/20 text-red-400 border border-red-500/30",
      discriminatory: "bg-pink-500/20 text-pink-400 border border-pink-500/30",
      challenging: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
      cultural_sensitivity: "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30",
    };
    return colors[type] || "bg-gray-500/20 text-gray-400 border border-gray-500/30";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f10] via-[#1a1a1f] to-[#23232a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading training scenarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f10] via-[#1a1a1f] to-[#23232a]">
      <div className="container mx-auto p-6 max-w-6xl relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-white">Fairness Training Mode</h1>
          <p className="text-gray-400 text-lg">
            Practice responding to challenging customers with fairness and politeness. 
            Get scored on your communication skills!
          </p>
        </div>

        {/* Scoring Guide - Collapsible */}
        <Collapsible open={guideOpen} onOpenChange={setGuideOpen} className="mb-8">
          <Card className="bg-[#1a1a1f]/80 border-purple-500/30 backdrop-blur-sm">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-[#23232a]/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-purple-400" />
                    <div className="text-left">
                      <CardTitle className="text-white text-lg">
                        How to Achieve Perfect Scores (10/10)
                      </CardTitle>
                      <CardDescription className="text-gray-400 text-sm mt-1">
                        {guideOpen 
                          ? "Click to collapse guide" 
                          : "Read this guide first to understand how scoring works and maximize your performance"}
                      </CardDescription>
                    </div>
                  </div>
                  {guideOpen ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
              <CardContent className="pt-0 pb-6">
                <div className="max-h-[600px] overflow-y-auto pr-4">
                  <div className="space-y-4">
                    {/* Introduction */}
                    <div className="p-4 bg-[#23232a] rounded-lg border border-gray-700">
                      <p className="text-sm text-gray-300">
                        To achieve a perfect 10/10 score across all metrics, your responses should demonstrate excellence in six key dimensions. 
                        This guide provides actionable strategies for each metric.
                      </p>
                    </div>

                    {/* Politeness */}
                    <div className="p-4 bg-[#23232a] rounded-lg border border-gray-700">
                      <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                        <span className="text-purple-400">1.</span>
                        Politeness (10/10)
                      </h3>
                      <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Use courteous language: "please", "thank you", "I appreciate"</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Avoid negative words, sarcasm, or dismissive phrases</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Maintain a respectful tone even when addressing complaints</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Use appropriate formal language suitable for professional contexts</span>
                        </li>
                      </ul>
                    </div>

                    {/* Fairness */}
                    <div className="p-4 bg-[#23232a] rounded-lg border border-gray-700">
                      <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                        <span className="text-purple-400">2.</span>
                        Fairness (10/10)
                      </h3>
                      <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Treat all customers equally regardless of background, situation, or complaint type</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Avoid making assumptions or generalizations about groups of people</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Apply policies and solutions consistently to all customers</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Remain unbiased and objective in your responses</span>
                        </li>
                      </ul>
                    </div>

                    {/* Likeability */}
                    <div className="p-4 bg-[#23232a] rounded-lg border border-gray-700">
                      <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                        <span className="text-purple-400">3.</span>
                        Likeability (10/10)
                      </h3>
                      <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Show warmth and friendliness: "I'm glad to help", "Happy to assist"</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Be approachable and create a positive first impression</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Use a conversational but professional tone</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Express genuine interest in helping the customer</span>
                        </li>
                      </ul>
                    </div>

                    {/* Competence */}
                    <div className="p-4 bg-[#23232a] rounded-lg border border-gray-700">
                      <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                        <span className="text-purple-400">4.</span>
                        Competence (10/10)
                      </h3>
                      <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Demonstrate knowledge and confidence: "I can help you with that", "Let me resolve this"</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Provide clear, actionable solutions to problems</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Show problem-solving ability and effectiveness</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Offer specific next steps or follow-up actions when appropriate</span>
                        </li>
                      </ul>
                    </div>

                    {/* Respectfulness */}
                    <div className="p-4 bg-[#23232a] rounded-lg border border-gray-700">
                      <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                        <span className="text-purple-400">5.</span>
                        Respectfulness (10/10)
                      </h3>
                      <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Show dignity and value the customer: "I understand your concern", "Your feedback matters"</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Acknowledge the customer's feelings and perspective</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Honor boundaries and avoid being pushy or dismissive</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Take responsibility when appropriate: "I apologize for the inconvenience"</span>
                        </li>
                      </ul>
                    </div>

                    {/* Trustworthiness */}
                    <div className="p-4 bg-[#23232a] rounded-lg border border-gray-700">
                      <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                        <span className="text-purple-400">6.</span>
                        Trustworthiness (10/10)
                      </h3>
                      <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Be honest and transparent: "I'll look into this", "I can confirm that"</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Make commitments you can keep: "I will follow up by [specific time]"</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Demonstrate reliability and credibility in your responses</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Avoid making promises you cannot deliver on</span>
                        </li>
                      </ul>
                    </div>

                    {/* Best Practices Summary */}
                    <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                      <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-purple-400" />
                        Best Practices for Perfect Scores
                      </h3>
                      <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex items-start gap-2">
                          <span className="text-purple-400 mt-0.5">•</span>
                          <span><strong>Combine multiple metrics:</strong> A response that shows politeness, acknowledges feelings, offers solutions, and maintains warmth will score high across all dimensions.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-400 mt-0.5">•</span>
                          <span><strong>Be specific:</strong> Instead of "I'll help", say "I'll investigate this issue and get back to you by tomorrow."</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-400 mt-0.5">•</span>
                          <span><strong>Show empathy first:</strong> Always acknowledge the customer's situation before jumping to solutions.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-400 mt-0.5">•</span>
                          <span><strong>Avoid defensiveness:</strong> Never blame the customer or make excuses. Take ownership and focus on solutions.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-400 mt-0.5">•</span>
                          <span><strong>Stay professional:</strong> Even in difficult situations, maintain composure and professionalism.</span>
                        </li>
                      </ul>
                    </div>

                    {/* Example Response */}
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-green-400" />
                        Example of a Perfect Response
                      </h3>
                      <div className="p-3 bg-[#1a1a1f] rounded border border-gray-600/50">
                        <p className="text-sm text-gray-200 italic">
                          "Thank you for bringing this to my attention. I sincerely apologize for the inconvenience you've experienced. 
                          I completely understand your frustration, and I want you to know that your concern matters to us. 
                          I'm going to investigate this issue right away and will follow up with you by [specific time] with a resolution. 
                          I appreciate your patience, and I'm committed to ensuring this is resolved to your satisfaction."
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        This response demonstrates: Politeness (thank you, apologize), Fairness (equal treatment), 
                        Likeability (warm, friendly), Competence (taking action), Respectfulness (acknowledging feelings), 
                        and Trustworthiness (specific commitment).
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-[#1a1a1f]/80 border-gray-700 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Total Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{sessionStats.totalSessions}</div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1a1f]/80 border-gray-700 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Average Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {sessionStats.totalSessions > 0
                  ? `${sessionStats.averageScore.toFixed(1)}/10`
                  : "N/A"}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1a1f]/80 border-gray-700 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Available Scenarios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{scenarios.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Training Scenarios */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-white">Choose a Training Scenario</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scenarios.map((scenario) => (
              <Card key={scenario.id} className="bg-[#1a1a1f]/80 border-gray-700 backdrop-blur-sm hover:border-purple-500/50 transition-all flex flex-col h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="mb-2 text-white">{scenario.title}</CardTitle>
                      <CardDescription className="text-gray-400">{scenario.description}</CardDescription>
                    </div>
                    <Badge
                      className={`${getDifficultyColor(scenario.difficulty)} text-white`}
                    >
                      Level {scenario.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col flex-grow">
                  {scenario.persona && (
                    <div className="mb-3">
                      <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        Practice as: {scenario.persona.title}
                      </Badge>
                    </div>
                  )}
                  <div className="mb-4">
                    <Badge className={`${getTypeColor(scenario.scenarioType)} border-0`}>
                      {scenario.scenarioType.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="mb-4 flex-grow">
                    <p className="text-sm text-gray-400 italic">
                      "{scenario.initialMessage.substring(0, 100)}
                      {scenario.initialMessage.length > 100 ? "..." : ""}"
                    </p>
                  </div>
                  <Button
                    onClick={() => startTraining(scenario.id)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white mt-auto"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Start Training
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Sessions (In Progress Only) */}
        {recentSessions.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-white">Recent Sessions (In Progress)</h2>
            <div className="space-y-2">
              {recentSessions.map((session) => (
                <Card 
                  key={session.id} 
                  className="bg-[#1a1a1f]/80 border-gray-700 backdrop-blur-sm hover:border-purple-500/50 transition-all cursor-pointer relative group"
                  onClick={async () => {
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) {
                        router.push("/login");
                        return;
                      }
                      // Navigate to the scenario page to resume
                      router.push(`/training/${session.scenario_id}`);
                    } catch (error) {
                      console.error('Error checking authentication:', error);
                      router.push("/login");
                    }
                  }}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">
                          {(session as any).training_scenarios?.title || "Training Session"}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {new Date(session.started_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="border-gray-600 text-gray-400">In Progress</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                          onClick={(e) => handleDeleteClick(e, session.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-4">
              💡 Completed sessions are available in your <Link href="/dashboard" className="text-purple-400 hover:text-purple-300 underline">Dashboard</Link>
            </p>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Training Session?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this training session? This action cannot be undone. 
                All progress and scores for this session will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

