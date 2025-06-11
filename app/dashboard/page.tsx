"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/supabaseClient"
import { User } from "@supabase/supabase-js"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [newUsername, setNewUsername] = useState("")
  const { toast } = useToast ? useToast() : { toast: () => {} }

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setAvatarUrl(user?.user_metadata?.avatar_url || null)
      setNewUsername(user?.user_metadata?.username || "")
      setLoading(false)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      if (!user) return
      const file = event.target.files?.[0]
      if (!file) return
      const fileExt = file.name.split('.').pop()
      const filePath = `avatars/${user.id}.${fileExt}`
      // Upload to Supabase Storage
      let { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
      if (uploadError) throw uploadError
      // Get public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const publicUrl = data.publicUrl
      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } })
      if (updateError) throw updateError
      setAvatarUrl(publicUrl)
    } catch (error) {
      alert('Error uploading avatar!')
    } finally {
      setUploading(false)
    }
  }

  const handleUsernameChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUsername.trim()) {
      toast({ title: "Username cannot be empty", variant: "destructive" })
      return
    }
    try {
      const { error } = await supabase.auth.updateUser({ data: { username: newUsername } })
      if (error) throw error
      setUser((prev) => prev ? { ...prev, user_metadata: { ...prev.user_metadata, username: newUsername } } : prev)
      toast({ title: "Username updated!" })
    } catch (error) {
      toast({ title: "Error updating username", description: String(error), variant: "destructive" })
    }
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
        {/* Profile Section */}
        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <div className="relative">
            <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
              <AvatarImage src={avatarUrl || undefined} alt="Profile" />
              <AvatarFallback className="text-3xl">{user?.user_metadata?.username?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 cursor-pointer border border-gray-300 shadow-md hover:bg-gray-100 transition"
              title="Change profile picture"
            >
              <Input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
              <span className="text-base">✏️</span>
            </label>
          </div>
          <div className="text-4xl font-extrabold text-white drop-shadow">{user?.user_metadata?.username || user?.email || "User"}</div>
        </div>
        {/* Username Change Form */}
        <form
          onSubmit={handleUsernameChange}
          className="bg-[#18181b] rounded-xl shadow-lg p-6 flex flex-col sm:flex-row items-center gap-4 max-w-md mx-auto"
        >
          <label htmlFor="username" className="text-gray-300 font-medium w-full sm:w-auto mb-2 sm:mb-0">
            Change Username
          </label>
          <Input
            id="username"
            type="text"
            value={newUsername}
            onChange={e => setNewUsername(e.target.value)}
            placeholder="Enter new username"
            className="flex-1 bg-[#232326] text-white border-gray-700"
            disabled={loading}
          />
          <Button
            type="submit"
            disabled={loading || !newUsername.trim()}
            className="bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold px-6 py-2 rounded-lg shadow hover:from-purple-600 hover:to-blue-600 transition"
          >
            Change
          </Button>
        </form>
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