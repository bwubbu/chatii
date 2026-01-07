"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabaseClient";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Persona {
  id: string;
  title: string;
  system_prompt: string;
}

export default function ChatPage({ params }: { params: Promise<{ persona: string }> }) {
  const { persona } = use(params);
  const [personaData, setPersonaData] = useState<Persona | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchPersona();
  }, [persona]);

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

  const startNewConversation = async () => {
    const { data: conversation, error } = await supabase
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

    router.push(`/chat/${persona}/${conversation.id}`);
  };

  if (!personaData) {
    return (
      <div className="flex h-screen bg-[#171717]">
        <ConversationSidebar />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading persona...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#171717]">
      <ConversationSidebar />
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">
            {personaData.title}
          </h1>
          <p className="text-gray-400">
            Start a new conversation to begin chatting with {personaData.title}.
          </p>
          <Button
            onClick={startNewConversation}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Conversation
          </Button>
        </div>
      </div>
    </div>
  );
} 