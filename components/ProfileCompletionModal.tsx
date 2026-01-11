"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProfileCompletionModalProps {
  open: boolean;
  onClose: () => void;
  userEmail?: string;
  userName?: string;
}

export function ProfileCompletionModal({ open, onClose, userEmail, userName }: ProfileCompletionModalProps) {
  const [username, setUsername] = useState(userName || "");
  const [nationality, setNationality] = useState<string>("");
  const [age, setAge] = useState<string>("");
  const [race, setRace] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Update username when prop changes
  useEffect(() => {
    if (userName) {
      setUsername(userName);
    }
  }, [userName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate demographic information
    if (!nationality || !age || !race || !gender) {
      setError("Please fill in all demographic information (Nationality, Age, Race, and Gender).");
      return;
    }

    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum <= 0 || ageNum >= 150) {
      setError("Please enter a valid age.");
      return;
    }

    if (!agreeToTerms) {
      setError("You must agree to the terms to continue.");
      return;
    }

    setLoading(true);

    try {
      // Get current authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError("You must be signed in to complete your profile. Please try signing in again.");
        setLoading(false);
        return;
      }

      // Update username in auth metadata if provided
      if (username && username.trim() !== "") {
        await supabase.auth.updateUser({
          data: { username: username.trim() }
        });
      }

      // Create user profile via API route
      const response = await fetch("/api/user-profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          nationality,
          age: ageNum,
          race,
          gender,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Error creating user profile:", result);
        const errorDetails = result.details || result.error || 'Unknown error';
        const errorCode = result.code ? ` (Error code: ${result.code})` : '';
        setError(`Failed to save profile: ${errorDetails}${errorCode}. Please try again.`);
        setLoading(false);
      } else {
        // Success - close modal and refresh
        onClose();
        // Reload page to update user state
        window.location.reload();
      }
    } catch (apiError: any) {
      console.error("Error calling profile API:", apiError);
      setError("Failed to save profile. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0F0F0F] border-gray-600">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            Complete Your Profile
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Please provide some information to personalize your experience and agree to our terms.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Error message */}
          {error && (
            <div className="text-red-500 text-sm text-center bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Username (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-gray-300 text-sm">
              Username (Optional)
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-[#2C2C2C] border-gray-600 text-white placeholder-gray-400 focus:border-gray-500"
            />
            {userEmail && (
              <p className="text-xs text-gray-500">
                Signed in as: {userEmail}
              </p>
            )}
          </div>

          {/* Nationality */}
          <div className="space-y-2">
            <Label htmlFor="nationality" className="text-gray-300 text-sm">
              Nationality <span className="text-red-500">*</span>
            </Label>
            <Select
              value={nationality}
              onValueChange={(value) => {
                setNationality(value);
                setRace(""); // Reset race when nationality changes
              }}
              required
            >
              <SelectTrigger className="bg-[#2C2C2C] border-gray-600 text-white focus:border-gray-500">
                <SelectValue placeholder="Select your nationality" />
              </SelectTrigger>
              <SelectContent className="bg-[#2C2C2C] border-gray-600 text-white">
                <SelectItem value="Malaysia">Malaysia</SelectItem>
                <SelectItem value="Sweden">Sweden</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Age */}
          <div className="space-y-2">
            <Label htmlFor="age" className="text-gray-300 text-sm">
              Age <span className="text-red-500">*</span>
            </Label>
            <Input
              id="age"
              type="number"
              placeholder="Enter your age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="bg-[#2C2C2C] border-gray-600 text-white placeholder-gray-400 focus:border-gray-500"
              min="1"
              max="149"
              required
            />
          </div>

          {/* Race */}
          <div className="space-y-2">
            <Label htmlFor="race" className="text-gray-300 text-sm">
              Race <span className="text-red-500">*</span>
            </Label>
            <Select value={race} onValueChange={setRace} required>
              <SelectTrigger className="bg-[#2C2C2C] border-gray-600 text-white focus:border-gray-500">
                <SelectValue placeholder="Select your race" />
              </SelectTrigger>
              <SelectContent className="bg-[#2C2C2C] border-gray-600 text-white">
                {nationality === "Malaysia" ? (
                  <>
                    <SelectItem value="Malay">Malay</SelectItem>
                    <SelectItem value="Malaysian Chinese">Malaysian Chinese</SelectItem>
                    <SelectItem value="Malaysian Indian">Malaysian Indian</SelectItem>
                  </>
                ) : nationality === "Sweden" ? (
                  <SelectItem value="Swedish">Swedish</SelectItem>
                ) : (
                  <>
                    <SelectItem value="Malay">Malay</SelectItem>
                    <SelectItem value="Malaysian Chinese">Malaysian Chinese</SelectItem>
                    <SelectItem value="Malaysian Indian">Malaysian Indian</SelectItem>
                    <SelectItem value="Swedish">Swedish</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label htmlFor="gender" className="text-gray-300 text-sm">
              Gender <span className="text-red-500">*</span>
            </Label>
            <Select value={gender} onValueChange={setGender} required>
              <SelectTrigger className="bg-[#2C2C2C] border-gray-600 text-white focus:border-gray-500">
                <SelectValue placeholder="Select your gender" />
              </SelectTrigger>
              <SelectContent className="bg-[#2C2C2C] border-gray-600 text-white">
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Privacy & Data Usage Notice */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-xs text-gray-300 leading-relaxed">
              <strong className="text-blue-400">Privacy & Data Usage:</strong> The demographic information you provide is used solely to personalize your AI chat experience. We do not use this data for malicious purposes, advertising, or sharing with third parties. Your information helps the AI adapt its communication style to better serve you.
            </p>
          </div>

          {/* Terms Agreement */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={agreeToTerms}
              onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
              className="border-gray-600 data-[state=checked]:bg-white data-[state=checked]:text-gray-900 mt-1"
            />
            <Label htmlFor="terms" className="text-gray-300 text-sm leading-relaxed">
              I agree to our Terms of Service and Privacy Policy <span className="text-red-500">*</span>
            </Label>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Maybe Later
            </Button>
            <Button
              type="submit"
              disabled={!agreeToTerms || loading}
              className="flex-1 bg-white text-gray-900 hover:bg-gray-100 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Complete Profile"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
