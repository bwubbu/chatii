"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabaseClient";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

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
}

export default function ConversationPage({
  params,
}: {
  params: { persona: string; conversation: string };
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [demographics, setDemographics] = useState<{ age?: string; gender?: string; role?: string }>({});
  const router = useRouter();

  useEffect(() => {
    fetchPersona();
    fetchMessages();
    fetchDemographics();
  }, [params.persona, params.conversation]);

  const fetchPersona = async () => {
    const { data: persona, error } = await supabase
      .from("personas")
      .select("*")
      .eq("id", params.persona)
      .single();

    if (error) {
      console.error("Error fetching persona:", error);
      return;
    }

    setPersona(persona);
  };

  const fetchMessages = async () => {
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", params.conversation)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }

    setMessages(messages);
  };

  const fetchDemographics = async () => {
    const { data: conversation, error } = await supabase
      .from("conversations")
      .select("demographics")
      .eq("id", params.conversation)
      .single();
    if (error) {
      console.error("Error fetching demographics:", error);
      setDemographics({});
      return;
    }
    setDemographics(conversation.demographics || {});
  };

  const startNewConversation = async () => {
    const { data: conversation, error } = await supabase
      .from("conversations")
      .insert({
        persona_id: params.persona,
        title: "New Conversation",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating conversation:", error);
      return;
    }

    router.push(`/chat/${params.persona}/${conversation.id}`);
  };

  const sendMessage = async (content: string) => {
    if (!persona) return;

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
      conversation_id: params.conversation,
      content,
      sender: "user",
    });

    try {
      // Strengthen system prompt
      const systemPrompt = `
${persona.system_prompt}

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
        conversation_id: params.conversation,
        content: data.content,
        sender: "assistant",
      });

      // Update conversation title if it's the first message
      if (messages.length === 0) {
        const title = content.length > 30 ? content.slice(0, 30) + "..." : content;
        await supabase
          .from("conversations")
          .update({ title })
          .eq("id", params.conversation);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#171717]">
      <ConversationSidebar />
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full p-4">
            <div className="space-y-4">
              {messages.map(message => (
                <ChatMessage key={message.id} message={message} />
              ))}
            </div>
          </ScrollArea>
        </div>
        <div className="p-4 border-t border-gray-800">
          <ChatInput onSend={sendMessage} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
} 