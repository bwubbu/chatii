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
import DemographicsForm from "@/components/chat/DemographicsForm";


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
  const [demographics, setDemographics] = useState<{ age?: string; gender?: string; role?: string; rating?: number; feedback?: string }>({});
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flagLoading, setFlagLoading] = useState(false);
  const [questionnaireOpen, setQuestionnaireOpen] = useState(false);
  const [showEndChatOptions, setShowEndChatOptions] = useState(false);
  const [demographicsFormOpen, setDemographicsFormOpen] = useState(false);
  const [demographicsCollected, setDemographicsCollected] = useState(false);
  const [currentModel, setCurrentModel] = useState<'gemini' | 'fairness'>('fairness'); // Default to fairness model
  
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

  useEffect(() => {
    // Check if demographics are already collected for this conversation
    const checkDemographics = async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("demographics")
        .eq("id", conversation)
        .single();
      
      if (error) {
        console.error("Error checking demographics:", error);
        return;
      }
      
      const hasDemographics = data.demographics && 
        data.demographics.age && 
        data.demographics.gender && 
        data.demographics.role;
      
      if (hasDemographics) {
        setDemographicsCollected(true);
      } else {
        // Show demographics form for new conversations
        setDemographicsFormOpen(true);
      }
    };
    
    checkDemographics();
  }, [conversation]);

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
    const { data, error } = await supabase
      .from("conversations")
      .select("demographics")
      .eq("id", conversation)
      .single();
    if (error) {
      console.error("Error fetching demographics:", error);
      setDemographics({});
      return;
    }
    setDemographics(data.demographics || {});
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

User Context (use to guide your tone, but don't mention):
- Age: ${demographics.age || 'unknown'}
- Gender: ${demographics.gender || 'unknown'}
- Role: ${demographics.role || 'unknown'}

Remember: You ARE this persona. Act accordingly.
`;

      // Use selected model (fairness-trained via Ollama or Gemini)
      const apiEndpoint = currentModel === 'fairness' ? '/api/trained-model' : '/api/gemini-chat';
      const requestBody = currentModel === 'fairness' 
        ? {
            message: content,
            system_prompt: systemPrompt,
            max_tokens: 200,
            temperature: 0.7
          }
        : {
            messages: [...messages, userMessage].map(msg => ({
              role: msg.sender === "user" ? "user" : "assistant",
              content: msg.content,
            })),
            systemPrompt,
          };

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Failed to get response from ${currentModel} model`);
      }

      const data = await response.json();
      
      // Handle different response formats
      const responseText = currentModel === 'fairness' 
        ? data.response || data.content || "I apologize, but I couldn't generate a response."
        : data.candidates?.[0]?.content?.parts?.[0]?.text || data.content || "I apologize, but I couldn't generate a response.";

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
    setShowEndChatOptions(true);
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

  const handleDemographicsSubmit = async (demographics: { age: string; gender: string; role: string }) => {
    // Format the demographics to match expected format
    const formatGender = (gender: string) => {
      const genderMap: { [key: string]: string } = {
        'Male': 'male',
        'Female': 'female',
        'Other': 'other',
        'Prefer not to say': 'prefer-not-to-say'
      };
      return genderMap[gender] || gender.toLowerCase();
    };

    const formatRole = (role: string) => {
      const roleMap: { [key: string]: string } = {
        'Student': 'student',
        'Professional': 'professional', 
        'Retiree': 'retiree',
        'Other': 'other'
      };
      return roleMap[role] || role.toLowerCase();
    };

    // Save to conversations table
    const { error: conversationError } = await supabase
      .from("conversations")
      .update({
        demographics: {
          age: demographics.age,
          gender: formatGender(demographics.gender),
          role: formatRole(demographics.role)
        }
      })
      .eq("id", conversation);
    
    if (conversationError) {
      console.error("Error saving demographics to conversation:", conversationError);
      return;
    }
    
    // Save demographics to analytics table
    const { error: analyticsError } = await supabase
      .from("demographics")
      .insert({
        conversation_id: conversation,
        persona_id: persona,
        age: parseInt(demographics.age) || null,
        gender: demographics.gender,
        role: demographics.role
      });
    
    if (analyticsError) {
      console.error("Error saving demographics to analytics:", analyticsError);
      // Don't return here - we still want to proceed even if analytics fails
    }
    
    // Update local state
    setDemographics(demographics);
    setDemographicsCollected(true);
    setDemographicsFormOpen(false);
  };

  const handleDemographicsCancel = () => {
    // Redirect back to personas page if user cancels
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
        currentModel={currentModel}
        onModelChange={setCurrentModel}
        onEndChat={handleEndChat}
      />
      </div>
      
      {/* Main content wrapper for chat */}
      <div className={`flex-1 flex flex-col h-screen transition-all duration-300 ${sidebarOpen ? 'ml-80' : 'ml-0'}`}>
        {demographicsCollected && (
          <>
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
          </>
        )}

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
        
        {/* End Chat Options Dialog */}
        <Dialog open={showEndChatOptions} onOpenChange={setShowEndChatOptions}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>End Chat</DialogTitle>
              <DialogDescription>
                Would you like to help us improve by answering a short questionnaire?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEndChatOptions(false);
                  router.push("/personas");
                }}
                className="flex-1"
              >
                No, Thanks
              </Button>
              <Button
                onClick={() => {
                  setShowEndChatOptions(false);
                  setQuestionnaireOpen(true);
                }}
                className="flex-1"
              >
                Yes, Help Improve
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

        {/* Demographics Form */}
        <DemographicsForm
          isOpen={demographicsFormOpen}
          onSubmit={handleDemographicsSubmit}
          onCancel={handleDemographicsCancel}
        />
      </div>
    </div>
  );
} 