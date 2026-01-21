"use client";

import { Button } from "@/components/ui/button";
import { Flag, AlertTriangle, ThumbsDown, MessageSquareX, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  created_at: string;
}

interface ChatMessageProps {
  message: Message;
  hideFlag?: boolean;
  conversationId?: string;
}

// Custom markdown components for better styling
const markdownComponents = {
  // Style bold text
  strong: ({ children }: any) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  // Style emphasized text
  em: ({ children }: any) => (
    <em className="italic text-gray-200">{children}</em>
  ),
  // Style paragraphs with proper spacing
  p: ({ children }: any) => (
    <p className="mb-2 last:mb-0">{children}</p>
  ),
  // Style lists
  ul: ({ children }: any) => (
    <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
  ),
  li: ({ children }: any) => (
    <li className="text-gray-100">{children}</li>
  ),
  // Style inline code
  code: ({ children }: any) => (
    <code className="bg-gray-700 text-blue-300 px-1 py-0.5 rounded text-sm">{children}</code>
  ),
  // Remove default blockquote styling for simpler look
  blockquote: ({ children }: any) => (
    <div className="border-l-2 border-blue-400 pl-3 ml-2 text-gray-200">{children}</div>
  ),
};

const FLAG_TYPES = [
  { id: 'unfair', label: 'Unfair/Biased', icon: ShieldAlert, color: 'text-red-500', severity: 'high' },
  { id: 'impolite', label: 'Impolite/Rude', icon: ThumbsDown, color: 'text-orange-500', severity: 'medium' },
  { id: 'inappropriate', label: 'Inappropriate', icon: AlertTriangle, color: 'text-yellow-500', severity: 'medium' },
  { id: 'discriminatory', label: 'Discriminatory', icon: MessageSquareX, color: 'text-red-600', severity: 'critical' },
  { id: 'other', label: 'Other Issue', icon: Flag, color: 'text-gray-500', severity: 'low' }
] as const;

export function ChatMessage({ message, hideFlag = false, conversationId }: ChatMessageProps) {
  const [quickFlagOpen, setQuickFlagOpen] = useState(false);
  const [flagLoading, setFlagLoading] = useState(false);
  const { toast } = useToast();

  const handleQuickFlag = async (type: string) => {
    if (!message) return;
    setFlagLoading(true);

    try {
      const flagTypeData = FLAG_TYPES.find(f => f.id === type);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({ 
          title: "Failed to flag message", 
          description: "Please log in to flag messages", 
          variant: "destructive" 
        });
        setFlagLoading(false);
        setQuickFlagOpen(false);
        return;
      }

      const response = await fetch("/api/flag-message", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message_id: message.id,
          content: message.content,
          reason: flagTypeData?.label || type,
          severity: flagTypeData?.severity || 'medium',
          flag_type: type,
          conversation_id: conversationId
        }),
      });

      const result = await response.json();
      setFlagLoading(false);
      setQuickFlagOpen(false);

      if (!response.ok) {
        console.error('Flag insert error:', result);
        toast({ 
          title: "Failed to flag message", 
          description: result.error || result.details || "Unknown error occurred", 
          variant: "destructive" 
        });
      } else {
        console.log('Flag successfully inserted!', result);
        toast({ 
          title: "Message successfully reported!", 
          description: "Thank you for your feedback. This will help us make our AI responses better in the future.",
          variant: "default" 
        });
      }
    } catch (err: any) {
      console.error('Unexpected error in handleQuickFlag:', err);
      setFlagLoading(false);
      setQuickFlagOpen(false);
      toast({ 
        title: "Failed to flag message", 
        description: err?.message || "An unexpected error occurred", 
        variant: "destructive" 
      });
    }
  };


  return (
    <>
      <div className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
        <div className={`flex flex-col max-w-[80%] ${message.sender === "user" ? "items-end" : "items-start"}`}>
          <div
            className={`px-4 py-3 rounded-2xl shadow-md break-words ${
              message.sender === "user"
                ? "bg-blue-600 text-white rounded-br-none"
                : "bg-[#23232a] text-gray-100 rounded-bl-none"
            }`}
          >
            {message.sender === "assistant" ? (
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown
                  components={markdownComponents}
                  rehypePlugins={[rehypeRaw]}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            ) : (
              <span className="text-white">{message.content}</span>
            )}
          </div>
          {!hideFlag && message.sender === "assistant" && (
            <div className="mt-1 flex items-center gap-2">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"
                  onClick={() => setQuickFlagOpen(!quickFlagOpen)}
                >
                  <Flag className="w-4 h-4" /> Flag
                </Button>
                
                {/* Quick Flag Options */}
                {quickFlagOpen && (
                  <div className="absolute top-full mt-1 left-0 bg-[#1a1a1f] border border-gray-600 rounded-lg shadow-lg z-10 min-w-48">
                    <div className="p-2 space-y-1">
                      <div className="text-xs text-gray-400 mb-2 px-2">Quick Flag:</div>
                      {FLAG_TYPES.map((flagType) => {
                        const IconComponent = flagType.icon;
                        return (
                          <button
                            key={flagType.id}
                            onClick={() => handleQuickFlag(flagType.id)}
                            disabled={flagLoading}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-gray-700 rounded transition-colors text-left"
                          >
                            <IconComponent className={`w-3 h-3 ${flagType.color}`} />
                            <span className="text-gray-200">{flagType.label}</span>
                            <Badge variant="outline" className={`ml-auto text-xs ${
                              flagType.severity === 'critical' ? 'border-red-500 text-red-400' :
                              flagType.severity === 'high' ? 'border-orange-500 text-orange-400' :
                              'border-gray-500 text-gray-400'
                            }`}>
                              {flagType.severity}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

    </>
  );
} 