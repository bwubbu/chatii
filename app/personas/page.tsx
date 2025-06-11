import { PersonasTab } from "@/components/personas/PersonasTab";
import { MessageCircle, Sparkles, Zap } from "lucide-react";

export default function PersonasPage() {
  return (
    <div className="min-h-screen bg-[#171717] relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 animate-float">
          <MessageCircle className="w-6 h-6 text-white/20" />
        </div>
        <div className="absolute top-40 right-32 animate-float-delayed">
          <Sparkles className="w-4 h-4 text-white/20" />
        </div>
        <div className="absolute bottom-32 left-32 animate-float">
          <Zap className="w-5 h-5 text-white/20" />
        </div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-7xl w-full space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold text-white">
              Choose Your <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Persona</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Select from our collection of carefully crafted AI personas, each designed to provide unique and engaging conversations.
            </p>
          </div>
          <PersonasTab />
        </div>
      </main>
    </div>
  )
} 