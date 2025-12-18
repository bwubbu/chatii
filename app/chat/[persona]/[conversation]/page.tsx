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
  const [demographics, setDemographics] = useState<{ nationality?: string; age?: number; race?: string; gender?: string }>({});
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flagLoading, setFlagLoading] = useState(false);
  const [questionnaireOpen, setQuestionnaireOpen] = useState(false);
  
  // Add ref for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    fetchPersona();
    fetchMessages();
    fetchDemographics();
  }, [persona, conversation]);


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
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversation)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }

    setMessages(data);
  };

  const fetchDemographics = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("Error getting user:", userError);
        setDemographics({});
        return;
      }

      // Fetch user demographics from user_profiles (from registration)
      const { data, error } = await supabase
        .from("user_profiles")
        .select("nationality, age, race, gender")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching user demographics:", error);
        setDemographics({});
        return;
      }

      // Set demographics from user profile
      setDemographics({
        nationality: data?.nationality || undefined,
        age: data?.age || undefined,
        race: data?.race || undefined,
        gender: data?.gender || undefined,
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

    router.push(`/chat/${persona}/${conversationData.id}`);
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
          const ragData = await ragResponse.json();
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
              const fallbackData = await fallbackResponse.json();
              ragGuidelines = fallbackData.guidelines || [];
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

FAIRNESS & RESPECT:
- Always respond in a fair, polite, and respectful manner
- Adapt your tone to suit the user appropriately
- Do not mention or repeat demographic information
- Treat all users with equal respect regardless of their background

User Context (use to guide your tone, cultural adaptation, and communication style, but don't mention these details explicitly):
- Nationality: ${demographics.nationality || 'unknown'}
- Age: ${demographics.age || 'unknown'}
- Race: ${demographics.race || 'unknown'}
- Gender: ${demographics.gender || 'unknown'}

IMPORTANT: Use this demographic information to:
- Adapt your communication style to be culturally appropriate
- Choose appropriate honorifics and formality levels
- Understand cultural context for politeness and respect
- Adapt your tone based on the user's background
- Be respectful and culturally aware in your responses
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
            max_tokens: 200,
            temperature: 0.7
          }),
        });

        if (fairnessResponse.ok) {
          const fairnessData = await fairnessResponse.json();
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

        const geminiData = await geminiResponse.json();
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

      // Update conversation title if it's the first message
      if (messages.length === 0) {
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
    if (!lastAssistantMsg) return;
    const { error } = await supabase.from("flagged_messages").insert([
      {
        message_id: lastAssistantMsg.id,
        content: lastAssistantMsg.content,
        reason: flagReason,
        status: "pending",
        created_at: new Date().toISOString(),
      },
    ]);
    setFlagLoading(false);
    setFlagModalOpen(false);
    setFlagReason("");
    // Optionally show a toast
  };

  const handleEndChat = () => {
    // Go directly to questionnaire (user can skip if they want)
    setQuestionnaireOpen(true);
  };

  const handleQuestionnaireSubmit = async (responses: any) => {
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
    
    const { data, error } = await supabase
      .from("feedback_questionnaire")
      .insert([feedbackData]);
    
    if (error) {
      console.error('Error submitting feedback:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      alert(`There was an error submitting your feedback: ${error.message || 'Unknown error'}. Please try again.`);
    } else {
      console.log('Feedback submitted successfully:', data);
      setQuestionnaireOpen(false);
      router.push("/personas");
    }
  };

  const handleSkipQuestionnaire = () => {
    setQuestionnaireOpen(false);
    router.push("/personas");
  };


  return (
    <div className="flex h-screen bg-[#171717]">
      {/* Burger button that floats with proper spacing */}
      <button
        className={`fixed z-40 p-3 rounded-lg bg-[#23232a] text-white shadow-lg hover:bg-[#2a2a32] transition-all duration-300 ${
          sidebarOpen ? 'left-[340px]' : 'left-6'
        }`}
        style={{ top: '20px' }}
        onClick={() => setSidebarOpen((open) => !open)}
        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        <Menu className="w-6 h-6" />
      </button>
      
      {/* Sidebar (collapsible on all screens) */}
      <div className={`fixed left-0 z-30 transition-all duration-300 bg-[#171717] border-r border-gray-800 ${sidebarOpen ? 'w-80' : 'w-0'} overflow-hidden`} style={{ top: 0, height: '100vh' }}>
        <ConversationSidebar
        onEndChat={handleEndChat}
      />
      </div>
      
      {/* Main content wrapper for chat */}
      <div className={`flex-1 flex flex-col h-screen transition-all duration-300 ${sidebarOpen ? 'ml-80' : 'ml-0'}`}>
        {/* Persona Header */}
        <div className="bg-[#171717] border-b border-gray-800 px-6 py-5 flex items-center justify-center">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={personaData?.avatar_url || undefined} alt={personaData?.title} />
              <AvatarFallback>{personaData?.title?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-white text-lg font-semibold">{personaData?.title}</h1>
              <p className="text-gray-400 text-sm">{personaData?.description}</p>
            </div>
          </div>
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