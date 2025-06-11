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
  title: string;
  description: string;
  avatarFallback: string;
  isActive: boolean;
  systemPrompt?: string;
  avatarImage?: File;
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Persona" : "Add New Persona"}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? "Make changes to the persona here."
              : "Create a new chat persona here."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="avatarFallback">Avatar Fallback</Label>
              <Input
                id="avatarFallback"
                value={formData.avatarFallback}
                onChange={(e) =>
                  setFormData({ ...formData, avatarFallback: e.target.value })
                }
                maxLength={2}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="systemPrompt">System Prompt</Label>
              <Textarea
                id="systemPrompt"
                value={formData.systemPrompt}
                onChange={(e) =>
                  setFormData({ ...formData, systemPrompt: e.target.value })
                }
                placeholder="Enter the system prompt for this persona..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="avatarImage">Avatar Image</Label>
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
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label htmlFor="isActive">Active</Label>
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