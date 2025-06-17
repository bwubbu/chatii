"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Shield, Sparkles, Users } from "lucide-react";

interface Persona {
  id: string;
  title: string;
  description: string;
  avatar_url?: string;
  category?: string;
}

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingConversation, setCreatingConversation] = useState<string | null>(null);

  useEffect(() => {
    fetchPersonas();
  }, []);

  const fetchPersonas = async () => {
    const { data, error } = await supabase
      .from("personas")
      .select("*")
      .order("title");

    if (error) {
      console.error("Error fetching personas:", error);
    } else {
      setPersonas(data || []);
    }
    setLoading(false);
  };

  const createNewConversation = async (personaId: string) => {
    setCreatingConversation(personaId);
    try {
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error("User not authenticated:", userError);
        // Provide user-friendly message and redirect to login
        if (confirm("You need to be logged in to start a conversation. Would you like to go to the login page?")) {
          window.location.href = '/login';
        }
        return null;
      }

      const { data, error } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          persona_id: personaId,
          title: "New Conversation",
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating conversation:", error);
        // Provide more specific error messages
        if (error.code === '42501') {
          alert("Permission denied. Please make sure you're logged in and try again.");
        } else if (error.code === '23503') {
          alert("Invalid persona selected. Please try again.");
        } else {
          alert(`Failed to create conversation: ${error.message}`);
        }
        return null;
      }

      return data;
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("An unexpected error occurred. Please try again.");
      return null;
    } finally {
      setCreatingConversation(null);
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'professional':
        return <Users className="w-4 h-4" />;
      case 'creative':
        return <Sparkles className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'professional':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'creative':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1f] p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-white">Loading personas...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1f] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="w-8 h-8 text-green-400" />
            <h1 className="text-4xl font-bold text-white">Fairness-Trained AI Personas</h1>
          </div>
          <p className="text-xl text-gray-300 mb-6">
            Choose from our collection of carefully trained AI personas designed for respectful, unbiased conversations.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Badge variant="outline" className="border-green-500 text-green-400 px-3 py-1">
              <Shield className="w-3 h-3 mr-1" />
              Bias-Free
            </Badge>
            <Badge variant="outline" className="border-blue-500 text-blue-400 px-3 py-1">
              <MessageCircle className="w-3 h-3 mr-1" />
              Always Respectful
            </Badge>
            <Badge variant="outline" className="border-purple-500 text-purple-400 px-3 py-1">
              <Sparkles className="w-3 h-3 mr-1" />
              Ethically Trained
            </Badge>
          </div>
        </div>

        {/* Personas Grid */}
        {personas.length === 0 ? (
          <Card className="bg-[#23232a] border-gray-600">
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-gray-400">No personas available.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {personas.map((persona) => (
              <Card
                key={persona.id}
                className="bg-[#23232a] border-gray-600 hover:border-gray-500 transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {persona.avatar_url ? (
                        <img
                          src={persona.avatar_url}
                          alt={persona.title}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
                          {getCategoryIcon(persona.category)}
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-white text-lg">{persona.title}</CardTitle>
                        {persona.category && (
                          <Badge
                            variant="outline"
                            className={`text-xs mt-1 ${getCategoryColor(persona.category)}`}
                          >
                            {persona.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <CardDescription className="text-gray-300 text-sm leading-relaxed">
                    {persona.description}
                  </CardDescription>
                </CardContent>

                <CardFooter>
                                      <Button 
                     className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                     onClick={async () => {
                       const conversation = await createNewConversation(persona.id);
                       if (conversation) {
                         window.location.href = `/chat/${persona.id}/${conversation.id}`;
                       }
                     }}
                     disabled={creatingConversation === persona.id}
                   >
                     <MessageCircle className="w-4 h-4 mr-2" />
                     {creatingConversation === persona.id ? "Creating..." : "Start Conversation"}
                   </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Footer CTA */}
        <div className="text-center mt-16">
          <Card className="bg-gradient-to-r from-green-900/50 to-blue-900/50 border-green-500/50">
            <CardContent className="py-8">
              <h3 className="text-2xl font-bold text-white mb-4">Experience Fair AI Conversations</h3>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                Our personas are trained with advanced fairness techniques to ensure every conversation is respectful, 
                unbiased, and tailored to your needs while maintaining ethical standards.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-medium">Powered by Fairness-First AI</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 