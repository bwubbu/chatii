"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabaseClient";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus, Flag, Menu } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
}

export default function ConversationPage({ params }: { params: Promise<{ persona: string; conversation: string }> }) {
  const { persona, conversation } = use(params);
  const [messages, setMessages] = useState<Message[]>([]);
  const [personaData, setPersonaData] = useState<Persona | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [demographics, setDemographics] = useState<{ age?: string; gender?: string; role?: string }>({});
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flagLoading, setFlagLoading] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

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
      // Strengthen system prompt
      const systemPrompt = `
${personaData.system_prompt}

You are to always respond in a fair, polite, and respectful manner. Adapt your tone and language to suit the user's age, gender, and role as provided below. Do not mention or repeat the user's demographics in your response; simply use them to guide your tone and style. Immediately play the persona and do not reiterate the demographic information in the chat.

User Demographics:
- Age: ${demographics.age || 'unknown'}
- Gender: ${demographics.gender || 'unknown'}
- Role: ${demographics.role || 'unknown'}
`;

      const response = await fetch("/api/gemini-chat", {
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

      if (!response.ok) {
        throw new Error("Failed to get response from Gemini");
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: Date.now().toString(),
        content: data.content,
        sender: "assistant",
        created_at: new Date().toISOString(),
      };

      // Add assistant message to UI
      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message to database
      await supabase.from("messages").insert({
        conversation_id: conversation,
        content: data.content,
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

  return (
    <div className="flex h-screen bg-[#171717]">
      {/* Burger button that moves with sidebar */}
      <button
        className={`fixed z-40 p-2 rounded-md bg-[#23232a] text-white shadow transition-all duration-300 ${
          sidebarOpen ? 'left-[320px]' : 'left-6'
        }`}
        style={{ top: '16px' }}
        onClick={() => setSidebarOpen((open) => !open)}
        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        <Menu className="w-7 h-7" />
      </button>
      {/* Sidebar (collapsible on all screens) */}
      <div className={`fixed left-0 z-30 transition-all duration-300 bg-[#171717] border-r border-gray-800 ${sidebarOpen ? 'w-80' : 'w-0'} overflow-hidden`} style={{ top: 0, height: '100vh' }}>
        <ConversationSidebar />
      </div>
      {/* Main content wrapper for chat */}
      <div className={`flex-1 flex flex-col relative overflow-hidden transition-all duration-300 ${sidebarOpen ? 'md:ml-80' : 'md:ml-0'} ${!sidebarOpen ? 'items-center' : ''}`}> 
        {/* Main chat area, centered if sidebar is closed */}
        <div className={`flex-1 flex flex-col relative w-full ${!sidebarOpen ? 'max-w-2xl mx-auto' : ''}`}> 
          {/* Sticky persona credentials bar */}
          <div className="sticky top-0 z-20 flex flex-col items-center bg-[#171717] pt-6 pb-2">
            <Avatar className="h-20 w-20 border-2 border-white mb-2">
              <AvatarImage src={personaData?.avatar_url || undefined} alt={personaData?.title || "Persona"} />
              <AvatarFallback>{personaData?.title?.[0] || "P"}</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white">{personaData?.title}</span>
              <button
                className="ml-2 text-red-400 hover:text-red-600"
                onClick={() => setFlagModalOpen(true)}
                aria-label="Flag bot"
              >
                <Flag className="w-5 h-5" />
              </button>
            </div>
            {/* End Chat Button - now red and styled */}
            <Button
              variant="destructive"
              className="mt-2 px-6 py-2 rounded-full text-white font-semibold shadow hover:bg-red-600 transition-colors"
              onClick={() => setFeedbackOpen(true)}
            >
              End Chat
            </Button>
          </div>
          {/* Chat messages area with padding for floating input */}
          <ScrollArea className="flex-1 px-4 pb-40 overflow-y-auto">
            <div className="flex flex-col gap-3 max-w-2xl mx-auto pt-4">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
            </div>
          </ScrollArea>
          {/* Floating, aligned chat input */}
          <div className={`fixed w-full flex justify-center pointer-events-none transition-all duration-300 ${sidebarOpen ? 'md:left-80 md:w-[calc(100%-20rem)]' : 'md:left-0 md:w-full'}`} style={{ bottom: 0, zIndex: 20 }}>
            <div className="w-full max-w-2xl flex items-center gap-2 p-4 bg-[#16161a] border border-[#23232a] rounded-2xl shadow-xl mb-6 pointer-events-auto">
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
        {/* Feedback Dialog (unchanged) */}
        <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>End Chat & Feedback</DialogTitle>
              <DialogDescription>
                Please rate your experience and leave any comments about the bot.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 mb-2">
              <Label>Rating</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`text-2xl ${rating && rating >= star ? 'text-yellow-400' : 'text-gray-400'}`}
                    onClick={() => setRating(star)}
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <Label htmlFor="feedback">Comments</Label>
              <Input
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Your feedback..."
                className="bg-[#23232a] text-white"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFeedbackOpen(false)} disabled={feedbackLoading}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  setFeedbackLoading(true);
                  // Save feedback to supabase (optional: create a feedback table)
                  await supabase.from("feedback").insert({
                    conversation_id: conversation,
                    persona_id: persona,
                    rating,
                    feedback,
                    created_at: new Date().toISOString(),
                  });
                  setFeedbackLoading(false);
                  setFeedbackOpen(false);
                  setFeedback("");
                  setRating(null);
                  // Optionally redirect or show a thank you message
                  router.push("/chat");
                }}
                disabled={feedbackLoading || !rating}
              >
                Submit Feedback & End Chat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 