"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/supabaseClient"
import { Button } from "@/components/ui/button"
import BlackHeader from "@/components/BlackHeader"
import { BarChart2, User, MessageCircle, Download, Activity, Users, Flag, ListChecks } from "lucide-react"
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>
  }

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

  return (
    <div className="min-h-screen bg-[#171717]">
      <BlackHeader />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex space-x-2 mb-8">
          <button className="flex items-center px-4 py-2 rounded-md bg-[#23272f] text-white font-medium border border-[#23272f] focus:outline-none focus:ring-2 focus:ring-blue-500">
            <BarChart2 className="w-4 h-4 mr-2" /> Analytics
          </button>
          <button className="flex items-center px-4 py-2 rounded-md text-gray-400 hover:text-white border border-transparent hover:border-[#23272f]">
            <Users className="w-4 h-4 mr-2" /> Manage Persona
          </button>
          <button className="flex items-center px-4 py-2 rounded-md text-gray-400 hover:text-white border border-transparent hover:border-[#23272f]">
            <ListChecks className="w-4 h-4 mr-2" /> Survey Results
          </button>
          <button className="flex items-center px-4 py-2 rounded-md text-gray-400 hover:text-white border border-transparent hover:border-[#23272f]">
            <Flag className="w-4 h-4 mr-2" /> Flagged Responses
          </button>
        </div>
        {/* Analytics Cards */}
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
      </div>
    </div>
  )
} 