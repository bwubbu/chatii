"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, Users, MessageCircle, Shield, Menu, X, Code2 } from "lucide-react"
import { usePathname } from "next/navigation"
import { useUser } from "@/components/UserContext"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useState } from "react"

const ADMIN_EMAIL = "kyrodahero123@gmail.com"

export default function BlackHeader() {
  const { user, loading } = useUser()
  const pathname = usePathname()
  const [navOpen, setNavOpen] = useState(false)

  return (
<header className="relative z-10 flex items-center justify-between p-6 lg:px-12 bg-[#171717]">
      <div className="text-2xl font-bold text-white flex items-center space-x-2">
        <span>Chatii</span>
        <MessageCircle className="w-5 h-5 text-white/60" />
      </div>
      {/* Desktop Nav */}
      <nav className="hidden md:flex items-center space-x-8">
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
        {/* Developer Beta Tab */}
        <Link
          href="/developers"
          className={`flex items-center space-x-2 transition-colors ${pathname.startsWith("/developers") ? "text-blue-400 font-bold" : "text-gray-400 hover:text-blue-300"}`}
        >
          <Code2 className="w-4 h-4" />
          <span>For Developers</span>
          <span className="px-2 py-1 text-xs bg-blue-600 text-white rounded-full ml-1">Beta</span>
        </Link>
        {/* Admin Tab */}
        {user && user.email === ADMIN_EMAIL && (
          <Link
            href="/admin"
            className={`flex items-center space-x-2 transition-colors font-semibold ${pathname.startsWith("/admin") ? "text-yellow-400" : "text-gray-400 hover:text-yellow-300"}`}
          >
            <Shield className="w-4 h-4" />
            <span>Admin</span>
          </Link>
        )}
      </nav>
      {/* Mobile Hamburger */}
      <div className="md:hidden flex items-center">
        <button
          className="text-white focus:outline-none"
          onClick={() => setNavOpen((v) => !v)}
          aria-label="Open navigation menu"
        >
          {navOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
        </button>
        {navOpen && (
          <div className="absolute top-full right-4 mt-2 w-48 bg-[#23232a] rounded-lg shadow-lg z-30 animate-fade-in">
            <Link
              href="/"
              className={`block px-4 py-3 text-gray-200 hover:bg-[#18181b] flex items-center gap-2 ${pathname === "/" ? "font-bold" : ""}`}
              onClick={() => setNavOpen(false)}
            >
              <Home className="w-4 h-4" /> Home
            </Link>
            <Link
              href="/personas"
              className={`block px-4 py-3 text-gray-200 hover:bg-[#18181b] flex items-center gap-2 ${pathname.startsWith("/personas") ? "font-bold" : ""}`}
              onClick={() => setNavOpen(false)}
            >
              <Users className="w-4 h-4" /> Personas
            </Link>
            <Link
              href="/developers"
              className={`block px-4 py-3 text-gray-200 hover:bg-[#18181b] flex items-center gap-2 ${pathname.startsWith("/developers") ? "font-bold text-blue-400" : ""}`}
              onClick={() => setNavOpen(false)}
            >
              <Code2 className="w-4 h-4" /> For Developers 
              <span className="px-2 py-1 text-xs bg-blue-600 text-white rounded-full ml-1">Beta</span>
            </Link>
            {user && user.email === ADMIN_EMAIL && (
              <Link
                href="/admin"
                className={`block px-4 py-3 text-gray-200 hover:bg-[#18181b] flex items-center gap-2 ${pathname.startsWith("/admin") ? "font-bold text-yellow-400" : ""}`}
                onClick={() => setNavOpen(false)}
              >
                <Shield className="w-4 h-4" /> Admin
              </Link>
            )}
          </div>
        )}
      </div>
      {/* Auth Buttons/User */}
      {loading ? (
        <Button variant="secondary" className="bg-white/90 text-gray-900" disabled>Loading...</Button>
      ) : user ? (
        <Link href="/dashboard" className="flex items-center space-x-3 group">
          <span className="text-white text-lg font-bold group-hover:underline">{user.user_metadata?.username || user.email}</span>
          <Avatar className="h-12 w-12 border-2 border-white">
            <AvatarImage src={user.user_metadata?.avatar_url || undefined} alt="Profile" />
            <AvatarFallback>{user.user_metadata?.username?.[0] || "U"}</AvatarFallback>
          </Avatar>
        </Link>
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