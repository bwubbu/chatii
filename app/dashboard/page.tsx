"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/supabaseClient"
import { User } from "@supabase/supabase-js"
import BlackHeader from "@/components/BlackHeader"

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#171717] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!user) {
    router.push("/login")
    return null
  }

  return (
    <div className="min-h-screen bg-[#171717] p-8">
      <BlackHeader />
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="bg-[#0F0F0F] text-white border-gray-600 hover:bg-gray-800"
          >
            Logout
          </Button>
        </div>

        <Card className="bg-[#0F0F0F] border-gray-600">
          <CardHeader>
            <CardTitle className="text-white">Welcome, {user.user_metadata.username || user.email}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-gray-300">
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p>{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Last Sign In</p>
                <p>{new Date(user.last_sign_in_at || "").toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 