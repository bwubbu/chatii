"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Trophy, TrendingUp, AlertCircle, CheckCircle, Loader2, Info, Lightbulb, Mic, HelpCircle, Target } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageContext";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Score {
  scores: {
    politeness: number;
    fairness: number;
    likeability: number;
    competence: number;
    respectfulness: number;
    trustworthiness: number;
    overall: number;
  };
  strengths: string[];
  improvements: string[];
  detailedFeedback: string;
  userResponse?: string;
  aiMessage?: string;
}

interface UserResponse {
  aiMessage: string;
  userResponse: string;
  messageNumber: number;
}

interface SessionSummary {
  totalResponses: number;
  averageScores: {
    politeness: number;
    fairness: number;
    likeability: number;
    competence: number;
    respectfulness: number;
    trustworthiness: number;
    overall: number;
  };
  allScores: Score[];
  allStrengths: string[];
  allImprovements: string[];
  overallFeedback: string;
}

interface Scenario {
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

export default function TrainingSessionPage({
  params,
}: {
  params: Promise<{ scenarioId: string }>;
}) {
  const router = useRouter();
  const [scenarioId, setScenarioId] = useState<string>("");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentScore, setCurrentScore] = useState<Score | null>(null);
  const [showScore, setShowScore] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    totalMessages: 0,
    averageScore: 0,
  });
  const { language: currentLanguage, setLanguage } = useLanguage(); // Use global language context
  const [userResponses, setUserResponses] = useState<UserResponse[]>([]);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    nationality?: string;
    age?: number;
    race?: string;
  } | null>(null);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    
    params.then((p) => {
      if (isMounted) {
        setScenarioId(p.scenarioId);
        loadScenario(p.scenarioId);
      }
    });
    
    loadUserProfile();
    
    return () => {
      isMounted = false;
    };
  }, [params]);

  const loadUserProfile = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Load profile timeout')), 10000)
      );
      
      const authPromise = supabase.auth.getUser();
      const {
        data: { user },
      } = await Promise.race([authPromise, timeoutPromise]) as any;

      if (user) {
        const queryPromise = supabase
          .from("user_profiles")
          .select("nationality, age, race")
          .eq("user_id", user.id)
          .single();

        const { data: profile } = await Promise.race([queryPromise, timeoutPromise]) as any;

        if (profile) {
          setUserProfile({
            nationality: profile.nationality || undefined,
            age: profile.age || undefined,
            race: profile.race || undefined,
          });
        }
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
      setUserProfile(null);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadScenario = async (id: string) => {
    try {
      const response = await fetch("/api/training-mode/generate-scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          scenarioId: id,
          language: currentLanguage // Pass current language to get translated initial message
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // If persona data is not included in the API response, fetch it separately
        if (!data.persona && data.persona_id) {
          const { data: personaData } = await supabase
            .from("personas")
            .select("id, title, description")
            .eq("id", data.persona_id)
            .single();
          
          if (personaData) {
            data.persona = {
              id: personaData.id,
              title: personaData.title,
              description: personaData.description,
            };
          }
        }
        
        setScenario(data);

        // Check if there's an existing session first
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const sessionTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session query timeout')), 10000)
          );
          
          const sessionQueryPromise = supabase
            .from("training_sessions")
            .select("*")
            .eq("user_id", user.id)
            .eq("scenario_id", id)
            .eq("status", "in_progress")
            .order("started_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          
          const { data: existingSession } = await Promise.race([sessionQueryPromise, sessionTimeoutPromise]) as any;

          // If resuming, load existing session
          if (existingSession) {
            // Resume existing session
            const isResuming = await createSession(id, data.initialMessage);
            // Messages are already loaded in createSession if resuming
            if (!isResuming) {
              const initialMessage: Message = {
                id: "initial",
                role: "assistant",
                content: data.initialMessage,
                timestamp: new Date(),
              };
              setMessages([initialMessage]);
              // Initial message is already saved in createSession for new sessions
            }
          } else {
            // No existing session, start new one
            const initialMessage: Message = {
              id: "initial",
              role: "assistant",
              content: data.initialMessage,
              timestamp: new Date(),
            };
            setMessages([initialMessage]);
            await createSession(id, data.initialMessage);
          }
        } else {
          // No user, just show initial message
          const initialMessage: Message = {
            id: "initial",
            role: "assistant",
            content: data.initialMessage,
            timestamp: new Date(),
          };
          setMessages([initialMessage]);
        }
      } else {
        console.error("Failed to load scenario");
        setScenario(null);
      }
    } catch (error) {
      console.error("Error loading scenario:", error);
      setScenario(null);
    }
  };

  // Language is now controlled globally, so we don't need handleLanguageSelection

  // Helper function to save conversation history to database
  const saveConversationHistory = async (messages: Message[]) => {
    if (!sessionId) return;
    
    try {
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const { error } = await supabase
        .from("training_sessions")
        .update({
          conversation_history: conversationHistory,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (error) {
        console.error("Error saving conversation history:", error);
      }
    } catch (error) {
      console.error("Error saving conversation history:", error);
    }
  };

  const createSession = async (scenarioId: string, initialMessage?: string): Promise<boolean> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return false;
      }

      // First, check if there's an existing in-progress session for this scenario
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session check timeout')), 10000)
      );
      
      const queryPromise = supabase
        .from("training_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("scenario_id", scenarioId)
        .eq("status", "in_progress")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      const { data: existingSession, error: checkError } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (!checkError && existingSession) {
        // Use existing session
        setSessionId(existingSession.id);
        
        // Try to load from conversation_history first (most reliable)
        let reconstructedMessages: Message[] = [];
        
        if (existingSession.conversation_history && Array.isArray(existingSession.conversation_history) && existingSession.conversation_history.length > 0) {
          // Load from conversation_history (saved during conversation)
          reconstructedMessages = existingSession.conversation_history.map((msg: any, index: number) => ({
            id: msg.id || `${msg.role}-${index}`,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
          }));
        } else {
          // Fallback: Load from training_responses (only available after scoring)
          const responseTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Load responses timeout')), 10000)
          );
          
          const responseQueryPromise = supabase
            .from("training_responses")
            .select("ai_message, user_response, message_number")
            .eq("session_id", existingSession.id)
            .order("message_number", { ascending: true });
          
          const { data: existingResponses } = await Promise.race([responseQueryPromise, responseTimeoutPromise]) as any;

          // Always start with initial message if provided
          if (initialMessage) {
            reconstructedMessages.push({
              id: "initial",
              role: "assistant",
              content: initialMessage,
              timestamp: new Date(),
            });
          }
          
          // Reconstruct messages from existing responses
          if (existingResponses && existingResponses.length > 0) {
            existingResponses.forEach((resp, index) => {
              reconstructedMessages.push({
                id: `user-${index}`,
                role: "user",
                content: resp.user_response,
                timestamp: new Date(),
              });
              reconstructedMessages.push({
                id: `ai-${index}`,
                role: "assistant",
                content: resp.ai_message,
                timestamp: new Date(),
              });
            });

            // Reconstruct userResponses for scoring
            const reconstructedUserResponses: UserResponse[] = existingResponses.map((resp, index) => ({
              aiMessage: resp.ai_message,
              userResponse: resp.user_response,
              messageNumber: index + 1,
            }));
            setUserResponses(reconstructedUserResponses);
          }
        }
        
        // If no messages found, start with initial message
        if (reconstructedMessages.length === 0 && initialMessage) {
          reconstructedMessages.push({
            id: "initial",
            role: "assistant",
            content: initialMessage,
            timestamp: new Date(),
          });
        }
        
        // Reconstruct userResponses from messages if not already set
        if (reconstructedMessages.length > 0 && userResponses.length === 0) {
          const userMsgs = reconstructedMessages.filter(m => m.role === "user");
          const aiMsgs = reconstructedMessages.filter(m => m.role === "assistant");
          const reconstructedUserResponses: UserResponse[] = userMsgs.map((userMsg, index) => {
            // Find the AI message that came before this user message
            const userMsgIndex = reconstructedMessages.findIndex(m => m.id === userMsg.id);
            const previousAiMsg = reconstructedMessages.slice(0, userMsgIndex).reverse().find(m => m.role === "assistant");
            return {
              aiMessage: previousAiMsg?.content || scenario?.initialMessage || "",
              userResponse: userMsg.content,
              messageNumber: index + 1,
            };
          });
          setUserResponses(reconstructedUserResponses);
        }
        
        // Set messages
        setMessages(reconstructedMessages);
        return true; // Indicates we're resuming
      }

      // No existing session, create a new one
      const initialHistory = initialMessage ? [{
        role: "assistant",
        content: initialMessage,
      }] : [];
      
      const { data, error } = await supabase
        .from("training_sessions")
        .insert({
          user_id: user.id,
          scenario_id: scenarioId,
          status: "in_progress",
          conversation_history: initialHistory,
        })
        .select()
        .single();

      if (!error && data) {
        setSessionId(data.id);
        return false; // Indicates new session
      } else {
        console.error("Error creating session:", error);
        return false;
      }
    } catch (error) {
      console.error("Error creating session:", error);
      return false;
    }
  };

  // Speech-to-text handler
  const handleMicClick = () => {
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }

    if (typeof window !== "undefined" && (window as any).webkitSpeechRecognition) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      // Set language based on global language preference
      recognition.lang = currentLanguage === 'malay' ? 'ms-MY' : 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => prev ? prev + " " + transcript : transcript);
      };

      recognition.onerror = () => {
        setRecording(false);
      };

      recognition.onend = () => {
        setRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setRecording(true);
    } else {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !scenario || !sessionId) return;

    const userMessageContent = input.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessageContent,
      timestamp: new Date(),
    };

    // Add user message to state immediately
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    setShowScore(false);
    
    // Save conversation history with user message
    await saveConversationHistory(updatedMessages);

    // Store user response for end-of-session scoring (don't score immediately)
    const lastAiMessage = messages.filter(m => m.role === "assistant").pop()?.content || scenario.initialMessage;
    const newUserResponse: UserResponse = {
      aiMessage: lastAiMessage,
      userResponse: userMessageContent,
      messageNumber: updatedMessages.filter(m => m.role === "user").length,
    };
    setUserResponses((prev) => [...prev, newUserResponse]);

    try {
      // Build RAG query based on user demographics and conversation context
      const recentMessages = updatedMessages.slice(-3).map(msg => msg.content).join(" ") + " " + userMessageContent;
      const ragQuery = userProfile?.nationality && userProfile?.race 
        ? `${recentMessages} cultural context for ${userProfile.nationality} ${userProfile.race} user`
        : recentMessages;

      // Map nationality/race to target culture for book sections
      const mapToTargetCulture = (nationality?: string, race?: string): string | null => {
        if (!nationality) return null;
        if (nationality === "Sweden") return "Swedish";
        if (nationality === "Malaysia") {
          if (race === "Malay") return "Malay";
          if (race === "Malaysian Chinese") return "Malaysian Chinese";
          if (race === "Malaysian Indian") return "Malaysian Indian";
        }
        return null;
      };

      const targetCulture = mapToTargetCulture(userProfile?.nationality, userProfile?.race);

      // Retrieve RAG data (guidelines, book sections, negative examples) via combined endpoint
      let ragGuidelines: any[] = [];
      let ragBookSections: any[] = [];
      let ragNegativeExamples: any[] = [];
      
      try {
        const ragResponse = await fetch('/api/rag/retrieve-combined', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: ragQuery,
            guidelinesLimit: 3,
            bookSectionsLimit: 2,
            negativeExamplesLimit: 2,
            targetCulture: targetCulture,
            personaId: null, // Training mode doesn't have a specific persona
            matchThreshold: 0.3
          })
        });

        if (ragResponse.ok) {
          const ragData = await ragResponse.json();
          ragGuidelines = ragData.guidelines || [];
          ragBookSections = ragData.bookSections || [];
          ragNegativeExamples = ragData.negativeExamples || [];
          console.log(`✅ RAG retrieved for training: ${ragGuidelines.length} guidelines, ${ragBookSections.length} book sections, ${ragNegativeExamples.length} negative examples`);
        } else {
          console.warn('⚠️ Combined RAG retrieval failed in training mode, falling back to guidelines only');
          // Fallback to guidelines only
          try {
            const fallbackResponse = await fetch('/api/rag/retrieve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: ragQuery,
                limit: 3,
                matchThreshold: 0.3
              })
            });
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              ragGuidelines = fallbackData.guidelines || [];
            }
          } catch (fallbackError) {
            console.warn('⚠️ Fallback RAG retrieval also failed in training mode');
          }
        }
      } catch (ragError) {
        console.warn('⚠️ RAG retrieval error in training mode, continuing without RAG context:', ragError);
      }

      // Get AI's next response - use updatedMessages which includes the user's message
      const conversationHistory = updatedMessages.map((msg) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      }));

      if (!currentLanguage) {
        alert("Please select a language first");
        return;
      }

      const aiResponse = await fetch("/api/training-mode/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessageContent,
          conversationHistory,
          systemPrompt: scenario.systemPrompt,
          language: currentLanguage,
          userContext: userProfile || undefined,
          ragGuidelines: ragGuidelines,
          ragBookSections: ragBookSections,
          ragNegativeExamples: ragNegativeExamples,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        if (aiData.error) {
          console.error("AI API returned error:", aiData);
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `I apologize, but I'm having trouble responding right now. ${aiData.error === "GEMINI_API_KEY not configured" ? "The API key is not configured." : "Please try again."}`,
            timestamp: new Date(),
          };
          const finalMessages = [...updatedMessages, errorMessage];
          setMessages(finalMessages);
          await saveConversationHistory(finalMessages);
        } else if (aiData.response) {
          // Remove quotes from the beginning and end of the response
          let cleanedResponse = aiData.response.trim();
          // Remove leading and trailing quotes (single or double)
          if ((cleanedResponse.startsWith('"') && cleanedResponse.endsWith('"')) ||
              (cleanedResponse.startsWith("'") && cleanedResponse.endsWith("'"))) {
            cleanedResponse = cleanedResponse.slice(1, -1).trim();
          }
          
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: cleanedResponse,
            timestamp: new Date(),
          };
          const finalMessages = [...updatedMessages, assistantMessage];
          setMessages(finalMessages);
          
          // Save conversation history to database
          await saveConversationHistory(finalMessages);
        } else {
          console.error("AI response missing 'response' field:", aiData);
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "I apologize, but I received an unexpected response format. Please try again.",
            timestamp: new Date(),
          };
          const finalMessages = [...updatedMessages, errorMessage];
          setMessages(finalMessages);
          await saveConversationHistory(finalMessages);
        }
      } else {
        // Handle error response
        const errorData = await aiResponse.json().catch(() => ({ error: "Unknown error" }));
        console.error("AI response error:", {
          status: aiResponse.status,
          statusText: aiResponse.statusText,
          error: errorData
        });
        
        // Extract detailed error message
        let errorMessage = "I apologize, but I'm having trouble responding right now.";
        
        // Extract error message from various possible locations (recursively handles nested objects)
        const extractErrorMessage = (obj: any, depth = 0): string | null => {
          if (depth > 3) return null; // Prevent infinite recursion
          if (!obj) return null;
          if (typeof obj === 'string') return obj;
          if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
          if (obj.message && typeof obj.message === 'string') return obj.message;
          if (obj.error) {
            if (typeof obj.error === 'string') return obj.error;
            return extractErrorMessage(obj.error, depth + 1);
          }
          if (obj.details) {
            if (typeof obj.details === 'string') return obj.details;
            if (obj.details.message && typeof obj.details.message === 'string') return obj.details.message;
            if (obj.details.error) {
              if (typeof obj.details.error === 'string') return obj.details.error;
              return extractErrorMessage(obj.details.error, depth + 1);
            }
          }
          return null;
        };
        
        const mainError = extractErrorMessage(errorData);
        if (mainError) {
          errorMessage += ` ${mainError}`;
        }
        
        // Add finish reason if present
        if (errorData.details?.finishReason && typeof errorData.details.finishReason === 'string') {
          errorMessage += ` (Reason: ${errorData.details.finishReason})`;
        }
        
        // Add status code if available
        if (errorData.status && typeof errorData.status === 'number') {
          if (errorData.status === 401) {
            errorMessage += " The API key may be invalid or expired.";
          } else if (errorData.status === 429) {
            errorMessage += " The service is currently rate-limited. Please try again in a moment.";
          } else if (errorData.status >= 500) {
            errorMessage += " The AI service is experiencing issues.";
          }
        }
        
        // If we still don't have a specific error, add a generic message
        if (!mainError && !errorData.details?.finishReason) {
          errorMessage += " Please try again later.";
        } else {
          errorMessage += " Please try again.";
        }
        
        // Show error message to user
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: errorMessage,
          timestamp: new Date(),
        };
        const finalMessages = [...updatedMessages, errorMsg];
        setMessages(finalMessages);
        await saveConversationHistory(finalMessages);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Show error message to user
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I apologize, but there was an error processing your message. Please try again.",
        timestamp: new Date(),
      };
      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      await saveConversationHistory(finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const endSession = async () => {
    if (!sessionId || userResponses.length === 0) {
      // If no responses, just end the session
      try {
        const { error: updateError } = await supabase
          .from("training_sessions")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", sessionId);
        
        if (updateError) {
          console.error("Error updating session status:", updateError);
        }
        
        router.push("/training");
        router.refresh();
      } catch (error) {
        console.error("Error ending session:", error);
      }
      return;
    }

    setIsGeneratingSummary(true);

    try {
      // Score all user responses
      const allScores: Score[] = [];
      
      for (const userResponse of userResponses) {
        try {
          const scoreResponse = await fetch("/api/training-mode/score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              aiMessage: userResponse.aiMessage,
              userResponse: userResponse.userResponse,
              scenarioType: scenario?.scenarioType || "general",
              language: currentLanguage || 'english',
            }),
          });

          if (scoreResponse.ok) {
            const scoreData = await scoreResponse.json();
            
            // Validate score data
            if (scoreData.scores && 
                typeof scoreData.scores.overall === 'number' && 
                !isNaN(scoreData.scores.overall)) {
              allScores.push({
                ...scoreData,
                userResponse: userResponse.userResponse,
                aiMessage: userResponse.aiMessage,
              });

              // Save response to database
              // Include both old and new columns for backward compatibility
              const insertData: any = {
                session_id: sessionId,
                ai_message: userResponse.aiMessage,
                user_response: userResponse.userResponse,
                message_number: userResponse.messageNumber,
                politeness_score: scoreData.scores.politeness,
                fairness_score: scoreData.scores.fairness,
                overall_score: scoreData.scores.overall,
                strengths: scoreData.strengths,
                improvements: scoreData.improvements,
                detailed_feedback: scoreData.detailedFeedback,
              };

              // Add new metrics (will be NULL if columns don't exist yet)
              insertData.likeability_score = scoreData.scores.likeability;
              insertData.competence_score = scoreData.scores.competence;
              insertData.respectfulness_score = scoreData.scores.respectfulness;
              insertData.trustworthiness_score = scoreData.scores.trustworthiness;

              // Add old metrics for backward compatibility (required by schema)
              insertData.professionalism_score = scoreData.scores.competence; // Map competence to professionalism
              insertData.empathy_score = scoreData.scores.likeability; // Map likeability to empathy

              const { error: insertError } = await supabase
                .from("training_responses")
                .insert(insertData);

              if (insertError) {
                console.error("Error saving response to database:", insertError);
                console.error("Insert data:", insertData);
                // Don't throw - continue with summary generation even if save fails
              }
            } else {
              console.error("Invalid score data received:", scoreData);
            }
          } else {
            const errorData = await scoreResponse.json().catch(() => ({}));
            console.error("Scoring failed for response:", errorData);
          }
        } catch (error) {
          console.error("Error scoring response:", error);
        }
      }

      // Only generate summary if we have valid scores
      if (allScores.length === 0) {
        alert("Unable to generate scores. Please try again.");
        setIsGeneratingSummary(false);
        return;
      }

      // Calculate averages
      const totalResponses = allScores.length;
      const averageScores = {
        politeness: allScores.reduce((sum, s) => sum + s.scores.politeness, 0) / totalResponses,
        fairness: allScores.reduce((sum, s) => sum + s.scores.fairness, 0) / totalResponses,
        likeability: allScores.reduce((sum, s) => sum + s.scores.likeability, 0) / totalResponses,
        competence: allScores.reduce((sum, s) => sum + s.scores.competence, 0) / totalResponses,
        respectfulness: allScores.reduce((sum, s) => sum + s.scores.respectfulness, 0) / totalResponses,
        trustworthiness: allScores.reduce((sum, s) => sum + s.scores.trustworthiness, 0) / totalResponses,
        overall: allScores.reduce((sum, s) => sum + s.scores.overall, 0) / totalResponses,
      };

      // Aggregate all strengths and improvements
      const allStrengths = Array.from(
        new Set(allScores.flatMap((s) => s.strengths))
      );
      const allImprovements = Array.from(
        new Set(allScores.flatMap((s) => s.improvements))
      );

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
      }`;

      const summary: SessionSummary = {
        totalResponses,
        averageScores,
        allScores,
        allStrengths,
        allImprovements,
        overallFeedback,
      };

      setSessionSummary(summary);

      // Update session status - MUST complete before showing summary
      // Also update average_score explicitly to ensure it's saved
      const { error: updateError, data: updateData } = await supabase
        .from("training_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          average_score: averageScores.overall,
          overall_politeness: averageScores.politeness,
          overall_fairness: averageScores.fairness,
        })
        .eq("id", sessionId)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating session status:", updateError);
        alert("Failed to update session status. Please refresh the page.");
      } else {
        console.log("Session status updated to completed:", updateData);
      }
    } catch (error) {
      console.error("Error generating summary:", error);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-400";
    if (score >= 6) return "text-yellow-400";
    return "text-red-400";
  };

  if (!scenario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f10] via-[#1a1a1f] to-[#23232a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading scenario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f10] via-[#1a1a1f] to-[#23232a]">
      <div className="container mx-auto p-6 max-w-5xl relative z-10">
        {/* Header */}
        <div className="mb-6">
          <div>
            {scenario.persona && (
              <div className="mb-3">
                <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/30 text-sm px-3 py-1">
                  Training as: {scenario.persona.title}
                </Badge>
              </div>
            )}
            <h1 className="text-3xl font-bold mb-2 text-white">{scenario.title}</h1>
            <p className="text-gray-400">{scenario.description}</p>
          </div>
        </div>

        <div>
          {/* Chat Area */}
          <Card className="h-[600px] flex flex-col bg-[#1a1a1f]/80 border-gray-700 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-white">Training Conversation</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white hover:bg-gray-700/50"
                  onClick={() => setShowGuide(true)}
                  title="How to achieve perfect scores"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Scoring Guide
                </Button>
                {scenario.expectedBehaviors && scenario.expectedBehaviors.length > 0 && (
                  <div className="relative group">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white hover:bg-gray-700/50"
                      title="View tips"
                    >
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Tips
                    </Button>
                    <div className="absolute right-0 top-full mt-2 w-64 bg-[#23232a] border border-gray-700 rounded-lg shadow-xl p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="h-4 w-4 text-purple-400" />
                        <h4 className="text-sm font-semibold text-white">Tips for Success</h4>
                      </div>
                      <ul className="text-xs space-y-2">
                        {scenario.expectedBehaviors.map((behavior, i) => (
                          <li key={i} className="text-gray-300 flex items-start gap-2">
                            <span className="text-purple-400 mt-0.5">•</span>
                            <span>{behavior}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
              <CardContent className="flex-1 flex flex-col overflow-hidden">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-700 text-gray-100"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-700 rounded-lg p-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex gap-2"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    className={`rounded-full p-2 relative transition-shadow ${
                      recording ? "ring-2 ring-red-500 shadow-red-500/40 animate-pulse" : ""
                    }`}
                    aria-label={recording ? "Stop recording" : "Speak"}
                    onClick={handleMicClick}
                    disabled={isLoading}
                  >
                    <Mic className={`w-5 h-5 ${recording ? "text-red-500" : "text-gray-400"}`} />
                    {recording && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-[#1a1a1f]" />
                    )}
                  </Button>
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your response..."
                    disabled={isLoading}
                    className="flex-1 bg-[#23232a] border-gray-700 text-white placeholder:text-gray-500"
                  />
                  <Button type="submit" disabled={isLoading || !input.trim()} className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Button 
              onClick={endSession} 
              variant="outline" 
              className="mt-4 w-full border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
              disabled={isGeneratingSummary || userResponses.length === 0}
            >
              {isGeneratingSummary ? "Generating Summary..." : "End Training Session"}
            </Button>
        </div>

        {/* Scoring Guide Dialog */}
        <Dialog open={showGuide} onOpenChange={setShowGuide}>
          <DialogContent className="max-w-3xl max-h-[90vh] bg-[#1a1a1f] border-gray-700 text-white overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white text-2xl">
                <Target className="h-6 w-6 text-purple-400" />
                How to Achieve Perfect Scores (10/10)
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                A comprehensive guide to excel in all evaluation metrics
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6">
                {/* Introduction */}
                <div className="p-4 bg-[#23232a] rounded-lg border border-gray-700">
                  <p className="text-sm text-gray-300">
                    To achieve a perfect 10/10 score across all metrics, your responses should demonstrate excellence in six key dimensions. 
                    This guide provides actionable strategies for each metric.
                  </p>
                </div>

                {/* Politeness */}
                <div className="p-4 bg-[#23232a] rounded-lg border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
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
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
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
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
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
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
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
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
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
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
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
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
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
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
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
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Session Summary Dialog */}
        <Dialog 
          open={isGeneratingSummary || !!sessionSummary} 
          onOpenChange={(open) => {
            // Prevent closing while generating
            if (!open && !isGeneratingSummary && sessionSummary) {
              // Only allow closing if summary is complete - navigate back to training
              router.push("/training");
              router.refresh();
            }
          }}
        >
          <DialogContent 
            className="max-w-4xl max-h-[90vh] bg-[#1a1a1f] border-gray-700 text-white overflow-hidden"
            onInteractOutside={(e) => {
              // Prevent closing by clicking outside while generating
              if (isGeneratingSummary) {
                e.preventDefault();
              }
            }}
            onEscapeKeyDown={(e) => {
              // Prevent closing with ESC while generating
              if (isGeneratingSummary) {
                e.preventDefault();
              }
            }}
          >
            {isGeneratingSummary ? (
              // Loading State
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 text-purple-500 animate-spin mb-4" />
                <DialogTitle className="text-2xl font-bold text-white mb-2">
                  Generating Summary...
                </DialogTitle>
                <DialogDescription className="text-gray-400 text-center">
                  Please wait while we evaluate your responses and generate your training session results.
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

                  </div>
                </ScrollArea>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

