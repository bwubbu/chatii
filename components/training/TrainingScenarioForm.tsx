import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/supabaseClient";

interface TrainingScenarioFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TrainingScenarioFormData) => void;
  initialData?: TrainingScenarioFormData;
}

export interface TrainingScenarioFormData {
  id?: string;
  title: string;
  description: string;
  scenario_type: string;
  difficulty_level: number;
  initial_message: string;
  system_prompt: string;
  expected_behaviors: string[];
  persona_id: string | null;
  is_active: boolean;
}

export function TrainingScenarioForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: TrainingScenarioFormProps) {
  const [formData, setFormData] = useState<TrainingScenarioFormData>(
    initialData || {
      title: "",
      description: "",
      scenario_type: "frustrated",
      difficulty_level: 2,
      initial_message: "",
      system_prompt: "",
      expected_behaviors: [],
      persona_id: null,
      is_active: true,
    }
  );
  const [personas, setPersonas] = useState<Array<{ id: string; title: string }>>([]);
  const [behaviorInput, setBehaviorInput] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchPersonas();
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData({
          title: "",
          description: "",
          scenario_type: "frustrated",
          difficulty_level: 2,
          initial_message: "",
          system_prompt: "",
          expected_behaviors: [],
          persona_id: null,
          is_active: true,
        });
      }
    }
  }, [isOpen, initialData]);

  const fetchPersonas = async () => {
    const { data, error } = await supabase
      .from("personas")
      .select("id, title")
      .eq("is_active", true)
      .order("title");

    if (!error && data) {
      setPersonas(data);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addBehavior = () => {
    if (behaviorInput.trim()) {
      setFormData({
        ...formData,
        expected_behaviors: [...formData.expected_behaviors, behaviorInput.trim()],
      });
      setBehaviorInput("");
    }
  };

  const removeBehavior = (index: number) => {
    setFormData({
      ...formData,
      expected_behaviors: formData.expected_behaviors.filter((_, i) => i !== index),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full bg-[#20232a] border-[#23272f] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            {initialData ? "Edit Training Scenario" : "Add New Training Scenario"}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {initialData
              ? "Make changes to the training scenario here."
              : "Create a new training scenario for users to practice with."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title" className="text-gray-400">
                  Title *
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                  className="bg-[#23272f] border-[#23272f] text-white"
                  placeholder="e.g., Frustrated Customer - Slow Service"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="persona_id" className="text-gray-400">
                  Linked Persona (Optional)
                </Label>
                <Select
                  value={formData.persona_id || ""}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      persona_id: value === "none" ? null : value,
                    })
                  }
                >
                  <SelectTrigger className="bg-[#23272f] border-[#23272f] text-white">
                    <SelectValue placeholder="Select a persona (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {personas.map((persona) => (
                      <SelectItem key={persona.id} value={persona.id}>
                        {persona.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-gray-400">
                Description *
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
                className="bg-[#23272f] border-[#23272f] text-white h-20"
                placeholder="Brief description of the scenario"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="scenario_type" className="text-gray-400">
                  Scenario Type *
                </Label>
                <Select
                  value={formData.scenario_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, scenario_type: value })
                  }
                >
                  <SelectTrigger className="bg-[#23272f] border-[#23272f] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frustrated">Frustrated</SelectItem>
                    <SelectItem value="demanding">Demanding</SelectItem>
                    <SelectItem value="rude">Rude</SelectItem>
                    <SelectItem value="discriminatory">Discriminatory</SelectItem>
                    <SelectItem value="challenging">Challenging</SelectItem>
                    <SelectItem value="cultural_sensitivity">Cultural Sensitivity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="difficulty_level" className="text-gray-400">
                  Difficulty Level (1-5) *
                </Label>
                <Select
                  value={formData.difficulty_level.toString()}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      difficulty_level: parseInt(value),
                    })
                  }
                >
                  <SelectTrigger className="bg-[#23272f] border-[#23272f] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Easy</SelectItem>
                    <SelectItem value="2">2 - Moderate</SelectItem>
                    <SelectItem value="3">3 - Challenging</SelectItem>
                    <SelectItem value="4">4 - Difficult</SelectItem>
                    <SelectItem value="5">5 - Very Difficult</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="initial_message" className="text-gray-400">
                Initial Message (Customer's First Message) *
              </Label>
              <Textarea
                id="initial_message"
                value={formData.initial_message}
                onChange={(e) =>
                  setFormData({ ...formData, initial_message: e.target.value })
                }
                required
                className="bg-[#23272f] border-[#23272f] text-white h-24"
                placeholder="The first message the AI 'customer' will send to the user"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="system_prompt" className="text-gray-400">
                System Prompt (How AI Acts as Customer) *
              </Label>
              <Textarea
                id="system_prompt"
                value={formData.system_prompt}
                onChange={(e) =>
                  setFormData({ ...formData, system_prompt: e.target.value })
                }
                required
                className="bg-[#23272f] border-[#23272f] text-white h-32"
                placeholder="Instructions for how the AI should behave as this customer"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expected_behaviors" className="text-gray-400">
                Expected Behaviors (Tips for Users)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="expected_behaviors"
                  value={behaviorInput}
                  onChange={(e) => setBehaviorInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addBehavior();
                    }
                  }}
                  className="bg-[#23272f] border-[#23272f] text-white"
                  placeholder="Add a behavior tip (press Enter)"
                />
                <Button
                  type="button"
                  onClick={addBehavior}
                  variant="outline"
                  className="bg-[#23272f] border-[#23272f] text-white"
                >
                  Add
                </Button>
              </div>
              {formData.expected_behaviors.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.expected_behaviors.map((behavior, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-[#1a1d23] px-3 py-1 rounded-full text-sm text-gray-300"
                    >
                      <span>{behavior}</span>
                      <button
                        type="button"
                        onClick={() => removeBehavior(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
              <Label htmlFor="is_active" className="text-gray-400">
                Active (visible to users)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              {initialData ? "Save Changes" : "Create Scenario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

