"use client";

import { Button } from "@/components/ui/button";
import { Flag } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function ChatMessage({ message, hideFlag = false }: ChatMessageProps) {
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flagLoading, setFlagLoading] = useState(false);
  const { toast } = useToast();

  const handleFlag = async () => {
    if (!message) return;
    setFlagLoading(true);

    const { error } = await supabase.from("flagged_messages").insert([
      {
        message_id: message.id,
        content: message.content,
        reason: flagReason,
        status: "pending",
        created_at: new Date().toISOString(),
      },
    ]);

    setFlagLoading(false);
    setFlagModalOpen(false);
    setFlagReason("");

    if (!error) {
      toast({ title: "Message flagged for review!", variant: "default" });
    } else {
      toast({ title: "Failed to flag message", description: error.message, variant: "destructive" });
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
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 text-xs text-red-400 hover:text-red-600 flex items-center gap-1"
              onClick={() => setFlagModalOpen(true)}
            >
              <Flag className="w-4 h-4" /> Flag
            </Button>
          )}
        </div>
      </div>

      {!hideFlag && (
        <Dialog open={flagModalOpen} onOpenChange={setFlagModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Flag Response</DialogTitle>
              <DialogDescription>
                Please provide a reason for flagging this response.
              </DialogDescription>
            </DialogHeader>
            <div className="mb-2">
              <Label>Flagged Response</Label>
              <div className="bg-[#23232a] text-gray-100 rounded-lg p-3 mt-1 text-sm max-h-32 overflow-y-auto">
                {message.content}
              </div>
            </div>
            <div className="mb-2">
              <Label htmlFor="flag-reason">Reason</Label>
              <Input
                id="flag-reason"
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
      )}
    </>
  );
} 