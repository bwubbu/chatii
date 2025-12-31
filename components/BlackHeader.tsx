"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, Users, Shield, Menu, X, Code2, Target, Globe, Languages, User, LogOut } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useUser } from "@/components/UserContext"
import { useLanguage } from "@/components/LanguageContext"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useState } from "react"
import { supabase } from "@/supabaseClient"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

const ADMIN_EMAIL = "kyrodahero123@gmail.com"

export default function BlackHeader() {
  const { user, loading } = useUser()
  const { language, setLanguage } = useLanguage()
  const pathname = usePathname()
  const router = useRouter()
  const [navOpen, setNavOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  // Hide header on chat pages
  if (pathname.startsWith('/chat')) {
    return null
  }

  return (
    <header className="relative z-50 flex items-center justify-between p-6 lg:px-12 bg-[#171717]">
      <Link href="/" className="text-2xl font-bold text-white flex items-center space-x-2 hover:opacity-80 transition-opacity">
        <img 
          src="/icon-dark.png" 
          alt="RamahAI Logo" 
          width={32} 
          height={32}
          className="w-8 h-8"
        />
        <span>RamahAI</span>
      </Link>
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
      {/* Auth Buttons/User */}
      <div className="flex items-center gap-4">
        {loading ? (
          <Button variant="secondary" className="bg-white/90 text-gray-900" disabled>Loading...</Button>
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500/50">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-white leading-tight">
                    {user.user_metadata?.username || user.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-gray-400 leading-tight truncate max-w-[120px]">
                    {user.email}
                  </p>
                </div>
                <Avatar className="h-10 w-10 border-2 border-green-500/50 ring-2 ring-green-500/20">
                  <AvatarImage src={user.user_metadata?.avatar_url || undefined} alt="Profile" />
                  <AvatarFallback className="bg-gradient-to-br from-green-400 to-blue-500 text-white font-semibold text-sm">
                    {(user.user_metadata?.username?.[0] || user.email?.[0] || "U").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#1a1a1f] border-gray-700">
              <DropdownMenuLabel className="px-3 py-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-green-500/50">
                    <AvatarImage src={user.user_metadata?.avatar_url || undefined} alt="Profile" />
                    <AvatarFallback className="bg-gradient-to-br from-green-400 to-blue-500 text-white font-semibold">
                      {(user.user_metadata?.username?.[0] || user.email?.[0] || "U").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {user.user_metadata?.username || 'User'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuItem asChild className="text-gray-200 hover:bg-gray-800 cursor-pointer">
                <Link href="/dashboard" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuLabel className="px-3 py-2 text-xs text-gray-400 font-normal">
                Language
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setLanguage("english")}
                className={`cursor-pointer ${
                  language === "english"
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-gray-200 hover:bg-gray-800"
                }`}
              >
                <Globe className="w-4 h-4 mr-2" />
                <span>English</span>
                {language === "english" && (
                  <span className="ml-auto text-xs">✓</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLanguage("malay")}
                className={`cursor-pointer ${
                  language === "malay"
                    ? "bg-purple-600/20 text-purple-400"
                    : "text-gray-200 hover:bg-gray-800"
                }`}
              >
                <Globe className="w-4 h-4 mr-2" />
                <span>Bahasa Malaysia</span>
                {language === "malay" && (
                  <span className="ml-auto text-xs">✓</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="text-red-400 hover:bg-red-500/10 cursor-pointer focus:text-red-400"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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