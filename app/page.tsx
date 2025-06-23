"use client";

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Sparkles, Zap, MessageCircle, Shield, Heart, Brain, CheckCircle, Star } from "lucide-react"
import { ChatDemo } from "@/components/chat/ChatDemo"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f10] via-[#1a1a1f] to-[#23232a] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
            {/* Left Side - Content */}
            <div className="text-center lg:text-left">
              {/* Hero Badge */}
              <Badge 
                variant="outline" 
                className="mb-6 px-4 py-2 text-sm bg-green-900/30 border-green-500/50 text-green-300 hover:bg-green-900/40"
              >
                <Shield className="w-4 h-4 mr-2" />
                Introducing Fairness-First AI Technology
              </Badge>

              {/* Hero Title */}
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent leading-tight">
                Chat with 
                <span className="block bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Fair & Ethical AI
                </span>
              </h1>

              {/* Hero Description */}
              <p className="text-lg md:text-xl text-gray-300 mb-8 leading-relaxed">
                Experience the future of AI conversations with our fairness-trained personas. 
                Every interaction is designed to be <span className="text-green-400 font-semibold">respectful</span>, 
                <span className="text-blue-400 font-semibold"> unbiased</span>, and 
                <span className="text-purple-400 font-semibold"> ethically sound</span>.
              </p>

              {/* CTA Button */}
              <div className="flex justify-center lg:justify-start items-center mb-8">
                <Link href="/personas">
                  <Button 
                    size="lg" 
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-semibold transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-green-500/25"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Try Them Out!
                  </Button>
                </Link>
              </div>

              {/* Quick Features */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center lg:text-left space-y-2">
                  <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center mx-auto lg:mx-0">
                    <Shield className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="text-white font-semibold text-sm">Fair & Ethical</h3>
                  <p className="text-gray-400 text-xs">Unbiased responses for everyone</p>
                </div>
                <div className="text-center lg:text-left space-y-2">
                  <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center mx-auto lg:mx-0">
                    <Heart className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-white font-semibold text-sm">Always Polite</h3>
                  <p className="text-gray-400 text-xs">Respectful in every interaction</p>
                </div>
                <div className="text-center lg:text-left space-y-2">
                  <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center mx-auto lg:mx-0">
                    <Brain className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="text-white font-semibold text-sm">Bias-Free AI</h3>
                  <p className="text-gray-400 text-xs">Advanced fairness training</p>
                </div>
              </div>
            </div>

            {/* Right Side - Chat Demo */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-md">
                <ChatDemo />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Why Choose Chatii?</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Our AI personas are trained with cutting-edge fairness techniques to ensure every conversation is meaningful and respectful.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Feature 1 */}
            <Card className="bg-[#1a1a1f]/80 border-gray-700 hover:border-green-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10">
              <CardHeader>
                <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-green-400" />
                </div>
                <CardTitle className="text-white text-xl">Fair & Ethical</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-400">
                  Every persona is trained with advanced fairness algorithms to eliminate bias and ensure respectful interactions for all users.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="bg-[#1a1a1f]/80 border-gray-700 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center mb-4">
                  <Heart className="w-6 h-6 text-blue-400" />
                </div>
                <CardTitle className="text-white text-xl">Always Polite</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-400">
                  Our AI maintains a respectful tone in every conversation, adapting to your communication style while staying courteous.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="bg-[#1a1a1f]/80 border-gray-700 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center mb-4">
                  <Brain className="w-6 h-6 text-purple-400" />
                </div>
                <CardTitle className="text-white text-xl">Bias-Free AI</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-400">
                  Advanced training techniques ensure our AI provides balanced, unbiased responses regardless of user demographics.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card className="bg-[#1a1a1f]/80 border-gray-700 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/10">
              <CardHeader>
                <div className="w-12 h-12 bg-yellow-600/20 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-yellow-400" />
                </div>
                <CardTitle className="text-white text-xl">Lightning Fast</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-400">
                  Optimized for speed without compromising on quality. Get thoughtful responses in seconds, not minutes.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 5 */}
            <Card className="bg-[#1a1a1f]/80 border-gray-700 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10">
              <CardHeader>
                <div className="w-12 h-12 bg-indigo-600/20 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-indigo-400" />
                </div>
                <CardTitle className="text-white text-xl">Diverse Personas</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-400">
                  Choose from a variety of carefully crafted personas, each with unique personalities while maintaining ethical standards.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Feature 6 */}
            <Card className="bg-[#1a1a1f]/80 border-gray-700 hover:border-teal-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/10">
              <CardHeader>
                <div className="w-12 h-12 bg-teal-600/20 rounded-lg flex items-center justify-center mb-4">
                  <CheckCircle className="w-6 h-6 text-teal-400" />
                </div>
                <CardTitle className="text-white text-xl">Continuously Improving</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-400">
                  Your feedback helps us continuously improve our fairness algorithms and enhance the conversation experience.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6 py-20">
          <Card className="bg-gradient-to-r from-green-900/30 via-blue-900/30 to-purple-900/30 border-green-500/30 max-w-4xl mx-auto">
            <CardContent className="py-16 text-center">
              <div className="flex items-center justify-center mb-6">
                <Star className="w-8 h-8 text-yellow-400 mr-2" />
                <h2 className="text-4xl font-bold text-white drop-shadow-lg shadow-black/50">Ready to Experience Fair AI?</h2>
                <Star className="w-8 h-8 text-yellow-400 ml-2" />
              </div>
              <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto drop-shadow-md">
                Join thousands of users who are already experiencing the future of ethical AI conversations. 
                Start chatting with our fairness-trained personas today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/personas">
                  <Button 
                    size="lg" 
                    className="bg-green-600 hover:bg-green-700 text-white px-12 py-4 text-xl font-semibold transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-green-500/25"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Start Your First Chat
                  </Button>
                </Link>
                <Badge variant="outline" className="border-green-500 text-green-400 px-4 py-2">
                  <Shield className="w-4 h-4 mr-1" />
                  100% Free to Try
                </Badge>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
