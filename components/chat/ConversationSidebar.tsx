"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabaseClient";
import { Button } from "@/components/ui/button";

import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ModelToggle } from "@/components/chat/ModelToggle";

interface Conversation {
  id: string;
  title: string;
  persona_id: string;
  persona_title: string;
  last_message_at: string;
  created_at: string;
}

interface PersonaGroup {
  id: string;
  title: string;
  conversations: Conversation[];
}

interface ConversationWithPersona {
  id: string;
  title: string;
  persona_id: string;
  personas: {
    id: string;
    title: string;
  };
  last_message_at: string;
  created_at: string;
}

interface ConversationSidebarProps {
  currentModel?: 'gemini' | 'fairness';
  onModelChange?: (model: 'gemini' | 'fairness') => void;
  onEndChat?: () => void;
}

export function ConversationSidebar({ currentModel, onModelChange, onEndChat }: ConversationSidebarProps) {
  const [personaGroups, setPersonaGroups] = useState<PersonaGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    const { data: conversations, error } = await supabase
      .from("conversations")
      .select(`
        id,
        title,
        persona_id,
        personas (
          id,
          title
        ),
        last_message_at,
        created_at
      `)
      .order("last_message_at", { ascending: false });

    if (error) {
      console.error("Error fetching conversations:", error);
      return;
    }

    // Group conversations by persona
    const groups = (conversations as unknown as ConversationWithPersona[]).reduce((acc: { [key: string]: PersonaGroup }, conv) => {
      const personaId = conv.persona_id;
      if (!acc[personaId]) {
        acc[personaId] = {
          id: personaId,
          title: conv.personas.title,
          conversations: []
        };
      }
      acc[personaId].conversations.push({
        id: conv.id,
        title: conv.title,
        persona_id: conv.persona_id,
        persona_title: conv.personas.title,
        last_message_at: conv.last_message_at,
        created_at: conv.created_at
      });
      return acc;
    }, {});

    setPersonaGroups(Object.values(groups));
  };

  const toggleGroup = (personaId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(personaId)) {
        next.delete(personaId);
      } else {
        next.add(personaId);
      }
      return next;
    });
  };

  const filteredGroups = personaGroups;

  const deleteConversation = async (conversationId: string) => {
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId);

    if (!error) {
      fetchConversations();
    }
  };

  return (
    <div className="w-80 h-full border-r border-gray-800 bg-[#171717] flex flex-col">
      {/* Controls Section */}
      {currentModel && onModelChange && onEndChat && (
        <div className="p-4 border-b border-gray-800 space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">AI Model</label>
            <ModelToggle 
              currentModel={currentModel}
              onModelChange={onModelChange}
            />
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="w-full rounded-full text-white font-medium shadow hover:bg-red-600 transition-colors"
            onClick={onEndChat}
          >
            End Chat
          </Button>
        </div>
      )}



      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          <h3 className="text-sm font-medium text-gray-400 mb-3 px-2">Past Chats</h3>
          {filteredGroups.map(group => (
            <div key={group.id} className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-between text-gray-300 hover:text-white hover:bg-gray-800"
                onClick={() => toggleGroup(group.id)}
              >
                <span className="font-medium">{group.title}</span>
                {expandedGroups.has(group.id) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>

              {expandedGroups.has(group.id) && (
                <div className="ml-4 space-y-1">
                  {group.conversations.map(conv => (
                    <div
                      key={conv.id}
                      className="group flex items-center justify-between p-2 rounded-md hover:bg-gray-800 cursor-pointer"
                      onClick={() => router.push(`/chat/${conv.persona_id}/${conv.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-300 truncate">{conv.title}</p>
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 text-gray-400 hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
} 