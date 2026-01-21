"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Code2, 
  Key, 
  Copy, 
  Shield, 
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
  key?: string | null; // Full API key (may be null for old keys or when not available)
  created_at: string;
  last_used?: string;
  usage_count: number;
  rate_limit: number;
  is_active: boolean;
  permissions?: string[];
  persona_id?: string | null;
  custom_context?: string | null;
}

export default function DeveloperPortal() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedPersona, setSelectedPersona] = useState<string>("");
  const [customContext, setCustomContext] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [editingContext, setEditingContext] = useState<string | null>(null);
  const [editingContextValue, setEditingContextValue] = useState("");

  useEffect(() => {
    if (user) {
      let isMounted = true;
      
      const loadData = async () => {
        await fetchPersonas();
        if (isMounted) {
          await fetchApiKeys();
        }
      };
      
      loadData();
      
      return () => {
        isMounted = false;
      };
    }
  }, [user]);

  const fetchPersonas = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Fetch personas timeout')), 10000)
      );
      
      const queryPromise = supabase.from("personas").select("*").eq("is_active", true);
      const { data } = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      if (data) {
        setPersonas(data.map((p: any) => ({
          id: p.id,
          name: p.title,
          description: p.description || "",
          system_prompt: p.system_prompt || ""
        })));
      } else {
        setPersonas([]);
      }
    } catch (error) {
      console.error("Error fetching personas:", error);
      setPersonas([]);
    }
  };

  const fetchApiKeys = async () => {
    if (!user) return;
    
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Fetch API keys timeout')), 10000)
      );
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setApiKeys([]);
        return;
      }

      const fetchPromise = fetch("/api/api-keys", {
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

      if (response.ok) {
        const { apiKeys } = await response.json();
        setApiKeys(apiKeys || []);
      } else {
        setApiKeys([]);
      }
    } catch (error) {
      console.error("Error fetching API keys:", error);
      setApiKeys([]);
    }
  };

  const generateApiKey = async () => {
    if (!requireAuth()) return;

    if (!newKeyName.trim()) {
      setSubmitMessage("Please enter a name for your API key");
      return;
    }

    if (!selectedPersona) {
      setSubmitMessage("Please select a persona for your API key");
      return;
    }

    setIsGenerating(true);
    setSubmitMessage("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
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
          persona_id: selectedPersona,
          custom_context: customContext.trim() || null
        })
      });

      const data = await response.json();

      if (response.ok) {
        setGeneratedKey(data.api_key);
        setNewKeyName("");
        setSelectedPersona("");
        setCustomContext("");
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
    if (!requireAuth()) return;

    if (!confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

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

  // Helper function to mask API key for display
  const maskApiKey = (key: string | null | undefined): string => {
    if (!key) return "pk_fairness_***... (key hidden for security)";
    if (key.length <= 12) return key; // Don't mask very short keys
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const updateCustomContext = async (keyId: string) => {
    if (!requireAuth()) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/api-keys", {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          keyId,
          custom_context: editingContextValue
        })
      });

      if (response.ok) {
        await fetchApiKeys();
        setEditingContext(null);
        setEditingContextValue("");
        setSubmitMessage("Custom context updated successfully");
      } else {
        const data = await response.json();
        setSubmitMessage(data.error || "Failed to update custom context");
      }
    } catch (error: any) {
      setSubmitMessage(`Error: ${error.message}`);
    }
  };

  const startEditingContext = (key: APIKey) => {
    setEditingContext(key.id);
    setEditingContextValue(key.custom_context || "");
  };

  const cancelEditingContext = () => {
    setEditingContext(null);
    setEditingContextValue("");
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

  const requireAuth = () => {
    if (!user) {
      router.push("/login");
      return false;
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f10] via-[#1a1a1f] to-[#23232a] text-white">
      <div className="container mx-auto p-6 max-w-5xl relative z-10">
        <div className="mb-6">
          <div className="mb-4">
            <h1 className="text-3xl font-bold mb-2 text-white">Developer Portal</h1>
            <p className="text-gray-400">Integrate ethical AI personas into your applications. Export configurations, generate API keys, and build with fairness-trained models.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-12">
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
            <TabsTrigger value="overview" className="text-white data-[state=active]:bg-white data-[state=active]:text-[#23232a] data-[state=active]:font-semibold">Getting Started</TabsTrigger>
            <TabsTrigger value="api-keys" className="text-white data-[state=active]:bg-white data-[state=active]:text-[#23232a] data-[state=active]:font-semibold">API Keys & Personas</TabsTrigger>
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
                  <Label htmlFor="persona" className="text-gray-300">Select Persona <span className="text-red-400">*</span></Label>
                  <Select value={selectedPersona} onValueChange={setSelectedPersona} required>
                    <SelectTrigger className="bg-[#23232a] border-gray-700 text-white">
                      <SelectValue placeholder="Choose a persona..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#23232a] border-gray-700 [&_*]:text-white">
                      {personas.map((persona) => (
                        <SelectItem 
                          key={persona.id} 
                          value={persona.id}
                          className="text-white !text-white hover:bg-[#1a1a1f] focus:bg-[#1a1a1f] focus:text-white focus:!text-white data-[highlighted]:bg-[#1a1a1f] data-[highlighted]:text-white data-[highlighted]:!text-white cursor-pointer [&>span]:text-white"
                        >
                          {persona.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-400">
                    Each API key is tied to a specific persona. You'll need to generate separate keys for different personas.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customContext" className="text-gray-300">Custom Context (Optional)</Label>
                  <Textarea
                    id="customContext"
                    placeholder="e.g., Hospital Name: General Hospital, Services: Emergency, Cardiology, Pediatrics, Policies: 24/7 emergency care available..."
                    value={customContext}
                    onChange={(e) => setCustomContext(e.target.value)}
                    className="bg-[#23232a] border-gray-700 text-white placeholder:text-gray-500 min-h-[100px]"
                    rows={4}
                  />
                  <p className="text-sm text-gray-400">
                    Add custom knowledge or information specific to your use case. This will be included in the AI's system prompt. 
                    For example, if using a doctor persona, you can add your hospital name, services, policies, etc.
                  </p>
                </div>
                <Button 
                  onClick={() => {
                    if (!requireAuth()) return;
                    generateApiKey();
                  }} 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white" 
                  disabled={isGenerating || !newKeyName.trim() || !selectedPersona}
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
                          <div className="mt-2 flex items-center gap-2">
                            <code className="flex-1 bg-[#23232a] p-2 rounded text-sm text-gray-400 font-mono border border-gray-700">
                              {maskApiKey(key.key)}
                            </code>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (key.key) {
                                  copyToClipboard(key.key);
                                } else {
                                  setSubmitMessage("API key not available. Please generate a new key.");
                                }
                              }}
                              className="text-gray-400 hover:text-white hover:bg-gray-700/50"
                              title="Copy full API key"
                              disabled={!key.key}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          {editingContext === key.id ? (
                            <div className="mt-3 space-y-2">
                              <Label className="text-gray-300 text-sm">Custom Context</Label>
                              <Textarea
                                value={editingContextValue}
                                onChange={(e) => setEditingContextValue(e.target.value)}
                                placeholder="Add custom knowledge or information specific to your use case..."
                                className="bg-[#1a1a1f] border-gray-700 text-white placeholder:text-gray-500 min-h-[80px] text-sm"
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => updateCustomContext(key.id)}
                                  className="bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={cancelEditingContext}
                                  className="text-gray-400 hover:text-white"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEditingContext(key)}
                                className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20 text-xs h-7 border border-purple-500/30"
                              >
                                {key.custom_context ? "Edit Custom Context" : "Add Custom Context"}
                              </Button>
                              {key.custom_context && (
                                <p className="text-xs text-gray-500 mt-1 italic">
                                  Custom context is set
                                </p>
                              )}
                            </div>
                          )}
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
                      <h3 className="font-semibold text-white mb-2">Select a Persona</h3>
                      <p className="text-gray-300 text-sm">
                        When generating your API key, you'll need to select a specific persona. Each API key is tied to one persona, 
                        so you'll need separate keys for different personas. The persona ID is embedded in your API key, so you don't need to specify it in your requests.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white">
                      3
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-2">Make API Calls</h3>
                      <p className="text-gray-300 text-sm mb-3">
                        Use your API key to make requests to our chat endpoint. Include your API key in the <code className="bg-[#23232a] px-1.5 py-0.5 rounded text-xs">Authorization</code> header.
                      </p>
                      
                      <div className="bg-[#23232a] p-4 rounded-lg border border-gray-700 mb-3">
                        <p className="text-xs text-gray-400 mb-2 font-semibold">Endpoint:</p>
                        <code className="text-green-400 text-sm">POST https://ramahai.vercel.app/api/v1/chat</code>
                      </div>

                      <div className="bg-[#23232a] p-4 rounded-lg border border-gray-700 mb-3">
                        <p className="text-xs text-gray-400 mb-2 font-semibold">Example Request (cURL) - Linux/Mac/Git Bash:</p>
                        <p className="text-xs text-gray-500 mb-2">Copy and paste this into your terminal. Replace <code className="bg-[#1a1a1f] px-1 rounded">sk_your_api_key_here</code> with your actual API key.</p>
                        <pre className="text-xs text-gray-300 overflow-x-auto">
{`curl -X POST https://ramahai.vercel.app/api/v1/chat \\
  -H "Authorization: Bearer sk_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Hello! Can you introduce yourself?",
    "conversation_history": [],
    "temperature": 0.7,
    "max_tokens": 200
  }'`}
                        </pre>
                        <p className="text-xs text-gray-500 mt-2">
                          <strong>How it works:</strong> <code className="bg-[#1a1a1f] px-1 rounded">-X POST</code> sets the HTTP method, 
                          <code className="bg-[#1a1a1f] px-1 rounded">-H</code> adds headers (your API key and content type), 
                          <code className="bg-[#1a1a1f] px-1 rounded">-d</code> sends the JSON data.
                        </p>
                      </div>

                      <div className="bg-[#23232a] p-4 rounded-lg border border-gray-700 mb-3">
                        <p className="text-xs text-gray-400 mb-2 font-semibold">Example Request (PowerShell) - Windows:</p>
                        <p className="text-xs text-gray-500 mb-2">Run these commands in PowerShell. Replace <code className="bg-[#1a1a1f] px-1 rounded">sk_your_api_key_here</code> with your actual API key.</p>
                        <pre className="text-xs text-gray-300 overflow-x-auto">
{`$apiKey = "sk_your_api_key_here"
$url = "https://ramahai.vercel.app/api/v1/chat"

$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

$body = @{
    message = "Hello! Can you introduce yourself?"
    conversation_history = @()
    temperature = 0.7
    max_tokens = 200
} | ConvertTo-Json

Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body $body`}
                        </pre>
                      </div>

                      <div className="bg-[#23232a] p-4 rounded-lg border border-gray-700 mb-3">
                        <p className="text-xs text-gray-400 mb-2 font-semibold">Example Request (JavaScript/Node.js):</p>
                        <pre className="text-xs text-gray-300 overflow-x-auto">
{`const response = await fetch('https://ramahai.vercel.app/api/v1/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_your_api_key_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'Hello! Can you introduce yourself?',
    conversation_history: [],
    temperature: 0.7,
    max_tokens: 200
  })
});

const data = await response.json();
console.log(data.response);`}
                        </pre>
                      </div>

                      <div className="bg-[#23232a] p-4 rounded-lg border border-gray-700 mb-3">
                        <p className="text-xs text-gray-400 mb-2 font-semibold">Example Request (Python):</p>
                        <pre className="text-xs text-gray-300 overflow-x-auto">
{`import requests

api_key = "sk_your_api_key_here"
url = "https://ramahai.vercel.app/api/v1/chat"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

data = {
    "message": "Hello! Can you introduce yourself?",
    "conversation_history": [],
    "temperature": 0.7,
    "max_tokens": 200
}

response = requests.post(url, json=data, headers=headers)
print(response.json())`}
                        </pre>
                      </div>

                      <div className="bg-[#23232a] p-4 rounded-lg border border-gray-700">
                        <p className="text-xs text-gray-400 mb-2 font-semibold">Example Response:</p>
                        <pre className="text-xs text-gray-300 overflow-x-auto">
{`{
  "response": "Hello! How can I help you today?",
  "model": "gemini-2.0-flash",
  "persona": {
    "id": "...",
    "name": "Hotel Receptionist"
  },
  "usage": {
    "remaining": 99,
    "limit": 100
  },
  "metadata": {
    "processing_time_ms": 1234,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}`}
                        </pre>
                      </div>

                      <p className="text-gray-300 text-sm mt-3">
                        <strong className="text-yellow-400">Note:</strong> The persona is automatically determined from your API key. You don't need to specify it in your requests. Rate limit: 100 requests per hour per key.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white">
                      4
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-2">Maintain Conversation Context</h3>
                      <p className="text-gray-300 text-sm mb-3">
                        To maintain conversation context, include the conversation history in your requests. The AI will remember previous messages in the conversation.
                      </p>
                      <div className="bg-[#23232a] p-4 rounded-lg border border-gray-700">
                        <pre className="text-xs text-gray-300 overflow-x-auto">
{`{
  "message": "What did I say earlier?",
  "conversation_history": [
    { "role": "user", "content": "My name is John" },
    { "role": "assistant", "content": "Nice to meet you, John!" }
  ],
  "temperature": 0.7,
  "max_tokens": 200
}`}
                        </pre>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white">
                      5
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-2">What Are API Keys For?</h3>
                      <p className="text-gray-300 text-sm">
                        API keys let you integrate our fairness-trained AI personas into your own applications. Use them for customer service bots, 
                        educational platforms, health apps, or any project that needs ethical, respectful AI interactions. Each key has a rate limit of 
                        100 requests per hour to ensure fair usage. <strong className="text-yellow-400">You use our AI models</strong> - no need to set up your own!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white" 
                    onClick={() => {
                      if (!requireAuth()) return;
                      const apiKeysTab = document.querySelector('[value="api-keys"]') as HTMLElement;
                      apiKeysTab?.click();
                    }}
                  >
                    {user ? "Get Started - Generate API Key" : "Login to Get Started"} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 