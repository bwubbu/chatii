import { useState } from "react";
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

interface PersonaFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PersonaFormData) => void;
  initialData?: PersonaFormData;
}

export interface PersonaFormData {
  id?: string;
  title: string;
  description: string;
  avatarFallback: string;
  isActive: boolean;
  systemPrompt?: string;
  avatarImage?: File;
  trainingDataFile?: File;
}

export function PersonaForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: PersonaFormProps) {
  const [formData, setFormData] = useState<PersonaFormData>(
    initialData || {
      title: "",
      description: "",
      avatarFallback: "",
      isActive: true,
      systemPrompt: "",
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-[#20232a] border-[#23272f]">
        <DialogHeader>
          <DialogTitle className="text-white">
            {initialData ? "Edit Persona" : "Add New Persona"}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {initialData
              ? "Make changes to the persona here."
              : "Create a new chat persona here."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-gray-400">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                className="bg-[#23272f] border-[#23272f] text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description" className="text-gray-400">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
                className="bg-[#23272f] border-[#23272f] text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="avatarFallback" className="text-gray-400">Avatar Fallback</Label>
              <Input
                id="avatarFallback"
                value={formData.avatarFallback}
                onChange={(e) =>
                  setFormData({ ...formData, avatarFallback: e.target.value })
                }
                maxLength={2}
                required
                className="bg-[#23272f] border-[#23272f] text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="systemPrompt" className="text-gray-400">System Prompt</Label>
              <Textarea
                id="systemPrompt"
                value={formData.systemPrompt}
                onChange={(e) =>
                  setFormData({ ...formData, systemPrompt: e.target.value })
                }
                placeholder="Enter the system prompt for this persona..."
                className="bg-[#23272f] border-[#23272f] text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="avatarImage" className="text-gray-400">Avatar Image</Label>
              <Input
                id="avatarImage"
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    avatarImage: e.target.files?.[0],
                  })
                }
                className="bg-[#23272f] border-[#23272f] text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="trainingData" className="text-gray-400">Training Data (JSON, optional)</Label>
              <Input
                id="trainingData"
                type="file"
                accept="application/json"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    trainingDataFile: e.target.files?.[0],
                  })
                }
                className="bg-[#23272f] border-[#23272f] text-white"
              />
              <span className="text-xs text-gray-500">Upload a JSON file with training data for this persona. Leave empty to rely on user feedback.</span>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label htmlFor="isActive" className="text-gray-400">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {initialData ? "Save Changes" : "Create Persona"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 