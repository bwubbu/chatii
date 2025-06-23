"use client";
import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Mic, ChevronDown, Home, Users, Shield } from "lucide-react";

export default function HotelReceptionistChat() {
  const [demographicOpen, setDemographicOpen] = useState(true);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [role, setRole] = useState("");

  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello! How can I assist you with your stay today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isAdmin = false; // TODO: Replace with real admin check
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemographicOpen(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const newMessages = [...messages, { sender: "user", text: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/gemini-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            `Demographics: Age: ${age}, Gender: ${gender}, Role: ${role}.`,
            ...newMessages.filter(m => m.sender !== "bot").map(m => m.text)
          ]
        }),
      });
      const data = await res.json();
      const geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "(No response)";
      setMessages([...newMessages, { sender: "bot", text: geminiText }]);
    } catch (err) {
      setMessages([...newMessages, { sender: "bot", text: "Sorry, there was an error." }]);
    }
    setLoading(false);
  };

  // Speech-to-text logic
  const handleMicClick = () => {
    if (recording) {
      recognitionRef.current?.stop();
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
      recognitionRef.current = recognition;
      recognition.start();
      setRecording(true);
    } else {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#18181b]">
      <Dialog open={demographicOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Before We Start...</DialogTitle>
              <DialogDescription>Select your demographic!</DialogDescription>
            </DialogHeader>
            <div>
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                placeholder="Enter your age"
                value={age}
                onChange={e => setAge(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Gender</Label>
              <RadioGroup value={gender} onValueChange={setGender} className="flex flex-wrap gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male">Male</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female">Female</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other">Other</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="prefer-not-to-say" id="prefer-not-to-say" />
                  <Label htmlFor="prefer-not-to-say">Prefer not to say</Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                placeholder="Enter your role in the conversation (e.g., customer)"
                value={role}
                onChange={e => setRole(e.target.value)}
                required
              />
            </div>
            <DialogFooter className="flex gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setDemographicOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Start Chat</Button>
            </DialogFooter>
            <p className="text-xs text-muted-foreground mt-2">
              This information is needed so that the chatbot is given context on how to interact with you
            </p>
          </form>
        </DialogContent>
      </Dialog>
      {!demographicOpen && (
        <>
          <div className="flex-1 flex flex-col items-center w-full px-2 sm:px-6 md:px-12 py-8 bg-[#18181b]">
            <div className="w-full max-w-3xl flex-1 overflow-y-auto space-y-3">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex w-full transition-all duration-300 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <span
                    className={`inline-block px-4 py-2 rounded-2xl shadow-md max-w-2xl break-words animate-fade-in ${msg.sender === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-[#23232a] text-gray-100 rounded-bl-none"}`}
                  >
                    {msg.text}
                  </span>
                </div>
              ))}
              {loading && <div className="text-gray-400 animate-pulse">Hotel Receptionist is typing...</div>}
              <div ref={chatEndRef} />
            </div>
          </div>
          <form
            onSubmit={handleSend}
            className="fixed left-0 w-full flex justify-center pointer-events-none"
            style={{ bottom: 0, zIndex: 20 }}
          >
            <div className={`w-full max-w-3xl flex items-center gap-2 p-4 bg-[#16161a] border border-[#23232a] rounded-2xl shadow-xl mb-6 pointer-events-auto`}>
              <Button
                type="button"
                variant="ghost"
                className={`rounded-full p-2 relative transition-shadow ${recording ? "ring-2 ring-red-500 shadow-red-500/40 animate-pulse" : ""}`}
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
                onChange={e => setInput(e.target.value)}
                placeholder="Send a message..."
                className="flex-1 bg-[#23232a] text-white border-none focus:ring-0 focus:outline-none"
                disabled={loading}
                autoFocus
              />
              <Button type="submit" disabled={loading || !input.trim()} className="ml-2 px-6">
                Send
              </Button>
            </div>
          </form>
        </>
      )}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s;
        }
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.4s;
        }
      `}</style>
    </div>
  );
} 