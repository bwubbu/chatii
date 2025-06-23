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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Lightbulb, Users, MessageSquare, Shield, Target } from "lucide-react";

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
      <DialogContent className="max-w-6xl w-full bg-[#20232a] border-[#23272f] max-h-[90vh] overflow-y-auto">
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
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-4">
          {/* Left Column - Form Fields */}
          <div className="space-y-6">
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4">
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
                    placeholder="e.g., Hotel Receptionist, Medical Assistant"
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
                    className="bg-[#23272f] border-[#23272f] text-white h-20"
                    placeholder="Brief description of the persona's role and purpose"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="systemPrompt" className="text-gray-400 flex items-center gap-2">
                    System Prompt
                    <Badge variant="secondary" className="text-xs">Required</Badge>
                  </Label>
                  <Textarea
                    id="systemPrompt"
                    value={formData.systemPrompt}
                    onChange={(e) =>
                      setFormData({ ...formData, systemPrompt: e.target.value })
                    }
                    placeholder="Enter the detailed system prompt for this persona..."
                    className="bg-[#23272f] border-[#23272f] text-white h-64 resize-none"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    This defines how the AI will behave and respond as this persona. See the guide on the right for best practices.
                  </p>
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
              
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  {initialData ? "Save Changes" : "Create Persona"}
                </Button>
              </DialogFooter>
            </form>
          </div>

          {/* Right Column - System Prompt Guide */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-semibold text-white">System Prompt Guide</h3>
            </div>

            {/* Essential Components */}
            <Card className="bg-[#23272f] border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-400" />
                  Essential Components
                </CardTitle>
              </CardHeader>
                             <CardContent className="space-y-3 text-sm">
                 <div>
                   <Badge variant="outline" className="mb-2 text-xs text-white border-gray-500">Role Definition</Badge>
                   <p className="text-gray-200">Define who the AI is and their professional background</p>
                   <code className="text-xs text-green-300 block mt-1 bg-gray-900 p-2 rounded border border-gray-700">
                     "You are a licensed clinical psychologist with 15 years of experience..."
                   </code>
                 </div>
                 <div>
                   <Badge variant="outline" className="mb-2 text-xs text-white border-gray-500">Personality Traits</Badge>
                   <p className="text-gray-200">Describe how they should communicate and behave</p>
                   <code className="text-xs text-green-300 block mt-1 bg-gray-900 p-2 rounded border border-gray-700">
                     "You have a warm, empathetic approach and prioritize creating a safe space..."
                   </code>
                 </div>
                 <div>
                   <Badge variant="outline" className="mb-2 text-xs text-white border-gray-500">Communication Style</Badge>
                   <p className="text-gray-200">Specify tone, formality level, and interaction approach</p>
                   <code className="text-xs text-green-300 block mt-1 bg-gray-900 p-2 rounded border border-gray-700">
                     "Communicate in a professional yet friendly manner, using clear language..."
                   </code>
                 </div>
               </CardContent>
            </Card>

            {/* Best Practices */}
            <Card className="bg-[#23272f] border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-400" />
                  Best Practices
                </CardTitle>
              </CardHeader>
                             <CardContent className="space-y-2 text-sm">
                 <div className="flex items-start gap-2">
                   <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                   <p className="text-gray-200">Be specific about the persona's expertise and limitations</p>
                 </div>
                 <div className="flex items-start gap-2">
                   <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                   <p className="text-gray-200">Include ethical guidelines and professional boundaries</p>
                 </div>
                 <div className="flex items-start gap-2">
                   <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                   <p className="text-gray-200">Specify how to handle sensitive or inappropriate topics</p>
                 </div>
                 <div className="flex items-start gap-2">
                   <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                   <p className="text-gray-200">Define response length and structure preferences</p>
                 </div>
                 <div className="flex items-start gap-2">
                   <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                   <p className="text-gray-200">Include fairness and bias prevention guidelines</p>
                 </div>
               </CardContent>
            </Card>

            {/* Fairness Guidelines */}
            <Card className="bg-[#23272f] border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-400" />
                  Fairness & Ethics
                </CardTitle>
              </CardHeader>
                             <CardContent className="space-y-2 text-sm">
                 <p className="text-gray-200 mb-3">Always include these fairness principles:</p>
                 <div className="space-y-2">
                   <div className="bg-gray-900 p-2 rounded text-xs border border-gray-700">
                     <span className="text-green-400">• </span>
                     <span className="text-gray-200">Treat all users with equal respect regardless of demographics</span>
                   </div>
                   <div className="bg-gray-900 p-2 rounded text-xs border border-gray-700">
                     <span className="text-green-400">• </span>
                     <span className="text-gray-200">Avoid assumptions based on gender, age, race, or background</span>
                   </div>
                   <div className="bg-gray-900 p-2 rounded text-xs border border-gray-700">
                     <span className="text-green-400">• </span>
                     <span className="text-gray-200">Provide inclusive and culturally sensitive responses</span>
                   </div>
                   <div className="bg-gray-900 p-2 rounded text-xs border border-gray-700">
                     <span className="text-green-400">• </span>
                     <span className="text-gray-200">Acknowledge when topics are outside your expertise</span>
                   </div>
                 </div>
               </CardContent>
            </Card>

            {/* Example Template */}
            <Card className="bg-[#23272f] border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  Example Template
                </CardTitle>
              </CardHeader>
                             <CardContent className="text-xs">
                 <div className="bg-gray-900 p-3 rounded font-mono text-gray-200 space-y-2 border border-gray-700">
                   <div><span className="text-blue-400">You are a</span> [ROLE] <span className="text-blue-400">with</span> [EXPERIENCE/CREDENTIALS].</div>
                   <div><span className="text-blue-400">Your personality:</span> [PERSONALITY TRAITS]</div>
                   <div><span className="text-blue-400">Communication style:</span> [TONE AND APPROACH]</div>
                   <div><span className="text-blue-400">Key responsibilities:</span> [MAIN FUNCTIONS]</div>
                   <div><span className="text-blue-400">Limitations:</span> [WHAT YOU CAN'T DO]</div>
                   <div><span className="text-blue-400">Fairness principles:</span> [ETHICAL GUIDELINES]</div>
                   <div><span className="text-blue-400">Response format:</span> [PREFERRED STRUCTURE]</div>
                 </div>
               </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 