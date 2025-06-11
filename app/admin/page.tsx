"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/supabaseClient"
import { Button } from "@/components/ui/button"
import { BarChart2, User, MessageCircle, Download, Activity, Users, Flag, ListChecks, PlusCircle, Pencil, Trash2, Check, X } from "lucide-react"
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

// Mock data for personas
const initialPersonas = [
  {
    id: "hotel-receptionist",
    title: "Hotel Receptionist",
    description: "A friendly and professional hotel receptionist ready to assist with your stay",
    avatarFallback: "HR",
    isActive: true,
  },
]

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("analytics")
  const [isPersonaFormOpen, setIsPersonaFormOpen] = useState(false)
  const [editingPersona, setEditingPersona] = useState<PersonaFormData | null>(null)
  const [personas, setPersonas] = useState(initialPersonas)
  const [flaggedMessages, setFlaggedMessages] = useState<any[]>([])
  const [selectedFlags, setSelectedFlags] = useState<string[]>([])
  const [filterPersona, setFilterPersona] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [editingMessage, setEditingMessage] = useState<{id: string, field: string} | null>(null)
  const [editValue, setEditValue] = useState<string>("")
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>
  }

  const handlePersonaSubmit = async (data: PersonaFormData) => {
    let trainingDataUrl = data.trainingDataFile ? null : ((editingPersona as any)?.training_data_url || null);
    if (data.trainingDataFile) {
      // Upload to Supabase Storage
      const fileExt = data.trainingDataFile.name.split('.').pop();
      const filePath = `training-data/${data.title.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('training-data').upload(filePath, data.trainingDataFile, { upsert: true });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('training-data').getPublicUrl(filePath);
        trainingDataUrl = urlData.publicUrl;
      }
    }
    if (editingPersona) {
      // Update existing persona in Supabase
      await supabase.from('personas').update({
        title: data.title,
        description: data.description,
        avatarFallback: data.avatarFallback,
        isActive: data.isActive,
        systemPrompt: data.systemPrompt,
        training_data_url: trainingDataUrl,
      }).eq('id', editingPersona.id);
    } else {
      // Add new persona to Supabase
      await supabase.from('personas').insert({
        title: data.title,
        description: data.description,
        avatarFallback: data.avatarFallback,
        isActive: data.isActive,
        systemPrompt: data.systemPrompt,
        training_data_url: trainingDataUrl,
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
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Persona
              </Button>
            </div>

            <Card className="bg-[#20232a] border-[#23272f]">
              <CardHeader>
                <CardTitle className="text-white">Personas List</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage your chat personas. You can add, edit, or remove personas here.
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
                      <TableHead className="text-right text-gray-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {personas.map((persona) => (
                      <TableRow key={persona.id}>
                        <TableCell>
                          <div className="w-10 h-10 rounded-full bg-[#23272f] flex items-center justify-center text-white">
                            {persona.avatarFallback}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-white">{persona.title}</TableCell>
                        <TableCell className="text-gray-400">{persona.description}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              persona.isActive
                                ? "bg-green-900/30 text-green-400"
                                : "bg-red-900/30 text-red-400"
                            }`}
                          >
                            {persona.isActive ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditPersona(persona)}
                            >
                              <Pencil className="h-4 w-4 text-gray-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePersona(persona.id)}
                            >
                              <Trash2 className="h-4 w-4 text-gray-400" />
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
              <Button onClick={exportSelectedFlags} disabled={selectedFlags.length === 0}>
                Export Selected as JSON
              </Button>
            </div>
            <Card className="bg-[#20232a] border-[#23272f]">
              <CardHeader>
                <CardTitle className="text-white">Flagged Messages</CardTitle>
                <CardDescription className="text-gray-400">
                  Review flagged chatbot responses. Select and export for training data improvement.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search messages..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-[#23232a] text-white"
                    />
                  </div>
                  <Select value={filterPersona} onValueChange={setFilterPersona}>
                    <SelectTrigger className="w-[180px] bg-[#23232a] text-white">
                      <SelectValue placeholder="Filter by persona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Personas</SelectItem>
                      {uniquePersonas.map(persona => (
                        <SelectItem key={persona} value={persona}>{persona}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[180px] bg-[#23232a] text-white">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {uniqueStatuses.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><Checkbox checked={selectedFlags.length === filteredMessages.length && filteredMessages.length > 0} onCheckedChange={selectAllFlags} /></TableHead>
                      <TableHead className="text-gray-400">Persona</TableHead>
                      <TableHead className="text-gray-400">Flagged Response</TableHead>
                      <TableHead className="text-gray-400">User Message</TableHead>
                      <TableHead className="text-gray-400">Reason</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMessages.map((msg) => (
                      <TableRow key={msg.id}>
                        <TableCell><Checkbox checked={selectedFlags.includes(msg.id)} onCheckedChange={() => toggleFlag(msg.id)} /></TableCell>
                        <TableCell>{msg.persona_title}</TableCell>
                        <TableCell className="max-w-xs truncate" title={msg.flagged_message}>{msg.flagged_message}</TableCell>
                        <TableCell className="max-w-xs truncate" title={msg.user_message}>{msg.user_message}</TableCell>
                        <TableCell>
                          {editingMessage?.id === msg.id && editingMessage.field === "reason" ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="h-8 bg-[#23232a] text-white"
                              />
                              <Button size="sm" variant="ghost" onClick={saveEdit} className="h-8 w-8 p-0">
                                <Check className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-8 w-8 p-0">
                                <X className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ) : (
                            <div 
                              className="cursor-pointer hover:bg-[#23232a] p-1 rounded"
                              onClick={() => startEditing(msg.id, "reason", msg.reason)}
                            >
                              {msg.reason}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingMessage?.id === msg.id && editingMessage.field === "status" ? (
                            <div className="flex items-center gap-2">
                              <Select value={editValue} onValueChange={setEditValue}>
                                <SelectTrigger className="h-8 w-[120px] bg-[#23232a] text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="reviewed">Reviewed</SelectItem>
                                  <SelectItem value="resolved">Resolved</SelectItem>
                                  <SelectItem value="dismissed">Dismissed</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button size="sm" variant="ghost" onClick={saveEdit} className="h-8 w-8 p-0">
                                <Check className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-8 w-8 p-0">
                                <X className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ) : (
                            <div 
                              className="cursor-pointer hover:bg-[#23232a] p-1 rounded"
                              onClick={() => startEditing(msg.id, "status", msg.status)}
                            >
                              {msg.status}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredMessages.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-400 py-4">
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