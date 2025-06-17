"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface DemographicsFormProps {
  isOpen: boolean;
  onSubmit: (demographics: { age: string; gender: string; role: string }) => void;
  onCancel: () => void;
}

export default function DemographicsForm({ isOpen, onSubmit, onCancel }: DemographicsFormProps) {
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [role, setRole] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ age, gender, role });
    // Reset form
    setAge("");
    setGender("");
    setRole("");
  };

  const handleCancel = () => {
    // Reset form
    setAge("");
    setGender("");
    setRole("");
    onCancel();
  };

  return (
    <Dialog open={isOpen}>
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
              className="bg-[#23232a] text-white border-gray-600"
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
              className="bg-[#23232a] text-white border-gray-600"
              required
            />
          </div>
          
          <DialogFooter className="flex gap-2 mt-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
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
  );
} 