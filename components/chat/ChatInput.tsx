"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input);
    setInput("");
  };

  const handleMicClick = () => {
    if (recording) {
      // Stop recording
      setRecording(false);
      return;
    }

    if (typeof window !== "undefined" && (window as any).webkitSpeechRecognition) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => prev ? prev + " " + transcript : transcript);
      };

      recognition.onerror = () => {
        setRecording(false);
      };

      recognition.onend = () => {
        setRecording(false);
      };

      recognition.start();
      setRecording(true);
    } else {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        className={`rounded-full p-2 relative transition-shadow ${
          recording ? "ring-2 ring-red-500 shadow-red-500/40 animate-pulse" : ""
        }`}
        aria-label={recording ? "Stop recording" : "Speak"}
        onClick={handleMicClick}
      >
        <Mic className={`w-6 h-6 ${recording ? "text-red-500" : "text-gray-400"}`} />
        {recording && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-[#16161a]" />
        )}
      </Button>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Send a message..."
        className="grow min-w-0 bg-[#23232a] text-white border-gray-700 focus:ring-0"
        disabled={isLoading}
        autoFocus
      />
      <Button type="submit" disabled={isLoading || !input.trim()} className="px-6">
        Send
      </Button>
    </form>
  );
} 