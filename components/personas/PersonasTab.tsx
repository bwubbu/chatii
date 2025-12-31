"use client";
import { PersonaCard } from "./PersonaCard";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";

export function PersonasTab() {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [personas, setPersonas] = useState<any[]>([]);

  useEffect(() => {
    const fetchPersonas = async () => {
      const { data, error } = await supabase
        .from("personas")
        .select("*")
        .eq("is_active", true);
      if (!error) setPersonas(data || []);
    };
    fetchPersonas();
  }, []);

  const handleStartChat = async (personaId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Optionally handle not logged in
      return;
    }
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        persona_id: personaId,
        title: "New Conversation",
      })
      .select()
      .single();
    if (error) {
      // Optionally show an error message
      return;
    }
    router.push(`/chat/${personaId}/${data.id}`);
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {personas.map((persona) => (
          <PersonaCard
            key={persona.id}
            id={persona.id}
            title={persona.title}
            description={persona.description}
            avatarFallback={persona.avatarFallback}
            avatarSrc={persona.avatar_url}
            onTalk={() => handleStartChat(persona.id)}
            onDownload={() => setDownloading(true)}
            onClick={() => handleStartChat(persona.id)}
          />
        ))}
      </div>
    </div>
  );
} 