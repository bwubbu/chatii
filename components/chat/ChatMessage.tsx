"use client";

import { Button } from "@/components/ui/button";
import { Flag, AlertTriangle, ThumbsDown, MessageSquareX, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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

const FLAG_TYPES = [
  { id: 'unfair', label: 'Unfair/Biased', icon: ShieldAlert, color: 'text-red-500', severity: 'high' },
  { id: 'impolite', label: 'Impolite/Rude', icon: ThumbsDown, color: 'text-orange-500', severity: 'medium' },
  { id: 'inappropriate', label: 'Inappropriate', icon: AlertTriangle, color: 'text-yellow-500', severity: 'medium' },
  { id: 'discriminatory', label: 'Discriminatory', icon: MessageSquareX, color: 'text-red-600', severity: 'critical' },
  { id: 'other', label: 'Other Issue', icon: Flag, color: 'text-gray-500', severity: 'low' }
] as const;

export function ChatMessage({ message, hideFlag = false }: ChatMessageProps) {
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [quickFlagOpen, setQuickFlagOpen] = useState(false);
  const [flagType, setFlagType] = useState<string>("");
  const [flagReason, setFlagReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [flagLoading, setFlagLoading] = useState(false);
  const { toast } = useToast();

  const handleQuickFlag = async (type: string) => {
    if (!message) return;
    setFlagLoading(true);

    const flagTypeData = FLAG_TYPES.find(f => f.id === type);
    const { data: { user } } = await supabase.auth.getUser();

    const insertData = {
      message_id: message.id,
      user_id: user?.id,
      content: message.content,
      reason: flagTypeData?.label || type,
      severity: flagTypeData?.severity || 'medium',
      flag_type: type, // Changed from array to string to match database
      status: "pending"
    };

    console.log('Inserting flag data:', insertData);
    const { error } = await supabase.from("flagged_messages").insert([insertData]);

    setFlagLoading(false);
    setQuickFlagOpen(false);

    if (!error) {
      console.log('Flag successfully inserted!');
      toast({ 
        title: "Response flagged!", 
        description: `Flagged as: ${flagTypeData?.label}`,
        variant: "default" 
      });
    } else {
      console.error('Flag insert error:', error);
      toast({ 
        title: "Failed to flag message", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  const handleDetailedFlag = async () => {
    if (!message || !flagType) return;
    setFlagLoading(true);

    const flagTypeData = FLAG_TYPES.find(f => f.id === flagType);
    const { data: { user } } = await supabase.auth.getUser();
    const finalReason = customReason.trim() || flagTypeData?.label || flagType;

    const insertData = {
      message_id: message.id,
      user_id: user?.id,
      content: message.content,
      reason: finalReason,
      severity: flagTypeData?.severity || 'medium',
      flag_type: flagType, // Changed from array to string to match database
      status: "pending"
    };

    console.log('Inserting detailed flag data:', insertData);
    const { data, error } = await supabase.from("flagged_messages").insert([insertData]);

    setFlagLoading(false);
    setFlagModalOpen(false);
    setFlagType("");
    setCustomReason("");

    if (!error) {
      console.log('Detailed flag successfully inserted!');
      toast({ 
        title: "Response flagged for review!", 
        description: `Flagged as: ${flagTypeData?.label}`,
        variant: "default" 
      });
    } else {
      console.error('Detailed flag insert error:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      toast({ 
        title: "Failed to flag message", 
        description: error?.message || "Unknown error occurred", 
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
                      {FLAG_TYPES.slice(0, 4).map((flagType) => {
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
                      <hr className="border-gray-600 my-1" />
                      <button
                        onClick={() => {
                          setQuickFlagOpen(false);
                          setFlagModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-gray-700 rounded transition-colors text-left text-gray-300"
                      >
                        <Flag className="w-3 h-3" />
                        More Details...
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {!hideFlag && (
        <Dialog open={flagModalOpen} onOpenChange={setFlagModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Flag Response
              </DialogTitle>
              <DialogDescription>
                Help us improve by reporting problematic responses. Your feedback is reviewed by our team.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Flagged Response</Label>
                <div className="bg-[#23232a] text-gray-100 rounded-lg p-3 mt-1 text-sm max-h-32 overflow-y-auto border border-gray-600">
                  {message.content}
                </div>
              </div>

              <div>
                <Label htmlFor="flag-type">Issue Type *</Label>
                <Select value={flagType} onValueChange={setFlagType}>
                  <SelectTrigger className="bg-[#23232a] border-gray-600 text-white">
                    <SelectValue placeholder="Select the type of issue" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#23232a] border-gray-600">
                    {FLAG_TYPES.map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <SelectItem key={type.id} value={type.id} className="text-white hover:bg-gray-700">
                          <div className="flex items-center gap-2">
                            <IconComponent className={`w-4 h-4 ${type.color}`} />
                            <span>{type.label}</span>
                            <Badge variant="outline" className={`ml-2 ${
                              type.severity === 'critical' ? 'border-red-500 text-red-400' :
                              type.severity === 'high' ? 'border-orange-500 text-orange-400' :
                              'border-gray-500 text-gray-400'
                            }`}>
                              {type.severity}
                            </Badge>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="custom-reason">Additional Details (Optional)</Label>
                <Textarea
                  id="custom-reason"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Provide specific details about the issue (optional)"
                  className="bg-[#23232a] border-gray-600 text-white placeholder-gray-400"
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setFlagModalOpen(false)} disabled={flagLoading}>
                Cancel
              </Button>
              <Button 
                onClick={handleDetailedFlag} 
                disabled={flagLoading || !flagType}
                className="bg-red-600 hover:bg-red-700"
              >
                {flagLoading ? "Submitting..." : "Submit Flag"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
} 