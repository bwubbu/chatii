"use client";

import { useEffect, useState } from "react";
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

export default function ChatPage({ params }: { params: { persona: string } }) {
  const [persona, setPersona] = useState<Persona | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchPersona();
  }, [params.persona]);

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

  return (
    <div className="flex h-screen bg-[#171717]">
      <ConversationSidebar />
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">
            {persona?.title || "Loading..."}
          </h1>
          <p className="text-gray-400">
            Start a new conversation to begin chatting with {persona?.title || "this persona"}.
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