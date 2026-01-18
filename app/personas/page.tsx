"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Shield, Sparkles, Users, Clock, ChevronDown, ChevronUp, Mail, CheckCircle, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Persona {
  id: string;
  title: string;
  description: string;
  avatar_url?: string;
  category?: string;
}

interface Conversation {
  id: string;
  title: string;
  last_message_at: string;
  created_at: string;
}

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingConversation, setCreatingConversation] = useState<string | null>(null);
  const [pastConversations, setPastConversations] = useState<{ [personaId: string]: Conversation[] }>({});
  const [expandedPersonas, setExpandedPersonas] = useState<Set<string>>(new Set());
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestName, setRequestName] = useState("");
  const [requestDescription, setRequestDescription] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<{ id: string; personaId: string; title: string } | null>(null);
  const [loadingDialogOpen, setLoadingDialogOpen] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading...");

  useEffect(() => {
    let isMounted = true;
    
    const fetchPersonas = async () => {
      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );
        
        const queryPromise = supabase
          .from("personas")
          .select("*")
          .eq("is_active", true)
          .order("title");

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

        if (!isMounted) return;

        if (error) {
          console.error("Error fetching personas:", error);
          setPersonas([]);
        } else {
          setPersonas(data || []);
        }
      } catch (err) {
        console.error("Error fetching personas:", err);
        if (isMounted) {
          setPersonas([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPersonas();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchPastConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      const queryPromise = supabase
        .from("conversations")
        .select("id, title, persona_id, last_message_at, created_at")
        .eq("user_id", user.id)
        .order("last_message_at", { ascending: false });

      const { data: conversations, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (error) {
        console.error("Error fetching conversations:", error);
        return;
      }

      // Group conversations by persona_id and limit to 5 most recent per persona
      const grouped: { [personaId: string]: Conversation[] } = {};
      const personaCounts: { [personaId: string]: number } = {};
      
      conversations?.forEach((conv: any) => {
        if (!grouped[conv.persona_id]) {
          grouped[conv.persona_id] = [];
          personaCounts[conv.persona_id] = 0;
        }
        // Only add if we haven't reached the limit (5 most recent)
        if (personaCounts[conv.persona_id] < 5) {
          grouped[conv.persona_id].push({
          id: conv.id,
          title: conv.title,
          last_message_at: conv.last_message_at,
          created_at: conv.created_at,
        });
          personaCounts[conv.persona_id]++;
        }
      });

      setPastConversations(grouped);
    } catch (error) {
      console.error("Error fetching past conversations:", error);
    }
  };

  useEffect(() => {
    if (personas.length > 0) {
      let isMounted = true;
      
      const loadConversations = async () => {
        await fetchPastConversations();
      };

      loadConversations();
      
      return () => {
        isMounted = false;
      };
    }
  }, [personas]);

  const togglePersonaExpanded = (personaId: string) => {
    setExpandedPersonas((prev) => {
      const next = new Set(prev);
      if (next.has(personaId)) {
        next.delete(personaId);
      } else {
        next.add(personaId);
      }
      return next;
    });
  };

  const handleDeleteClick = (conversationId: string, personaId: string, conversationTitle: string) => {
    setConversationToDelete({ id: conversationId, personaId, title: conversationTitle });
    setDeleteDialogOpen(true);
  };

  const deleteConversation = async () => {
    if (!conversationToDelete) return;

    try {
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationToDelete.id);

      if (error) {
        console.error("Error deleting conversation:", error);
        alert("Failed to delete conversation. Please try again.");
        return;
      }

      // Update the past conversations state
      setPastConversations((prev) => {
        const updated = { ...prev };
        if (updated[conversationToDelete.personaId]) {
          updated[conversationToDelete.personaId] = updated[conversationToDelete.personaId].filter(
            conv => conv.id !== conversationToDelete.id
          );
          // If no conversations left for this persona, remove the key
          if (updated[conversationToDelete.personaId].length === 0) {
            delete updated[conversationToDelete.personaId];
          }
        }
        return updated;
      });

      // Close dialog and reset state
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    } catch (error) {
      console.error("Error deleting conversation:", error);
      alert("An unexpected error occurred. Please try again.");
    }
  };

  const createNewConversation = async (personaId: string) => {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      window.location.href = '/login';
      return null;
    }

    setCreatingConversation(personaId);
    setLoadingMessage("Creating new conversation...");
    setLoadingDialogOpen(true);
    
    try {
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
        setLoadingDialogOpen(false);
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

      // Refresh past conversations after creating a new one
      await fetchPastConversations();
      setLoadingMessage("Redirecting to conversation...");
      // Small delay to show the redirect message
      await new Promise(resolve => setTimeout(resolve, 300));
      return data;
    } catch (err) {
      console.error("Unexpected error:", err);
      setLoadingDialogOpen(false);
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
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f10] via-[#1a1a1f] to-[#23232a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading personas...</p>
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

                <CardFooter className="flex flex-col gap-2">
                  {/* Past Conversations Section */}
                  {pastConversations[persona.id] && pastConversations[persona.id].length > 0 && (
                    <div className="w-full">
                      <Button
                        variant="outline"
                        className="w-full justify-between bg-[#2a2a2f] border-gray-600 text-gray-300 hover:bg-[#333338] hover:text-white"
                        onClick={async () => {
                          try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) {
                              window.location.href = '/login';
                              return;
                            }
                            togglePersonaExpanded(persona.id);
                          } catch (error) {
                            console.error('Error checking authentication:', error);
                            window.location.href = '/login';
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>Past Chats ({pastConversations[persona.id].length})</span>
                        </div>
                        {expandedPersonas.has(persona.id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                      
                      {expandedPersonas.has(persona.id) && (
                        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                          {pastConversations[persona.id].map((conv) => {
                            const handleConversationClick = async () => {
                              try {
                                const { data: { user } } = await supabase.auth.getUser();
                                if (!user) {
                                  window.location.href = '/login';
                                  return;
                                }
                                setLoadingMessage("Opening conversation...");
                                setLoadingDialogOpen(true);
                                // Small delay to show loading state
                                await new Promise(resolve => setTimeout(resolve, 200));
                                window.location.href = `/chat/${persona.id}/${conv.id}`;
                              } catch (error) {
                                console.error('Error checking authentication:', error);
                                setLoadingDialogOpen(false);
                                window.location.href = '/login';
                              }
                            };

                            const handleKeyDown = (e: React.KeyboardEvent) => {
                              // Allow activation with Enter or Space key
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleConversationClick();
                              }
                            };

                            return (
                              <div
                                key={conv.id}
                                className="p-2 rounded-md bg-[#2a2a2f] hover:bg-[#333338] border border-gray-700 hover:border-gray-600 transition-colors"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={handleConversationClick}
                                    onKeyDown={handleKeyDown}
                                    aria-label={`Open conversation: ${conv.title}`}
                                    className="flex-1 min-w-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 rounded"
                                  >
                                    <p className="text-sm font-medium text-white truncate">
                                      {conv.title}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteClick(conv.id, persona.id, conv.title);
                                    }}
                                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0"
                                    aria-label={`Delete conversation: ${conv.title}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Start New Conversation Button */}
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
                    {creatingConversation === persona.id ? "Creating..." : "Start New Conversation"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Request Persona CTA */}
        <div className="text-center mt-16">
          <Card className="bg-gradient-to-r from-green-900/50 to-blue-900/50 border-green-500/50">
            <CardContent className="py-8">
              <h3 className="text-2xl font-bold text-white mb-4">Want to request a persona?</h3>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                Have an idea for a new AI persona? Let us know what you'd like to see and we'll consider adding it to our collection.
              </p>
              <Button 
                onClick={async () => {
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) {
                      window.location.href = '/login';
                      return;
                    }
                    setRequestDialogOpen(true);
                  } catch (error) {
                    console.error('Error checking authentication:', error);
                    window.location.href = '/login';
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Admin
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Persona Request Dialog */}
        <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
          <DialogContent className="bg-[#23232a] border-gray-600 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Request a New Persona</DialogTitle>
              <DialogDescription className="text-gray-400">
                Tell us about the persona you'd like to see. We'll review your request and get back to you.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!requestName.trim() || !requestDescription.trim()) {
                alert("Please fill in both the persona name and description.");
                return;
              }

              setSubmittingRequest(true);
              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                  alert("You need to be logged in to submit a request.");
                  setRequestDialogOpen(false);
                  return;
                }

                const { error } = await supabase
                  .from("persona_requests")
                  .insert({
                    user_id: user.id,
                    persona_name: requestName.trim(),
                    description: requestDescription.trim(),
                    status: "pending"
                  });

                if (error) {
                  console.error("Error submitting request:", error);
                  alert("Failed to submit request. Please try again.");
                } else {
                  setRequestName("");
                  setRequestDescription("");
                  setRequestDialogOpen(false);
                  setSuccessDialogOpen(true);
                }
              } catch (err) {
                console.error("Unexpected error:", err);
                alert("An unexpected error occurred. Please try again.");
              } finally {
                setSubmittingRequest(false);
              }
            }}>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="persona-name" className="text-gray-300">Persona Name</Label>
                  <Input
                    id="persona-name"
                    value={requestName}
                    onChange={(e) => setRequestName(e.target.value)}
                    placeholder="e.g., Customer Service Representative"
                    className="bg-[#2C2C2C] border-gray-600 text-white placeholder-gray-400 focus:border-gray-500 mt-2"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="persona-description" className="text-gray-300">Description</Label>
                  <Textarea
                    id="persona-description"
                    value={requestDescription}
                    onChange={(e) => setRequestDescription(e.target.value)}
                    placeholder="Describe what this persona should do, its characteristics, and how it should interact with users..."
                    className="bg-[#2C2C2C] border-gray-600 text-white placeholder-gray-400 focus:border-gray-500 mt-2 min-h-[120px]"
                    required
                  />
                  <div className="mt-3 p-3 bg-[#2C2C2C] border border-gray-600 rounded-md">
                    <p className="text-xs font-semibold text-gray-300 mb-2">💡 Writing Guide:</p>
                    <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                      <li><strong>Role & Purpose:</strong> What is this persona's job or role? (e.g., "A friendly customer service agent who helps resolve issues")</li>
                      <li><strong>Personality Traits:</strong> How should they behave? (e.g., "patient, empathetic, professional")</li>
                      <li><strong>Communication Style:</strong> How should they talk? (e.g., "uses clear, simple language" or "formal and respectful")</li>
                      <li><strong>Use Cases:</strong> What scenarios will users interact with this persona? (e.g., "helping customers with product questions")</li>
                    </ul>
                    <p className="text-xs text-gray-500 mt-2 italic">Example: "A patient and empathetic customer service representative who helps users resolve product issues. They communicate clearly, use simple language, and always maintain a professional yet friendly tone. Ideal for handling complaints, answering questions, and providing technical support."</p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRequestDialogOpen(false);
                    setRequestName("");
                    setRequestDescription("");
                  }}
                  className="border-gray-500 text-white hover:bg-gray-700 hover:text-white bg-[#2a2a2f]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingRequest}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {submittingRequest ? "Submitting..." : "Submit Request"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Success Dialog with Animated Checkmark */}
        <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
          <DialogContent className="bg-[#23232a] border-gray-600 text-white max-w-md">
            <div className="flex flex-col items-center justify-center py-6">
              {/* Animated Checkmark */}
              <div className="relative mb-4">
                <div className="w-20 h-20 rounded-full bg-green-600/20 flex items-center justify-center relative overflow-visible">
                  <CheckCircle 
                    className="w-12 h-12 text-green-500 animate-in zoom-in duration-500"
                    strokeWidth={2.5}
                  />
                  {/* Ripple animation circles */}
                  <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" style={{ animationDelay: "0s" }}></div>
                  <div className="absolute inset-0 rounded-full bg-green-500/10 animate-ping" style={{ animationDelay: "0.3s" }}></div>
                </div>
              </div>
              
              <DialogTitle className="text-2xl font-bold text-white text-center mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                Successfully submitted!
              </DialogTitle>
              <DialogDescription className="text-gray-400 text-center animate-in fade-in slide-in-from-bottom-2 duration-700">
                We'll review your request and get back to you soon.
              </DialogDescription>
              
              <Button
                onClick={() => setSuccessDialogOpen(false)}
                className="mt-6 bg-green-600 hover:bg-green-700 text-white animate-in fade-in duration-700"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-[#23232a] border-gray-600 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Conversation?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Are you sure you want to delete "{conversationToDelete?.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setConversationToDelete(null);
                }}
                className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white bg-[#2a2a2f]"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteConversation}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Loading Dialog */}
        <Dialog open={loadingDialogOpen} onOpenChange={() => {}}>
          <DialogContent className="bg-[#23232a] border-gray-600 text-white max-w-sm [&>button]:hidden">
            <div className="flex flex-col items-center justify-center py-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mb-4"></div>
              <DialogTitle className="text-white text-center mb-2">
                {loadingMessage}
              </DialogTitle>
              <DialogDescription className="text-gray-400 text-center text-sm">
                Please wait...
              </DialogDescription>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 