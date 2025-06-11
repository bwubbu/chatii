"use client";
import { PersonaCard } from "./PersonaCard";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PersonasTab() {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);

  const personas = [
    {
      id: "hotel-receptionist",
      title: "Hotel Receptionist",
      description: "A friendly and professional hotel receptionist ready to assist with your stay",
      avatarFallback: "HR",
      onTalk: () => router.push("/chat/hotel-receptionist"),
      onDownload: () => setDownloading(true), // No-op for now
    },
    // Add more personas here in the future
  ];

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
            onTalk={persona.onTalk}
            onDownload={persona.onDownload}
            onClick={persona.onTalk}
          />
        ))}
      </div>
    </div>
  );
} 