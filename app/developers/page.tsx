"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Code2, 
  Key, 
  Download, 
  Copy, 
  ExternalLink, 
  Zap, 
  Shield, 
  Users,
  ArrowRight,
  CheckCircle
} from "lucide-react";
import { useUser } from "@/components/UserContext";
import { useRouter } from "next/navigation";

interface APIKey {
  id: string;
  name: string;
  key: string;
  created: string;
  usage: number;
  limit: number;
}

interface Persona {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
}

export default function DeveloperPortal() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [copiedKey, setCopiedKey] = useState("");

  useEffect(() => {
    if (user) {
      setApiKeys([]);
      setPersonas([
        {
          id: "fitness-trainer",
          name: "Fitness Trainer",
          description: "Energetic fitness professional focused on health and motivation",
          system_prompt: "You are a professional fitness trainer..."
        },
        {
          id: "hotel-receptionist", 
          name: "Hotel Receptionist",
          description: "Professional hospitality expert focused on guest satisfaction",
          system_prompt: "You are a friendly, professional hotel receptionist..."
        }
      ]);
    }
  }, [user]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
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

  const generateAPIKey = () => {
    if (!newKeyName.trim()) return;
    
    const newKey: APIKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: `pk_fairness_${Math.random().toString(36).substring(2, 34)}`,
      created: new Date().toISOString().split('T')[0],
      usage: 0,
      limit: 100
    };
    
    setApiKeys([...apiKeys, newKey]);
    setNewKeyName("");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(""), 2000);
  };

  const exportPersona = (persona: Persona) => {
    const exportData = {
      persona: {
        id: persona.id,
        name: persona.name,
        description: persona.description,
        system_prompt: persona.system_prompt
      },
      usage_guide: {
        api_endpoint: "http://localhost:8002/chat",
        example_request: {
          message: "Hello!",
          persona_id: persona.id,
          user_demographics: { age: "25", role: "student" }
        }
      },
      model_info: {
        base_model: "llama3.1:8b-instruct-q4_0",
        fairness_training: true,
        memory_usage: "~4.7GB"
      }
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${persona.id}-config.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#171717] text-white">
      <div className="container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Code2 className="w-8 h-8 text-blue-400 mr-3" />
            <h1 className="text-4xl font-bold">Developer Portal</h1>
            <Badge variant="secondary" className="ml-3 bg-blue-600">Beta</Badge>
          </div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Integrate ethical AI personas into your applications. Export configurations, 
            generate API keys, and build with fairness-trained models.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-[#23232a] border-gray-600">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Key className="w-8 h-8 text-blue-400 mr-3" />
                <div>
                  <div className="text-2xl font-bold">{apiKeys.length}</div>
                  <div className="text-gray-400">API Keys</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#23232a] border-gray-600">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-green-400 mr-3" />
                <div>
                  <div className="text-2xl font-bold">{personas.length}</div>
                  <div className="text-gray-400">Available Personas</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#23232a] border-gray-600">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Shield className="w-8 h-8 text-green-400 mr-3" />
                <div>
                  <div className="text-2xl font-bold">100%</div>
                  <div className="text-gray-400">Fairness Trained</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-[#23232a]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="personas">Export Personas</TabsTrigger>
            <TabsTrigger value="docs">Documentation</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-[#23232a] border-gray-600">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-yellow-400" />
                    Quick Start
                  </CardTitle>
                  <CardDescription>Get up and running in 5 minutes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span>Generate your API key</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span>Export a persona configuration</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span>Make your first API call</span>
                  </div>
                  <Button className="w-full mt-4" variant="outline">
                    View Full Guide <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-[#23232a] border-gray-600">
                <CardHeader>
                  <CardTitle>Example Integration</CardTitle>
                  <CardDescription>Python example using our API</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-black p-4 rounded-lg font-mono text-sm text-left">
                    <div className="text-green-400"># Install requests</div>
                    <div className="text-gray-300">pip install requests</div>
                    <br />
                    <div className="text-green-400"># Use the API</div>
                    <div>
                      <span className="text-blue-400">import</span>{" "}
                      <span className="text-gray-300">requests</span>
                    </div>
                    <br />
                    <div className="text-gray-300">response = requests.post(</div>
                    <div className="text-yellow-400 ml-4">&quot;http://localhost:8002/chat&quot;,</div>
                    <div className="text-gray-300 ml-4">
                      json=&#123;&quot;message&quot;: &quot;Hello!&quot;, &quot;persona_id&quot;: &quot;fitness-trainer&quot;&#125;
                    </div>
                    <div className="text-gray-300">)</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="api-keys" className="space-y-6">
            <Card className="bg-[#23232a] border-gray-600">
              <CardHeader>
                <CardTitle>Generate New API Key</CardTitle>
                <CardDescription>Create a new API key for your project</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="keyName">Project Name</Label>
                  <Input
                    id="keyName"
                    placeholder="My Awesome Project"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="bg-[#171717] border-gray-600"
                  />
                </div>
                <Button onClick={generateAPIKey} className="w-full">
                  <Key className="w-4 h-4 mr-2" />
                  Generate API Key
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-[#23232a] border-gray-600">
              <CardHeader>
                <CardTitle>Your API Keys</CardTitle>
                <CardDescription>Manage your existing API keys</CardDescription>
              </CardHeader>
              <CardContent>
                {apiKeys.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No API keys yet. Generate your first one above!</p>
                ) : (
                  <div className="space-y-4">
                    {apiKeys.map((key) => (
                      <div key={key.id} className="flex items-center justify-between p-4 bg-[#171717] rounded-lg">
                        <div>
                          <h3 className="font-semibold">{key.name}</h3>
                          <p className="text-sm text-gray-400">Created: {key.created}</p>
                          <p className="text-sm text-gray-400">Usage: {key.usage}/{key.limit} requests</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <code className="bg-black p-2 rounded text-sm">
                            {key.key.substring(0, 16)}...
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(key.key)}
                          >
                            {copiedKey === key.key ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="personas" className="space-y-6">
            <Card className="bg-[#23232a] border-gray-600">
              <CardHeader>
                <CardTitle>Available Personas</CardTitle>
                <CardDescription>Export persona configurations for use in your applications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {personas.map((persona) => (
                    <Card key={persona.id} className="bg-[#171717] border-gray-600">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          {persona.name}
                          <Badge variant="outline" className="border-green-500 text-green-400">
                            Fairness Trained
                          </Badge>
                        </CardTitle>
                        <CardDescription>{persona.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => exportPersona(persona)}
                          className="w-full"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export Configuration
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="docs" className="space-y-6">
            <Card className="bg-[#23232a] border-gray-600">
              <CardHeader>
                <CardTitle>Documentation & Resources</CardTitle>
                <CardDescription>Everything you need to integrate our API</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <a 
                    href="http://localhost:8002/docs" 
                    target="_blank"
                    className="flex items-center justify-center h-20 border border-gray-600 rounded-lg hover:bg-[#171717] transition-colors"
                  >
                    <div className="text-center">
                      <ExternalLink className="w-6 h-6 mb-2 mx-auto" />
                      <div>API Reference</div>
                    </div>
                  </a>
                  <a 
                    href="/PERSONA_API_GUIDE.md" 
                    target="_blank"
                    className="flex items-center justify-center h-20 border border-gray-600 rounded-lg hover:bg-[#171717] transition-colors"
                  >
                    <div className="text-center">
                      <Code2 className="w-6 h-6 mb-2 mx-auto" />
                      <div>Integration Guide</div>
                    </div>
                  </a>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 