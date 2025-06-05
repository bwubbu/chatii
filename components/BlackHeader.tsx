"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, Users, MessageCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/supabaseClient"
import { usePathname } from "next/navigation"

const ADMIN_EMAIL = "kyrodahero123@gmail.com"

export default function BlackHeader() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    getUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <header className="relative z-10 flex items-center justify-between p-6 lg:px-12 bg-transparent">
      <div className="text-2xl font-bold text-white flex items-center space-x-2">
        <span>Chatii</span>
        <MessageCircle className="w-5 h-5 text-white/60" />
      </div>
      <nav className="flex items-center space-x-8">
        <Link
          href="/"
          className={`flex items-center space-x-2 transition-colors ${pathname === "/" ? "text-white font-bold" : "text-gray-400 hover:text-white"}`}
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </Link>
        <Link
          href="/personas"
          className={`flex items-center space-x-2 transition-colors ${pathname.startsWith("/personas") ? "text-white font-bold" : "text-gray-400 hover:text-white"}`}
        >
          <Users className="w-4 h-4" />
          <span>Personas</span>
        </Link>
        {/* Admin Tab */}
        {user && user.email === ADMIN_EMAIL && (
          <Link
            href="/admin"
            className={`flex items-center space-x-2 transition-colors font-semibold ${pathname.startsWith("/admin") ? "text-yellow-400" : "text-gray-400 hover:text-yellow-300"}`}
          >
            <span>Admin</span>
          </Link>
        )}
      </nav>
      {/* Auth Buttons/User */}
      {loading ? (
        <Button variant="secondary" className="bg-white/90 text-gray-900" disabled>Loading...</Button>
      ) : user ? (
        <Button asChild variant="secondary" className="bg-white/90 text-gray-900 hover:bg-white">
          <Link href="/dashboard">{user.user_metadata?.username || user.email}</Link>
        </Button>
      ) : (
        <div className="flex space-x-2">
          <Button asChild variant="secondary" className="bg-white/90 text-gray-900 hover:bg-white">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild className="bg-white text-gray-900 hover:bg-gray-100">
            <Link href="/signup">Sign Up</Link>
          </Button>
        </div>
      )}
    </header>
  )
} 