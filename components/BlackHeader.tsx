"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, Users, MessageCircle, Shield, Menu, X, Code2, Target, Globe, Languages } from "lucide-react"
import { usePathname } from "next/navigation"
import { useUser } from "@/components/UserContext"
import { useLanguage } from "@/components/LanguageContext"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const ADMIN_EMAIL = "kyrodahero123@gmail.com"

export default function BlackHeader() {
  const { user, loading } = useUser()
  const { language, setLanguage } = useLanguage()
  const pathname = usePathname()
  const [navOpen, setNavOpen] = useState(false)

  return (
<header className="relative z-10 flex items-center justify-between p-6 lg:px-12 bg-[#171717]">
      <div className="text-2xl font-bold text-white flex items-center space-x-2">
        <span>RamahAI</span>
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
        <Link
          href="/training"
          className={`flex items-center space-x-2 transition-colors ${pathname.startsWith("/training") ? "text-purple-400 font-bold" : "text-gray-400 hover:text-purple-300"}`}
        >
          <Target className="w-4 h-4" />
          <span>Training</span>
        </Link>
        {/* Developer Tab */}
        <Link
          href="/developers"
          className={`flex items-center space-x-2 transition-colors ${pathname.startsWith("/developers") ? "text-blue-400 font-bold" : "text-gray-400 hover:text-blue-300"}`}
        >
          <Code2 className="w-4 h-4" />
          <span>Dev</span>
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
              href="/training"
              className={`block px-4 py-3 text-gray-200 hover:bg-[#18181b] flex items-center gap-2 ${pathname.startsWith("/training") ? "font-bold text-purple-400" : ""}`}
              onClick={() => setNavOpen(false)}
            >
              <Target className="w-4 h-4" /> Training
            </Link>
            <Link
              href="/developers"
              className={`block px-4 py-3 text-gray-200 hover:bg-[#18181b] flex items-center gap-2 ${pathname.startsWith("/developers") ? "font-bold text-blue-400" : ""}`}
              onClick={() => setNavOpen(false)}
            >
              <Code2 className="w-4 h-4" /> Dev
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
      {/* Language Selector & Auth */}
      <div className="flex items-center gap-4">
        {/* Language Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white flex items-center gap-2"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">
                {language === "malay" ? "Bahasa" : "English"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#23232a] border-gray-700">
            <DropdownMenuItem
              onClick={() => setLanguage("english")}
              className={`cursor-pointer ${
                language === "english"
                  ? "bg-blue-600/20 text-blue-400"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              <Languages className="w-4 h-4 mr-2" />
              English
              {language === "english" && (
                <span className="ml-auto text-xs">✓</span>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setLanguage("malay")}
              className={`cursor-pointer ${
                language === "malay"
                  ? "bg-purple-600/20 text-purple-400"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              <Languages className="w-4 h-4 mr-2" />
              Bahasa Malaysia
              {language === "malay" && (
                <span className="ml-auto text-xs">✓</span>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
      </div>
    </header>
  )
} 