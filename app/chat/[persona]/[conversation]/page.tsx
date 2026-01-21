"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabaseClient";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus, Menu } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import FeedbackQuestionnaire from "@/components/feedback/FeedbackQuestionnaire";
import { useLanguage } from "@/components/LanguageContext";


interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  created_at: string;
}

interface Persona {
  id: string;
  title: string;
  system_prompt: string;
  avatar_url?: string;
  description?: string;
}

export default function ConversationPage({ params }: { params: Promise<{ persona: string; conversation: string }> }) {
  const { persona, conversation } = use(params);
  const [messages, setMessages] = useState<Message[]>([]);
  const [personaData, setPersonaData] = useState<Persona | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [demographics, setDemographics] = useState<{ nationality?: string; age?: number; race?: string; gender?: string; username?: string; firstName?: string }>({});
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flagLoading, setFlagLoading] = useState(false);
  const [questionnaireOpen, setQuestionnaireOpen] = useState(false);
  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isNavigatingAway, setIsNavigatingAway] = useState(false);
  const { language } = useLanguage();
  
  // Add ref for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingNavigationRef = useRef<string | null>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    // Reset navigation state when conversation changes
    setIsNavigatingAway(false);
    setQuestionnaireOpen(false);
    setIsSubmittingFeedback(false);
    pendingNavigationRef.current = null;
    
    let isMounted = true;
    
    const loadData = async () => {
      await fetchPersona();
      if (isMounted) {
        await fetchMessages();
      }
      if (isMounted) {
        await fetchDemographics();
      }
      if (isMounted) {
        await checkExistingFeedback();
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [persona, conversation]);

  const checkExistingFeedback = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Check feedback timeout')), 10000)
      );
      
      const queryPromise = supabase
        .from("feedback_questionnaire")
        .select("id")
        .eq("conversation_id", conversation)
        .maybeSingle();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" which is fine
        console.error("Error checking existing feedback:", error);
        return;
      }

      // If feedback exists, mark as submitted
      if (data) {
        setHasSubmittedFeedback(true);
      }
    } catch (error) {
      console.error("Error checking existing feedback:", error);
    }
  };

  // Handle page unload (browser close, tab close, refresh)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only show browser warning if there are messages and feedback hasn't been submitted
      if (messages.length > 0 && !hasSubmittedFeedback && !questionnaireOpen) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
        return ''; // Required for some browsers
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [messages, hasSubmittedFeedback, questionnaireOpen]);

  // Intercept link clicks and navigation attempts
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && link.href) {
        // Check if it's an internal navigation (not external link)
        const url = new URL(link.href, window.location.origin);
        if (url.origin === window.location.origin) {
          // Don't intercept if navigating to another conversation (still on chat page)
          const isChatNavigation = url.pathname.startsWith('/chat/');
          
          // Only intercept if leaving the chat page, there are messages, and feedback hasn't been submitted
          if (!isChatNavigation && messages.length > 0 && !hasSubmittedFeedback && !questionnaireOpen && !isNavigatingAway) {
            e.preventDefault();
            e.stopPropagation();
            // Store the intended destination
            pendingNavigationRef.current = url.pathname + url.search + url.hash;
            // Show survey instead of navigating
            setQuestionnaireOpen(true);
            return false;
          }
        }
      }
    };

    // Intercept clicks on the document
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [messages, hasSubmittedFeedback, questionnaireOpen, isNavigatingAway]);

  // Custom navigation function that checks for survey
  const navigateWithSurveyCheck = (url: string) => {
    // Don't intercept if navigating to another conversation (still on chat page)
    const isChatNavigation = url.startsWith('/chat/');
    
    if (!isChatNavigation && messages.length > 0 && !hasSubmittedFeedback && !questionnaireOpen && !isNavigatingAway) {
      pendingNavigationRef.current = url;
      setQuestionnaireOpen(true);
    } else {
      // Only set isNavigatingAway after navigation is initiated to prevent race conditions
      router.push(url);
      // Set state after router.push to allow click handlers to intercept if needed
      // Use setTimeout to ensure state update happens after current execution context
      setTimeout(() => setIsNavigatingAway(true), 0);
    }
  };



  const fetchPersona = async () => {
    const { data, error } = await supabase
      .from("personas")
      .select("*")
      .eq("id", persona)
      .single();

    if (error) {
      console.error("Error fetching persona:", error);
      return;
    }

    setPersonaData(data);
  };

  const fetchMessages = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Fetch messages timeout')), 10000)
      );
      
      const queryPromise = supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversation)
        .order("created_at", { ascending: true });

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (error) {
        console.error("Error fetching messages:", error);
        setMessages([]);
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      setMessages([]);
    }
  };

  const fetchDemographics = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Fetch demographics timeout')), 10000)
      );
      
      // Get current user
      const authPromise = supabase.auth.getUser();
      const { data: { user }, error: userError } = await Promise.race([authPromise, timeoutPromise]) as any;
      
      if (userError || !user) {
        console.error("Error getting user:", userError);
        setDemographics({});
        return;
      }

      // Get username from auth metadata
      const username = user.user_metadata?.username || user.email?.split('@')[0] || undefined;
      // Extract first name (first word of username, or full username if single word)
      const firstName = username ? username.split(' ')[0] : undefined;

      // Fetch user demographics from user_profiles (from registration)
      const queryPromise = supabase
        .from("user_profiles")
        .select("nationality, age, race, gender")
        .eq("user_id", user.id)
        .single();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (error) {
        console.error("Error fetching user demographics:", error);
        // Still set username/firstName even if profile fetch fails
        setDemographics({
          username,
          firstName,
        });
        return;
      }

      // Set demographics from user profile and auth metadata
      setDemographics({
        nationality: data?.nationality || undefined,
        age: data?.age || undefined,
        race: data?.race || undefined,
        gender: data?.gender || undefined,
        username,
        firstName,
      });
    } catch (error) {
      console.error("Error in fetchDemographics:", error);
      setDemographics({});
    }
  };

  const startNewConversation = async () => {
    const { data: conversationData, error } = await supabase
      .from("conversations")
      .insert({
        persona_id: persona,
        title: "New Conversation",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating conversation:", error);
      return;
    }

    navigateWithSurveyCheck(`/chat/${persona}/${conversationData.id}`);
  };

  const sendMessage = async (content: string) => {
    if (!personaData) return;

    setIsLoading(true);

    // Add user message to UI
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: "user",
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Save user message to database
    await supabase.from("messages").insert({
      conversation_id: conversation,
      content,
      sender: "user",
    });

    // Update conversation's last_message_at and updated_at
    const now = new Date().toISOString();
    await supabase
      .from("conversations")
      .update({ 
        last_message_at: now,
        updated_at: now 
      })
      .eq("id", conversation);

    try {
      // Build RAG query based on user demographics and conversation context
      const recentMessages = messages.slice(-3).map(msg => msg.content).join(" ") + " " + content;
      const ragQuery = demographics.nationality && demographics.race 
        ? `${recentMessages} cultural context for ${demographics.nationality} ${demographics.race} user`
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

      const targetCulture = mapToTargetCulture(demographics.nationality, demographics.race);

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
            personaId: persona,
            matchThreshold: 0.6
          })
        });

        if (ragResponse.ok) {
          let ragData: any;
          try {
            const responseText = await ragResponse.text();
            if (!responseText || responseText.trim().length === 0) {
              throw new Error("Empty response from RAG endpoint");
            }
            ragData = JSON.parse(responseText);
          } catch (parseError) {
            console.warn('⚠️ Failed to parse RAG response:', parseError);
            ragData = { guidelines: [], bookSections: [], negativeExamples: [] };
          }
          ragGuidelines = ragData.guidelines || [];
          ragBookSections = ragData.bookSections || [];
          ragNegativeExamples = ragData.negativeExamples || [];
          console.log(`✅ RAG retrieved: ${ragGuidelines.length} guidelines, ${ragBookSections.length} book sections, ${ragNegativeExamples.length} negative examples`);
        } else {
          console.warn('⚠️ Combined RAG retrieval failed, falling back to guidelines only');
          // Fallback to guidelines only
          try {
            const fallbackResponse = await fetch('/api/rag/retrieve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: ragQuery,
                limit: 3,
                matchThreshold: 0.6
              })
            });
            if (fallbackResponse.ok) {
              let fallbackData: any;
              try {
                const responseText = await fallbackResponse.text();
                if (responseText && responseText.trim().length > 0) {
                  fallbackData = JSON.parse(responseText);
                  ragGuidelines = fallbackData.guidelines || [];
                }
              } catch (parseError) {
                console.warn('⚠️ Failed to parse fallback RAG response:', parseError);
              }
            }
          } catch (fallbackError) {
            console.warn('⚠️ Fallback RAG retrieval also failed');
          }
        }
      } catch (ragError) {
        console.warn('⚠️ RAG retrieval error, continuing without RAG context:', ragError);
      }

      // Format RAG context for system prompt
      let ragContext = '';
      
      if (ragGuidelines.length > 0) {
        ragContext += `\n\nCULTURAL GUIDELINES (Apply these based on context):\n${ragGuidelines.map((g: any) => `- ${g.content}`).join('\n')}\n`;
      }
      
      if (ragBookSections.length > 0) {
        ragContext += `\n\nCULTURAL CONTEXT FROM ACADEMIC SOURCES (Use to inform your communication style):\n${ragBookSections.map((bs: any) => {
          let citation = `From "${bs.book_title}" by ${bs.book_author}`;
          if (bs.chapter) citation += ` (${bs.chapter})`;
          return `${citation}:\n${bs.content}`;
        }).join('\n\n')}\n\nNote: Use this cultural knowledge to adapt your communication appropriately, but do not explicitly mention these sources or cultural details unless directly relevant to the conversation.\n`;
      }
      
      if (ragNegativeExamples.length > 0) {
        ragContext += `\n\nNEGATIVE EXAMPLES - WHAT NOT TO DO (Avoid these behaviors):\n${ragNegativeExamples.map((ne: any) => {
          return `- [${ne.severity.toUpperCase()}] ${ne.content} (Reason: ${ne.reason})`;
        }).join('\n')}\n\nIMPORTANT: These are examples of inappropriate responses. Do NOT replicate these behaviors.\n`;
      }
      
      if (ragContext) {
        ragContext += `\nIMPORTANT: When interacting with users:\n- Use formal Malaysian honorifics (Encik/Puan/Tuan) when appropriate, especially at conversation start\n- Use indirect, face-saving language for refusals (avoid blunt "tidak boleh" or "I cannot")\n- End conversations with warm, polite closings beyond simple "thank you"\n- Never make assumptions based on ethnicity, religion, or cultural background\n- Be transparent about being an AI if asked, but frame it politely\n- Adapt formality based on user's language style while maintaining respectful boundaries\n`;
      }

      // Language instruction based on selected language
      const languageInstruction = language === 'malay' 
        ? `\nLANGUAGE REQUIREMENT:\n- You MUST respond in Bahasa Malaysia (Malay) for ALL your responses\n- Use proper Malay grammar and vocabulary\n- Use appropriate Malay honorifics (Encik, Puan, Tuan, Cik)\n- Maintain the persona's character while speaking in Malay\n- If the user switches to English, you can respond in English, but if they use Malay, always respond in Malay\n`
        : `\nLANGUAGE REQUIREMENT:\n- You MUST respond in English for ALL your responses\n- Use proper English grammar and vocabulary\n- Maintain the persona's character while speaking in English\n- If the user switches to Malay, you can respond in Malay, but if they use English, always respond in English\n`;

      // Create strong persona-enforcing system prompt
      const systemPrompt = `
${personaData.system_prompt}

CRITICAL ROLE ENFORCEMENT:
You MUST fully embody this persona at all times. Never break character or mention that you are an AI assistant. You ARE this persona - think, speak, and act exactly as this character would. If asked about your identity, respond as the persona, not as an AI.

PERSONALITY AND BEHAVIOR:
- Stay completely in character throughout the entire conversation
- Respond with the knowledge, expertise, and personality of this specific persona
- Use the speaking style, vocabulary, and approach that this persona would naturally use
- Never say "I'm an AI" or "I'm here to help" in generic terms - speak as the actual persona

RESPONSE GUIDELINES:
- Keep responses conversational and human-like (2-4 sentences ideally)
- Use **bold text** for emphasis on important points
- Add appropriate emojis to show personality and emotion 😊 💪 ✨
- Use markdown formatting for better readability
- Respond as if you are genuinely this persona having a real conversation
${languageInstruction}
FAIRNESS & RESPECT:
- Always respond in a fair, polite, and respectful manner
- Adapt your tone to suit the user appropriately
- Do not mention or repeat demographic information
- Treat all users with equal respect regardless of their background

User Context (use to guide your tone, cultural adaptation, and communication style, but don't mention these details explicitly):
- Username: ${demographics.username || 'unknown'}
${demographics.firstName ? `- First Name: ${demographics.firstName}` : ''}
- Nationality: ${demographics.nationality || 'unknown'}
- Age: ${demographics.age || 'unknown'}
- Race: ${demographics.race || 'unknown'}
- Gender: ${demographics.gender || 'unknown'}

IMPORTANT: Use this demographic information to:
${demographics.firstName ? `- **ALWAYS use the user's first name "${demographics.firstName}" when addressing them directly**, especially when they ask you to use their name or when it's natural to do so in conversation` : '- When the user asks you to use their name, address them by their first name if you know it'}
- Adapt your communication style to be culturally appropriate
- Choose appropriate honorifics and formality levels based on the user's preferences and cultural background
- Understand cultural context for politeness and respect
- Adapt your tone based on the user's background
- Be respectful and culturally aware in your responses
${demographics.firstName ? `- If the user asks you to call them by their first name or to drop formal titles, use "${demographics.firstName}" instead of honorifics` : '- If the user asks you to call them by their first name, use their actual first name (not a placeholder like "[User\'s First Name]")'}
${ragContext}
Remember: You ARE this persona. Act accordingly.
`;

      // Always try fairness model first, automatically fallback to Gemini if it fails
      let responseText = "";
      let modelUsed = "";
      
      try {
        const fairnessResponse = await fetch('/api/trained-model', {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: content,
            conversation_history: messages.map(msg => ({
              role: msg.sender === "user" ? "user" : "assistant",
              content: msg.content,
            })),
            system_prompt: systemPrompt,
            max_tokens: 1024,
            temperature: 0.7
          }),
        });

        if (fairnessResponse.ok) {
          let fairnessData: any;
          try {
            const responseText = await fairnessResponse.text();
            if (!responseText || responseText.trim().length === 0) {
              throw new Error("Empty response from fairness model");
            }
            fairnessData = JSON.parse(responseText);
          } catch (parseError) {
            console.error("Failed to parse fairness response:", parseError);
            throw new Error("Invalid response from fairness model");
          }
          responseText = fairnessData.response || fairnessData.content || "I apologize, but I couldn't generate a response.";
          modelUsed = fairnessData.model || "fairness (Ollama)";
          console.log(`✅ Response generated by: ${modelUsed}`);
        } else {
          throw new Error(`Fairness model returned ${fairnessResponse.status}`);
        }
      } catch (error) {
        console.warn(`⚠️ Fairness model failed, falling back to Gemini:`, error);
        
        // Automatic fallback to Gemini
        const geminiResponse = await fetch('/api/gemini-chat', {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(msg => ({
              role: msg.sender === "user" ? "user" : "assistant",
              content: msg.content,
            })),
            systemPrompt,
          }),
        });

        if (!geminiResponse.ok) {
          throw new Error(`Both fairness and Gemini models failed`);
        }

        let geminiData: any;
        try {
          const responseText = await geminiResponse.text();
          if (!responseText || responseText.trim().length === 0) {
            throw new Error("Empty response from Gemini");
          }
          geminiData = JSON.parse(responseText);
        } catch (parseError) {
          console.error("Failed to parse Gemini response:", parseError);
          throw new Error("Invalid response from Gemini model");
        }
        responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || geminiData.content || "I apologize, but I couldn't generate a response.";
        modelUsed = "Gemini (fallback)";
        console.log(`✅ Response generated by: ${modelUsed}`);
      }

      const assistantMessage: Message = {
        id: Date.now().toString(),
        content: responseText,
        sender: "assistant",
        created_at: new Date().toISOString(),
      };

      // Add assistant message to UI
      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message to database
      await supabase.from("messages").insert({
        conversation_id: conversation,
        content: responseText,
        sender: "assistant",
      });

      // Update conversation's last_message_at and updated_at
      const now = new Date().toISOString();
      await supabase
        .from("conversations")
        .update({ 
          last_message_at: now,
          updated_at: now 
        })
        .eq("id", conversation);

      // Generate conversation title after a few messages (like ChatGPT)
      // Generate title after 2-3 exchanges (4-6 messages total)
      const totalMessagesAfterThis = messages.length + 2; // +2 for the user message and assistant response we just added
      const shouldGenerateTitle = totalMessagesAfterThis >= 4 && totalMessagesAfterThis <= 6;
      
      // Check if title is still "New Conversation" to avoid regenerating
      const { data: currentConversation } = await supabase
        .from("conversations")
        .select("title")
        .eq("id", conversation)
        .single();
      
      const needsTitle = !currentConversation?.title || 
                        currentConversation.title === "New Conversation";
      
      if (shouldGenerateTitle && needsTitle) {
        // Generate title asynchronously (don't block the UI)
        (async () => {
          try {
            // Generate title based on conversation so far (including the messages we just added)
            const conversationForTitle = [...messages, userMessage, assistantMessage].map(msg => ({
              role: msg.sender === "user" ? "user" : "assistant",
              content: msg.content,
            }));
            
            const titleResponse = await fetch('/api/generate-conversation-title', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: conversationForTitle }),
            });
            
            if (titleResponse.ok) {
              const titleData = await titleResponse.json();
              const generatedTitle = titleData.title || "New Conversation";
              
              // Double-check the title hasn't been updated by another request
              const { data: checkConversation } = await supabase
                .from("conversations")
                .select("title")
                .eq("id", conversation)
                .single();
              
              if (!checkConversation?.title || checkConversation.title === "New Conversation") {
                await supabase
                  .from("conversations")
                  .update({ title: generatedTitle })
                  .eq("id", conversation);
              }
            }
          } catch (titleError) {
            console.error("Error generating conversation title:", titleError);
            // Silently fail - title generation is not critical
          }
        })();
      } else if (messages.length === 0) {
        // Fallback: use first message as temporary title until AI-generated title is ready
        const title = content.length > 30 ? content.slice(0, 30) + "..." : content;
        await supabase
          .from("conversations")
          .update({ title })
          .eq("id", conversation);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlag = async () => {
    setFlagLoading(true);
    // For simplicity, flag the last assistant message
    const lastAssistantMsg = [...messages].reverse().find(m => m.sender === "assistant");
    if (!lastAssistantMsg) {
      setFlagLoading(false);
      return;
    }

    try {
      // Get the current user's session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("You must be logged in to flag messages");
        setFlagLoading(false);
        setFlagModalOpen(false);
        setFlagReason("");
        return;
      }

      // Use the API route which properly includes user_id
      const response = await fetch("/api/flag-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message_id: lastAssistantMsg.id,
          content: lastAssistantMsg.content,
          reason: flagReason,
          severity: "medium",
          conversation_id: conversation,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to flag message");
      }

      // Success - close modal and reset
      setFlagModalOpen(false);
      setFlagReason("");
      // Optionally show a success message
    } catch (error: any) {
      console.error("Error flagging message:", error);
      alert(error.message || "Failed to flag message. Please try again.");
    } finally {
      setFlagLoading(false);
    }
  };

  const handleEndChat = () => {
    // Go directly to questionnaire (user can skip if they want)
    if (!hasSubmittedFeedback && messages.length > 0) {
      pendingNavigationRef.current = "/personas";
      setQuestionnaireOpen(true);
    } else {
      // If already submitted or no messages, just navigate
      setIsNavigatingAway(true);
      router.push("/personas");
    }
  };

  const handleQuestionnaireSubmit = async (responses: any) => {
    // Set submitting state FIRST to prevent race conditions - this must happen synchronously
    // before any async operations to prevent concurrent submissions from passing the check
    if (isSubmittingFeedback || hasSubmittedFeedback) {
      alert('You have already submitted feedback for this conversation.');
      setQuestionnaireOpen(false);
      const destination = pendingNavigationRef.current || "/personas";
      pendingNavigationRef.current = null;
      setIsNavigatingAway(true);
      router.push(destination);
      return;
    }

    // Set submitting state immediately to prevent double-clicks and race conditions
    setIsSubmittingFeedback(true);

    // Check database first to prevent race conditions
    const { data: existingFeedback, error: checkError } = await supabase
      .from("feedback_questionnaire")
      .select("id")
      .eq("conversation_id", conversation)
      .maybeSingle();
    
    // Handle query errors properly instead of silently ignoring them
    if (checkError) {
      setIsSubmittingFeedback(false);
      console.error('Error checking for existing feedback:', checkError);
      alert(`There was an error checking for existing feedback: ${checkError.message || 'Unknown error'}. Please try again.`);
      return;
    }
    
    if (existingFeedback) {
      alert('You have already submitted feedback for this conversation.');
      setHasSubmittedFeedback(true);
      setIsSubmittingFeedback(false);
      setQuestionnaireOpen(false);
      const destination = pendingNavigationRef.current || "/personas";
      pendingNavigationRef.current = null;
      setIsNavigatingAway(true);
      router.push(destination);
      return;
    }

    console.log('Submitting feedback responses:', responses);
    console.log('Conversation ID:', conversation);
    console.log('Persona ID:', persona);
    
    // Validate that all required fields have values
    const requiredFields = ['politeness', 'fairness', 'respectfulness', 'trustworthiness', 'competence', 'likeability'];
    const missingFields = requiredFields.filter(field => responses[field] === null || responses[field] === undefined);
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      alert('Please complete all rating fields before submitting.');
      return;
    }
    
    const feedbackData = {
      conversation_id: conversation,
      persona_id: persona,
      politeness: parseInt(responses.politeness),
      fairness: parseInt(responses.fairness),
      respectfulness: parseInt(responses.respectfulness),
      trustworthiness: parseInt(responses.trustworthiness),
      competence: parseInt(responses.competence),
      likeability: parseInt(responses.likeability),
      open_ended: responses.openEnded || null,
    };
    
    console.log('Prepared feedback data:', feedbackData);
    
    try {
      // Attempt insert - database unique constraint will prevent duplicates
      // This is atomic and handles race conditions at the database level
      const { data, error } = await supabase
        .from("feedback_questionnaire")
        .insert([feedbackData]);
      
      if (error) {
        // Check if it's a duplicate key error (unique constraint violation)
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
          // Duplicate detected - another request inserted between our check and insert
          alert('You have already submitted feedback for this conversation.');
          setHasSubmittedFeedback(true);
          setIsSubmittingFeedback(false);
          setQuestionnaireOpen(false);
          const destination = pendingNavigationRef.current || "/personas";
          pendingNavigationRef.current = null;
          setIsNavigatingAway(true);
          router.push(destination);
          return;
        }
        // Other error - reset submitting state to allow retry
        setIsSubmittingFeedback(false);
        console.error('Error submitting feedback:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        alert(`There was an error submitting your feedback: ${error.message || 'Unknown error'}. Please try again.`);
        return;
      }
      
      // Success - only set state after successful database insert
      console.log('Feedback submitted successfully:', data);
      setHasSubmittedFeedback(true);
      setIsSubmittingFeedback(false);
      setQuestionnaireOpen(false);
      setIsNavigatingAway(true);
      // Navigate to pending destination or default to personas
      const destination = pendingNavigationRef.current || "/personas";
      pendingNavigationRef.current = null;
      router.push(destination);
    } catch (error: any) {
      // Catch any unexpected errors (network issues, etc.)
      setIsSubmittingFeedback(false);
      console.error('Unexpected error submitting feedback:', error);
      alert(`There was an error submitting your feedback: ${error.message || 'Unknown error'}. Please try again.`);
      // Don't set hasSubmittedFeedback on error - allow retry
    }
  };

  const handleSkipQuestionnaire = () => {
    // Don't set hasSubmittedFeedback to true when skipping - user hasn't actually submitted feedback
    // This allows the warning system to continue working on subsequent navigation attempts
    setQuestionnaireOpen(false);
    setIsNavigatingAway(true);
    // Navigate to pending destination or default to personas
    const destination = pendingNavigationRef.current || "/personas";
    pendingNavigationRef.current = null;
    router.push(destination);
  };


  return (
    <div className="flex h-screen bg-[#171717]">
      {/* Burger button that floats with proper spacing - positioned below navbar */}
      <button
        className={`fixed z-40 p-3 rounded-lg bg-[#23232a] text-white shadow-lg hover:bg-[#2a2a32] transition-all duration-300 ${
          sidebarOpen ? 'left-[340px]' : 'left-6'
        }`}
        style={{ top: '100px' }}
        onClick={() => setSidebarOpen((open) => !open)}
        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        <Menu className="w-6 h-6" />
      </button>
      
      {/* Sidebar (collapsible on all screens) - positioned below navbar */}
      <div className={`fixed left-0 z-30 transition-all duration-300 bg-[#171717] border-r border-gray-800 ${sidebarOpen ? 'w-80' : 'w-0'} overflow-hidden`} style={{ top: '80px', height: 'calc(100vh - 80px)' }}>
        <ConversationSidebar />
      </div>
      
      {/* Main content wrapper for chat */}
      <div className={`flex-1 flex flex-col h-screen transition-all duration-300 ${sidebarOpen ? 'ml-80' : 'ml-0'}`}>
        {/* Persona Header */}
        <div className="bg-[#171717] border-b border-gray-800 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1 justify-center">
            <Avatar className="h-12 w-12">
              <AvatarImage src={personaData?.avatar_url || undefined} alt={personaData?.title} />
              <AvatarFallback>{personaData?.title?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-white text-lg font-semibold">{personaData?.title}</h1>
              <p className="text-gray-400 text-sm">{personaData?.description}</p>
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleEndChat}
            className="rounded-md text-white font-medium shadow hover:bg-red-600 transition-colors"
          >
            End Chat
          </Button>
        </div>

        {/* Chat messages area - scrollable with proper height */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="flex flex-col gap-3 px-8 py-6 max-w-6xl mx-auto w-full">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#23232a] text-gray-100 px-4 py-2 rounded-2xl rounded-bl-none">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}
            {/* Auto-scroll target */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Fixed chat input at bottom */}
        <div className="flex-shrink-0 border-t border-gray-800 bg-[#171717] p-4">
          <div className="max-w-6xl mx-auto w-full">
            <div className="bg-[#16161a] border border-[#23232a] rounded-2xl p-4">
              <ChatInput onSend={sendMessage} isLoading={isLoading} />
            </div>
          </div>
        </div>

        {/* Flag modal (unchanged) */}
        <Dialog open={flagModalOpen} onOpenChange={setFlagModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Flag Persona</DialogTitle>
              <DialogDescription>
                Please provide a reason for flagging this persona.
              </DialogDescription>
            </DialogHeader>
            <div className="mb-2">
              <Label>Reason</Label>
              <Input
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="e.g. Discriminatory language"
                className="bg-[#23232a] text-white"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFlagModalOpen(false)} disabled={flagLoading}>
                Cancel
              </Button>
              <Button onClick={handleFlag} disabled={flagLoading || !flagReason.trim()}>
                Submit Flag
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Feedback Questionnaire */}
        <FeedbackQuestionnaire
          isOpen={questionnaireOpen}
          onClose={() => setQuestionnaireOpen(false)}
          onSubmit={handleQuestionnaireSubmit}
          onSkip={handleSkipQuestionnaire}
        />

      </div>
    </div>
  );
} 