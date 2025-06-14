"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/supabaseClient"
import { Button } from "@/components/ui/button"
import { BarChart2, User, MessageCircle, Download, Activity, Users, Flag, ListChecks, PlusCircle, Pencil, Trash2, Check, X, GitBranch } from "lucide-react"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PersonaForm, PersonaFormData } from "@/components/personas/PersonaForm"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDistanceToNow } from "date-fns"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const ADMIN_EMAIL = "kyrodahero123@gmail.com"

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"]

const chartOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
    title: { display: false },
  },
  scales: {
    x: { grid: { color: "#222" }, ticks: { color: "#888" } },
    y: { grid: { color: "#222" }, ticks: { color: "#888" } },
  },
}

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("analytics")
  const [isPersonaFormOpen, setIsPersonaFormOpen] = useState(false)
  const [editingPersona, setEditingPersona] = useState<PersonaFormData | null>(null)
  const [personas, setPersonas] = useState<any[]>([])
  const [flaggedMessages, setFlaggedMessages] = useState<any[]>([])
  const [selectedFlags, setSelectedFlags] = useState<string[]>([])
  const [filterPersona, setFilterPersona] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [editingMessage, setEditingMessage] = useState<{id: string, field: string} | null>(null)
  const [editValue, setEditValue] = useState<string>("")
  const [personaVersions, setPersonaVersions] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
      if (!user || user.email !== ADMIN_EMAIL) {
        router.replace("/")
      }
    }
    getUser()
  }, [router])

  useEffect(() => {
    if (activeTab === "flagged") {
      supabase.from("flagged_messages").select("*").then(({ data }) => setFlaggedMessages(data || []))
    }
  }, [activeTab])

  // TODO: Implement persona versions functionality
  // useEffect(() => {
  //   if (activeTab === "versions") {
  //     fetchPersonaVersions();
  //   }
  // }, [activeTab]);

  // const fetchPersonaVersions = async () => {
  //   const { data, error } = await supabase
  //     .from("persona_versions")
  //     .select(`
  //       *,
  //       personas (
  //         title
  //       )
  //     `)
  //     .order("created_at", { ascending: false });

  //   if (error) {
  //     console.error("Error fetching persona versions:", error);
  //     return;
  //   }

  //   setPersonaVersions(data || []);
  // };

  // const createNewVersion = async (personaId: string) => {
  //   // Get flagged messages for the last month
  //   const oneMonthAgo = new Date();
  //   oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  //   const { data: flags, error } = await supabase
  //     .from("flagged_messages")
  //     .select("*")
  //     .gte("created_at", oneMonthAgo.toISOString())
  //     .eq("persona_id", personaId);

  //   if (error) {
  //     console.error("Error fetching flagged messages:", error);
  //     return;
  //   }

  //   // Get current version number
  //   const { data: currentVersion } = await supabase
  //     .from("persona_versions")
  //     .select("version_number")
  //     .eq("persona_id", personaId)
  //     .order("version_number", { ascending: false })
  //     .limit(1)
  //     .single();

  //   const newVersionNumber = (currentVersion?.version_number || 0) + 1;

  //   // Create new version
  //   const { error: insertError } = await supabase
  //     .from("persona_versions")
  //     .insert({
  //       persona_id: personaId,
  //       version_number: newVersionNumber,
  //       training_data: {
  //         flagged_messages: flags,
  //         metrics: {
  //           total_flags: flags.length,
  //           categories: flags.reduce((acc: any, flag) => {
  //             acc[flag.reason] = (acc[flag.reason] || 0) + 1;
  //           return acc;
  //           }, {})
  //         }
  //       },
  //       status: "draft"
  //     });

  //   if (insertError) {
  //     console.error("Error creating new version:", insertError);
  //     return;
  //   }

  //   fetchPersonaVersions();
  // };

  // const activateVersion = async (versionId: string) => {
  //   // Deactivate current active version
  //   await supabase
  //     .from("persona_versions")
  //     .update({ status: "archived" })
  //     .eq("persona_id", personaVersions.find(v => v.id === versionId)?.persona_id)
  //     .eq("status", "active");

  //   // Activate new version
  //   const { error } = await supabase
  //     .from("persona_versions")
  //     .update({ status: "active" })
  //     .eq("id", versionId);

  //   if (error) {
  //     console.error("Error activating version:", error);
  //     return;
  //   }

  //   fetchPersonaVersions();
  // };

  const filteredMessages = flaggedMessages.filter(msg => {
    const matchesPersona = filterPersona === "all" || msg.persona_title === filterPersona
    const matchesStatus = filterStatus === "all" || msg.status === filterStatus
    const matchesSearch = searchQuery === "" || 
      msg.flagged_message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.user_message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.reason.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesPersona && matchesStatus && matchesSearch
  })

  const uniquePersonas = Array.from(new Set(flaggedMessages.map(msg => msg.persona_title)))
  const uniqueStatuses = Array.from(new Set(flaggedMessages.map(msg => msg.status)))

  useEffect(() => {
    if (activeTab === "personas") {
      const fetchPersonas = async () => {
        const { data, error } = await supabase.from("personas").select("*");
        console.log("[Admin] Fetched personas:", data, error);
        setPersonas(data || []);
      };
      fetchPersonas();
    }
  }, [activeTab]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>
  }

  const handlePersonaSubmit = async (data: PersonaFormData) => {
    let avatarUrl = (editingPersona as any)?.avatarUrl || null;
    if (data.avatarImage) {
      // Upload to Supabase Storage
      const fileExt = data.avatarImage.name.split('.').pop();
      const filePath = `avatars/${data.title.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, data.avatarImage, { upsert: true });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        avatarUrl = urlData.publicUrl;
      }
    }
    if (editingPersona) {
      // Update existing persona in Supabase
      await supabase.from('personas').update({
        title: data.title,
        description: data.description,
        avatarUrl: avatarUrl,
        isActive: data.isActive,
        systemPrompt: data.systemPrompt,
      }).eq('id', editingPersona.id);
    } else {
      // Add new persona to Supabase
      await supabase.from('personas').insert({
        title: data.title,
        description: data.description,
        avatarUrl: avatarUrl,
        isActive: data.isActive,
        systemPrompt: data.systemPrompt,
      });
    }
    setIsPersonaFormOpen(false);
    setEditingPersona(null);
    // Refetch personas from Supabase
    const { data: personasData } = await supabase.from('personas').select('*');
    setPersonas(personasData || []);
  };

  const handleEditPersona = (persona: any) => {
    setEditingPersona(persona)
    setIsPersonaFormOpen(true)
  }

  const handleDeletePersona = (id: string) => {
    setPersonas(personas.filter(p => p.id !== id))
  }

  const toggleFlag = (id: string) => {
    setSelectedFlags((prev) => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const selectAllFlags = () => {
    if (selectedFlags.length === flaggedMessages.length) {
      setSelectedFlags([]);
    } else {
      setSelectedFlags(flaggedMessages.map(f => f.id));
    }
  };

  const exportSelectedFlags = () => {
    const exportData = flaggedMessages.filter(f => selectedFlags.includes(f.id)).map(f => ({
      input: f.user_message,
      demographics: f.demographics || {},
      response: f.flagged_message,
      label: f.status,
      reason: f.reason,
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flagged-messages.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Mock data for charts
  const totalUsersData = {
    labels: months,
    datasets: [
      {
        label: "Users",
        data: [400, 700, 950, 1200, 1600, 2000, 2240],
        borderColor: "#3b82f6",
        backgroundColor: "#3b82f6",
        tension: 0.4,
      },
    ],
  }
  const totalChatsData = {
    labels: months,
    datasets: [
      {
        label: "Chats",
        data: [1200, 2100, 3500, 5200, 6700, 7500, 8490],
        borderColor: "#22d3ee",
        backgroundColor: "#22d3ee",
        tension: 0.4,
      },
    ],
  }
  const downloadsData = {
    labels: months,
    datasets: [
      {
        label: "Downloads",
        data: [60, 90, 150, 210, 270, 320, 370],
        borderColor: "#a78bfa",
        backgroundColor: "#a78bfa",
        tension: 0.4,
      },
    ],
  }
  const activeUsersData = {
    labels: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "23:59"],
    datasets: [
      {
        label: "Active Users",
        data: [200, 150, 300, 600, 700, 500, 620],
        borderColor: "#fbbf24",
        backgroundColor: "#fbbf24",
        tension: 0.4,
      },
    ],
  }

  const startEditing = (id: string, field: string, value: string) => {
    setEditingMessage({ id, field });
    setEditValue(value);
  };

  const saveEdit = async () => {
    if (!editingMessage) return;
    
    const { error } = await supabase
      .from("flagged_messages")
      .update({ [editingMessage.field]: editValue })
      .eq("id", editingMessage.id);

    if (!error) {
      setFlaggedMessages(messages => 
        messages.map(msg => 
          msg.id === editingMessage.id 
            ? { ...msg, [editingMessage.field]: editValue }
            : msg
        )
      );
    }
    setEditingMessage(null);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#171717]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex space-x-2 mb-8">
          <button 
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center px-4 py-2 rounded-md ${
              activeTab === "analytics" 
                ? "bg-[#23272f] text-white font-medium border border-[#23272f]" 
                : "text-gray-400 hover:text-white border border-transparent hover:border-[#23272f]"
            }`}
          >
            <BarChart2 className="w-4 h-4 mr-2" /> Analytics
          </button>
          <button 
            onClick={() => setActiveTab("personas")}
            className={`flex items-center px-4 py-2 rounded-md ${
              activeTab === "personas" 
                ? "bg-[#23272f] text-white font-medium border border-[#23272f]" 
                : "text-gray-400 hover:text-white border border-transparent hover:border-[#23272f]"
            }`}
          >
            <Users className="w-4 h-4 mr-2" /> Manage Personas
          </button>
          <button 
            onClick={() => setActiveTab("surveys")}
            className={`flex items-center px-4 py-2 rounded-md ${
              activeTab === "surveys" 
                ? "bg-[#23272f] text-white font-medium border border-[#23272f]" 
                : "text-gray-400 hover:text-white border border-transparent hover:border-[#23272f]"
            }`}
          >
            <ListChecks className="w-4 h-4 mr-2" /> Survey Results
          </button>
          <button 
            onClick={() => setActiveTab("flagged")}
            className={`flex items-center px-4 py-2 rounded-md ${
              activeTab === "flagged" 
                ? "bg-[#23272f] text-white font-medium border border-[#23272f]" 
                : "text-gray-400 hover:text-white border border-transparent hover:border-[#23272f]"
            }`}
          >
            <Flag className="w-4 h-4 mr-2" /> Flagged Responses
          </button>
          <button 
            onClick={() => setActiveTab("versions")}
            className={`flex items-center px-4 py-2 rounded-md ${
              activeTab === "versions" 
                ? "bg-[#23272f] text-white font-medium border border-[#23272f]" 
                : "text-gray-400 hover:text-white border border-transparent hover:border-[#23272f]"
            }`}
          >
            <GitBranch className="w-4 h-4 mr-2" /> Versions
          </button>
        </div>

        {/* Content based on active tab */}
        {activeTab === "analytics" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Total Users */}
            <div className="bg-[#20232a] rounded-xl p-6 shadow flex flex-col min-h-[260px]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <User className="w-6 h-6 text-blue-400 bg-blue-900/30 rounded-full p-1" />
                  <div>
                    <div className="text-white font-semibold">Total Users</div>
                    <div className="text-xs text-gray-400">User Growth Overtime</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">2,240</div>
              </div>
              <div className="flex-1"><Line data={totalUsersData} options={chartOptions} /></div>
            </div>
            {/* Total Chats */}
            <div className="bg-[#20232a] rounded-xl p-6 shadow flex flex-col min-h-[260px]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <MessageCircle className="w-6 h-6 text-green-400 bg-green-900/30 rounded-full p-1" />
                  <div>
                    <div className="text-white font-semibold">Total Chats</div>
                    <div className="text-xs text-gray-400">Conversation Started</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">8,490</div>
              </div>
              <div className="flex-1"><Line data={totalChatsData} options={chartOptions} /></div>
            </div>
            {/* Downloads */}
            <div className="bg-[#20232a] rounded-xl p-6 shadow flex flex-col min-h-[260px]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Download className="w-6 h-6 text-purple-400 bg-purple-900/30 rounded-full p-1" />
                  <div>
                    <div className="text-white font-semibold">Downloads</div>
                    <div className="text-xs text-gray-400">Persona Exports in Total</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">370</div>
              </div>
              <div className="flex-1"><Line data={downloadsData} options={chartOptions} /></div>
            </div>
            {/* Active Users */}
            <div className="bg-[#20232a] rounded-xl p-6 shadow flex flex-col min-h-[260px]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Activity className="w-6 h-6 text-yellow-400 bg-yellow-900/30 rounded-full p-1" />
                  <div>
                    <div className="text-white font-semibold">Active Users</div>
                    <div className="text-xs text-gray-400">In the last 24 Hours</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">620</div>
              </div>
              <div className="flex-1"><Line data={activeUsersData} options={chartOptions} /></div>
            </div>
          </div>
        )}

        {activeTab === "personas" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-white">Manage Personas</h1>
              <Button onClick={() => setIsPersonaFormOpen(true)}>
                <PlusCircle className="w-4 h-4 mr-2" /> Add Persona
              </Button>
            </div>
            <Card className="bg-[#20232a] border-[#23272f]">
              <CardHeader>
                <CardTitle className="text-white">Personas</CardTitle>
                <CardDescription className="text-gray-400">
                  Create and manage your AI personas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-gray-400">Avatar</TableHead>
                      <TableHead className="text-gray-400">Title</TableHead>
                      <TableHead className="text-gray-400">Description</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                      <TableHead className="text-gray-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {personas.map(persona => (
                      <TableRow key={persona.id} className="hover:bg-[#23272f]/40 transition-colors">
                        <TableCell>
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center overflow-hidden">
                            {persona.avatarUrl ? (
                              <img src={persona.avatarUrl} alt={persona.title} className="w-10 h-10 object-cover rounded-full" />
                            ) : (
                              <span className="text-lg font-bold text-white">{persona.title?.[0] || "?"}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-white">{persona.title}</TableCell>
                        <TableCell className="text-gray-300">{persona.description}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            persona.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {persona.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEditPersona(persona)}
                              className="hover:bg-blue-500/10"
                              aria-label="Edit Persona"
                            >
                              <Pencil className="h-4 w-4 text-blue-400" />
                            </Button>
                            {/* TODO: Implement persona versions functionality */}
                            {/* <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => createNewVersion(persona.id)}
                              className="hover:bg-purple-500/10"
                              aria-label="Create Version"
                            >
                              <GitBranch className="h-4 w-4 text-purple-400" />
                            </Button> */}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="hover:bg-red-500/10"
                              onClick={() => handleDeletePersona(persona.id)}
                              aria-label="Delete Persona"
                            >
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "flagged" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-white">Flagged Responses</h1>
            </div>
            <Card className="bg-[#20232a] border-[#23272f]">
              <CardHeader>
                <CardTitle className="text-white">Flagged Messages</CardTitle>
                <CardDescription className="text-gray-400">
                  Review flagged chatbot responses. Select and moderate for training data improvement.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-gray-400">Persona</TableHead>
                      <TableHead className="text-gray-400">Severity</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                      <TableHead className="text-gray-400">Reason</TableHead>
                      <TableHead className="text-gray-400">Flagged Response</TableHead>
                      <TableHead className="text-gray-400">Context</TableHead>
                      <TableHead className="text-gray-400">Reporter Info</TableHead>
                      <TableHead className="text-gray-400">Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMessages.map(msg => (
                      <TableRow key={msg.id}>
                        <TableCell>{msg.persona_title}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded-full text-xs bg-red-600/20 text-red-400 font-bold">HIGH</span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            msg.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            msg.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {msg.status.charAt(0).toUpperCase() + msg.status.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-red-400 font-medium">{msg.reason}</span>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs text-sm">{msg.content}</div>
                        </TableCell>
                        <TableCell>
                          <div className="bg-[#18181b] rounded px-2 py-1 text-xs text-gray-200">{msg.context}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-gray-400">
                            Email: {msg.reporter?.email || 'N/A'}<br/>
                            Previous Reports: {msg.reporter?.previous_reports ?? 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(msg.created_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredMessages.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-gray-400 py-4">
                          No flagged messages found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "versions" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-white">Persona Versions</h1>
            </div>
            <Card className="bg-[#20232a] border-[#23272f]">
              <CardHeader>
                <CardTitle className="text-white">Version History</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage and review persona versions based on collected feedback
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-gray-400">Persona</TableHead>
                      <TableHead className="text-gray-400">Version</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                      <TableHead className="text-gray-400">Created</TableHead>
                      <TableHead className="text-gray-400">Metrics</TableHead>
                      <TableHead className="text-gray-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {personaVersions.map(version => (
                      <TableRow key={version.id}>
                        <TableCell>{version.personas.title}</TableCell>
                        <TableCell>v{version.version_number}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            version.status === 'active' ? 'bg-green-500/20 text-green-400' :
                            version.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {version.status}
                          </span>
                        </TableCell>
                        <TableCell>{formatDistanceToNow(new Date(version.created_at))} ago</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>Flags: {version.training_data.metrics.total_flags}</div>
                            <div className="text-gray-400 text-xs">
                              {Object.entries(version.training_data.metrics.categories)
                                .map(([category, count]) => `${category}: ${count}`)
                                .join(', ')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {/* TODO: Implement persona versions functionality */}
                            {/* {version.status === 'draft' && (
                              <Button
                                size="sm"
                                onClick={() => activateVersion(version.id)}
                              >
                                Activate
                              </Button>
                            )} */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const blob = new Blob(
                                  [JSON.stringify(version.training_data, null, 2)],
                                  { type: "application/json" }
                                );
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `${version.personas.title}-v${version.version_number}.json`;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                            >
                              Export
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Persona Form Dialog */}
        <PersonaForm
          isOpen={isPersonaFormOpen}
          onClose={() => {
            setIsPersonaFormOpen(false)
            setEditingPersona(null)
          }}
          onSubmit={handlePersonaSubmit}
          initialData={editingPersona || undefined}
        />
      </div>
    </div>
  )
} 