"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Code2, 
  Key, 
  Copy, 
  Shield, 
  Users,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Trash2
} from "lucide-react";
import { useUser } from "@/components/UserContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabaseClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Persona {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
}

interface APIKey {
  id: string;
  name: string;
  created_at: string;
  last_used?: string;
  usage_count: number;
  rate_limit: number;
  is_active: boolean;
  permissions?: string[];
  persona_id?: string | null;
}

export default function DeveloperPortal() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedPersona, setSelectedPersona] = useState<string>("all");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedPersonaId, setCopiedPersonaId] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState("");

  useEffect(() => {
    if (user) {
      fetchPersonas();
      fetchApiKeys();
    }
  }, [user]);

  const fetchPersonas = async () => {
    const { data } = await supabase.from("personas").select("*").eq("is_active", true);
    if (data) {
      setPersonas(data.map((p: any) => ({
        id: p.id,
        name: p.title,
        description: p.description || "",
        system_prompt: p.system_prompt || ""
      })));
    }
  };

  const fetchApiKeys = async () => {
    if (!user) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch("/api/api-keys", {
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const { apiKeys } = await response.json();
        setApiKeys(apiKeys || []);
      }
    } catch (error) {
      console.error("Error fetching API keys:", error);
    }
  };

  const generateApiKey = async () => {
    if (!newKeyName.trim()) {
      setSubmitMessage("Please enter a name for your API key");
      return;
    }

    setIsGenerating(true);
    setSubmitMessage("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSubmitMessage("Please log in to generate API keys");
        return;
      }

      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          name: newKeyName.trim(),
          persona_id: selectedPersona === "all" ? null : selectedPersona
        })
      });

      const data = await response.json();

      if (response.ok) {
        setGeneratedKey(data.api_key);
        setNewKeyName("");
        setSelectedPersona("all");
        await fetchApiKeys();
      } else {
        setSubmitMessage(data.error || "Failed to generate API key");
      }
    } catch (error: any) {
      setSubmitMessage(`Error: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch("/api/api-keys", {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ keyId })
      });

      if (response.ok) {
        await fetchApiKeys();
        setSubmitMessage("API key deleted successfully");
      } else {
        const data = await response.json();
        setSubmitMessage(data.error || "Failed to delete API key");
      }
    } catch (error: any) {
      setSubmitMessage(`Error: ${error.message}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const copyPersonaId = (personaId: string) => {
    navigator.clipboard.writeText(personaId);
    setCopiedPersonaId(personaId);
    setTimeout(() => setCopiedPersonaId(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f10] via-[#1a1a1f] to-[#23232a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#171717] text-white">
        <div className="container mx-auto px-6 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Developer Portal</h1>
            <p className="text-xl text-gray-300 mb-8">
              Please log in to access the developer features
            </p>
            <Button onClick={() => router.push("/login")} size="lg">
              Login to Continue
            </Button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f10] via-[#1a1a1f] to-[#23232a] text-white">
      <div className="container mx-auto p-6 max-w-5xl relative z-10">
        <div className="mb-6">
          <div className="mb-4">
            <h1 className="text-3xl font-bold mb-2 text-white">Developer Portal</h1>
            <p className="text-gray-400">Integrate ethical AI personas into your applications. Export configurations, generate API keys, and build with fairness-trained models.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card className="bg-[#23232a] border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-green-400 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-white">{personas.length}</div>
                  <div className="text-gray-400">Available Personas</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#23232a] border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Shield className="w-8 h-8 text-green-400 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-white">100%</div>
                  <div className="text-gray-400">Fairness Trained</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-[#23232a] border-gray-700">
            <TabsTrigger value="overview" className="text-gray-400 data-[state=active]:text-white">Getting Started</TabsTrigger>
            <TabsTrigger value="api-keys" className="text-gray-400 data-[state=active]:text-white">API Keys & Personas</TabsTrigger>
          </TabsList>

          <TabsContent value="api-keys" className="space-y-6">
            <Card className="bg-[#1a1a1f]/80 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Key className="w-5 h-5 mr-2 text-purple-400" />
                  Generate New API Key
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Create a new API key to access our personas API. You'll only see the key once, so save it securely!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="keyName" className="text-gray-300">Key Name</Label>
                  <Input
                    id="keyName"
                    placeholder="e.g., My Mobile App"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="bg-[#23232a] border-gray-700 text-white placeholder:text-gray-500"
                  />
                  <p className="text-sm text-gray-400">Give your API key a descriptive name to identify it later</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="persona" className="text-gray-300">Select Persona (Optional)</Label>
                  <Select value={selectedPersona} onValueChange={setSelectedPersona}>
                    <SelectTrigger className="bg-[#23232a] border-gray-700 text-white">
                      <SelectValue placeholder="All Personas (default)" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#23232a] border-gray-700">
                      <SelectItem value="all" className="text-white hover:bg-[#1a1a1f] focus:bg-[#1a1a1f]">
                        All Personas (default)
                      </SelectItem>
                      {personas.map((persona) => (
                        <SelectItem 
                          key={persona.id} 
                          value={persona.id}
                          className="text-white hover:bg-[#1a1a1f] focus:bg-[#1a1a1f]"
                        >
                          {persona.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-400">
                    Choose a specific persona for this key, or leave as "All Personas" to access any persona
                  </p>
                </div>
                <Button 
                  onClick={generateApiKey} 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white" 
                  disabled={isGenerating || !newKeyName.trim()}
                >
                  {isGenerating ? "Generating..." : "Generate API Key"}
                  <Key className="w-4 h-4 ml-2" />
                </Button>

                {generatedKey && (
                  <div className="p-4 bg-[#23232a] rounded-lg border border-gray-700">
                    <div className="flex items-start gap-2 mb-3">
                      <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <p className="font-bold text-yellow-300">⚠️ Save this key now - you won't see it again!</p>
                    </div>
                    <div className="flex items-center space-x-2 mb-3">
                      <code className="flex-1 bg-[#1a1a1f] p-3 rounded text-sm text-green-400 font-mono break-all border border-gray-700">
                        {generatedKey}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(generatedKey)}
                        className="text-gray-400 hover:text-white hover:bg-gray-700/50"
                      >
                        {copiedKey ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                        <p className="text-xs text-gray-300">Copy this key and store it securely. It will be hashed in our database and cannot be retrieved later.</p>
                  </div>
                )}

                {submitMessage && (
                  <div className={`p-4 rounded-lg border ${submitMessage.includes('success') || submitMessage.includes('deleted') ? 'bg-green-900/20 border-green-500/50 text-green-300' : 'bg-red-900/20 border-red-500/50 text-red-300'}`}>
                    {submitMessage}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#1a1a1f]/80 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Your API Keys</CardTitle>
                <CardDescription className="text-gray-400">Manage your API keys. You can delete keys you no longer need.</CardDescription>
              </CardHeader>
              <CardContent>
                {apiKeys.length === 0 ? (
                  <div className="text-center py-8">
                    <Key className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-400 mb-2">No API keys yet</p>
                    <p className="text-sm text-gray-500">Generate your first API key above to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {apiKeys.map((key) => {
                      // Get persona from persona_id (preferred) or from permissions (fallback)
                      const personaId = key.persona_id || key.permissions?.find(p => p.startsWith('persona:'))?.replace('persona:', '');
                      const associatedPersona = personaId ? personas.find(p => p.id === personaId) : null;
                      
                      return (
                      <div key={key.id} className="flex items-center justify-between p-4 bg-[#23232a] rounded-lg border border-gray-700">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-white">{key.name}</h3>
                            {associatedPersona && (
                              <Badge variant="outline" className="border-purple-500 text-purple-400 text-xs">
                                {associatedPersona.name}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">
                            Created: {new Date(key.created_at).toLocaleDateString()}
                          </p>
                          {key.last_used && (
                            <p className="text-sm text-gray-400">
                              Last used: {new Date(key.last_used).toLocaleDateString()}
                            </p>
                          )}
                          <p className="text-sm text-gray-400">
                            Usage: {key.usage_count}/{key.rate_limit} requests/hour
                          </p>
                          <div className="mt-2">
                            <code className="bg-[#23232a] p-2 rounded text-sm text-gray-400 font-mono border border-gray-700">
                              pk_fairness_***... (key hidden for security)
                            </code>
                          </div>
                        </div>
                        <div className="ml-4 flex items-center space-x-2">
                          <Badge 
                            variant={key.is_active ? "default" : "secondary"}
                            className={key.is_active ? "bg-green-600" : "bg-gray-700 text-gray-400"}
                          >
                            {key.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteApiKey(key.id)}
                            className="text-gray-400 hover:text-white hover:bg-gray-700/50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )})}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            <Card className="bg-[#1a1a1f]/80 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Code2 className="w-5 h-5 mr-2 text-purple-400" />
                  How to Use the API
                </CardTitle>
                <CardDescription className="text-gray-400">A simple guide to get started with our fairness-trained AI personas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white">
                      1
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-2">Generate Your API Key</h3>
                      <p className="text-gray-300 text-sm">
                        Go to the "API Keys & Personas" tab and create a new API key. Give it a descriptive name like "My Mobile App" or "Customer Service Bot". 
                        <strong className="text-yellow-400"> Save the key immediately</strong> - you'll only see it once!
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white">
                      2
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-2">Choose a Persona</h3>
                      <p className="text-gray-300 text-sm">
                        Browse available personas in the "API Keys & Personas" tab. Each persona is a specialized AI character trained for fairness and respect. 
                        Examples include fitness trainers, hotel receptionists, and more.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white">
                      3
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-2">Make API Calls</h3>
                      <p className="text-gray-300 text-sm mb-2">
                        Use your API key to chat with personas. Send a POST request to <code className="bg-[#23232a] px-2 py-1 rounded text-xs text-gray-300 border border-gray-700">http://localhost:8002/chat</code> with:
                      </p>
                      <pre className="bg-[#23232a] p-3 rounded text-xs text-green-400 overflow-x-auto border border-gray-700">
{`{
  "message": "Hello!",
  "persona_id": "persona-uuid",
  "user_demographics": {
    "age": "25",
    "role": "student"
  }
}`}
                      </pre>
                      <p className="text-gray-300 text-sm mt-2">
                        Include your API key in the Authorization header: <code className="bg-[#23232a] px-2 py-1 rounded text-xs text-gray-300 border border-gray-700">Bearer pk_fairness_...</code>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white">
                      4
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-2">What Are API Keys For?</h3>
                      <p className="text-gray-300 text-sm">
                        API keys let you integrate our fairness-trained AI personas into your own applications. Use them for customer service bots, 
                        educational platforms, health apps, or any project that needs ethical, respectful AI interactions. Each key has a rate limit of 
                        100 requests per hour to ensure fair usage.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white" 
                    onClick={() => {
                      const apiKeysTab = document.querySelector('[value="api-keys"]') as HTMLElement;
                      apiKeysTab?.click();
                    }}
                  >
                    Get Started - Generate API Key <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1a1a1f]/80 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Available Personas</CardTitle>
                <CardDescription className="text-gray-400">Browse and use these fairness-trained AI personas in your applications</CardDescription>
              </CardHeader>
              <CardContent>
                {personas.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-400">No personas available yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {personas.map((persona) => (
                      <Card key={persona.id} className="bg-[#23232a] border-gray-700">
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between text-white">
                            {persona.name}
                            <Badge variant="outline" className="border-green-500 text-green-400">
                              Fairness Trained
                            </Badge>
                          </CardTitle>
                          <CardDescription className="text-gray-400">{persona.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="p-4 bg-[#23232a] rounded-lg border border-gray-700">
                            <p className="text-sm text-gray-300 mb-2">
                              Use this persona ID in your API calls:
                            </p>
                            <div className="flex items-center space-x-2">
                              <code className="flex-1 bg-[#1a1a1f] px-3 py-2 rounded text-xs text-green-400 font-mono border border-gray-700">
                                {persona.id}
                              </code>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyPersonaId(persona.id)}
                                className="text-gray-400 hover:text-white hover:bg-gray-700/50"
                              >
                                {copiedPersonaId === persona.id ? (
                                  <CheckCircle className="w-4 h-4 text-green-400" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 