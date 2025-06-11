export default function PersonasPage() {
  return (
    <div className="min-h-screen bg-[#171717] relative overflow-hidden">
      {/* Background Animation (optional, copy from Home if you want the same effect) */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 py-20">
        <h1 className="text-4xl font-bold mb-4 text-white">Personas</h1>
        <p className="text-lg text-gray-300 text-center max-w-xl">
          This is a placeholder page for Personas. More features coming soon!
        </p>
      </main>
    </div>
  )
} 