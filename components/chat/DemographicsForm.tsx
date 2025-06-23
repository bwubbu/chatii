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
      <DialogContent className="max-w-md bg-[#20232a] border-[#23272f]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-white">Before We Start...</DialogTitle>
            <DialogDescription className="text-gray-400">Select your demographic!</DialogDescription>
          </DialogHeader>
          
          <div>
            <Label htmlFor="age" className="text-gray-300">Age</Label>
            <Input
              id="age"
              type="number"
              placeholder="Enter your age"
              value={age}
              onChange={e => setAge(e.target.value)}
              className="bg-[#23272f] text-white border-[#23272f] placeholder:text-gray-500 focus:border-green-500"
              required
            />
          </div>
          
          <div>
            <Label className="text-gray-300">Gender</Label>
            <RadioGroup value={gender} onValueChange={setGender} className="flex flex-wrap gap-4 mt-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="male" id="male" className="border-gray-500 text-green-500" />
                <Label htmlFor="male" className="text-gray-300">Male</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="female" id="female" className="border-gray-500 text-green-500" />
                <Label htmlFor="female" className="text-gray-300">Female</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="other" id="other" className="border-gray-500 text-green-500" />
                <Label htmlFor="other" className="text-gray-300">Other</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="prefer-not-to-say" id="prefer-not-to-say" className="border-gray-500 text-green-500" />
                <Label htmlFor="prefer-not-to-say" className="text-gray-300">Prefer not to say</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div>
            <Label htmlFor="role" className="text-gray-300">Role</Label>
            <Input
              id="role"
              placeholder="Enter your role in the conversation (e.g., customer)"
              value={role}
              onChange={e => setRole(e.target.value)}
              className="bg-[#23272f] text-white border-[#23272f] placeholder:text-gray-500 focus:border-green-500"
              required
            />
          </div>
          
          <DialogFooter className="flex gap-2 mt-4">
            <Button type="button" variant="outline" onClick={handleCancel} className="border-gray-500 text-black hover:bg-gray-700 hover:text-white">
              Cancel
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">Start Chat</Button>
          </DialogFooter>
          
          <p className="text-xs text-gray-500 mt-2">
            This information is needed so that the chatbot is given context on how to interact with you
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
} 