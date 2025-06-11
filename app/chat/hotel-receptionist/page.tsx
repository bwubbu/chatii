"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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

  return (
    <div className="container mx-auto p-4">
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
        <div className="max-w-xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Chat with Hotel Receptionist</h1>
          <div className="bg-muted p-4 rounded-lg min-h-[300px] flex flex-col gap-2">
            {messages.map((msg, idx) => (
              <div key={idx} className={msg.sender === "user" ? "text-right" : "text-left"}>
                <span className={msg.sender === "user" ? "bg-blue-500 text-white px-3 py-1 rounded-lg inline-block" : "bg-gray-200 text-gray-900 px-3 py-1 rounded-lg inline-block"}>
                  {msg.text}
                </span>
              </div>
            ))}
            {loading && <div className="text-gray-400">Hotel Receptionist is typing...</div>}
          </div>
          <form onSubmit={handleSend} className="flex gap-2 mt-4">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !input.trim()}>Send</Button>
          </form>
        </div>
      )}
    </div>
  );
} 