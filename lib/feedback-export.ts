import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface FeedbackExportFilters {
  minScore?: number;
  maxScore?: number;
  personaId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ConversationMessage {
  id: string;
  sender: 'user' | 'bot';
  content: string;
  created_at: string;
}

export interface FeedbackConversation {
  conversation_id: string;
  persona_id: string;
  feedback: {
    politeness: number;
    fairness: number;
    respectfulness: number;
    trustworthiness: number;
    competence: number;
    likeability: number;
    open_ended?: string;
    created_at: string;
  };
  messages: ConversationMessage[];
  averageScore: number;
}

/**
 * Calculate average score from all feedback metrics
 */
export function calculateAverageScore(feedback: {
  politeness: number;
  fairness: number;
  respectfulness: number;
  trustworthiness: number;
  competence: number;
  likeability: number;
}): number {
  const sum = feedback.politeness + feedback.fairness + feedback.respectfulness +
    feedback.trustworthiness + feedback.competence + feedback.likeability;
  return sum / 6;
}

/**
 * Query feedback data with conversations and messages from Supabase
 * This function accepts a supabase client instance (for server-side usage with admin client)
 */
export async function queryFeedbackConversationsWithClient(
  supabaseClient: any,
  filters: FeedbackExportFilters
): Promise<FeedbackConversation[]> {
  try {
    // First, get all feedback that matches the score filter
    let feedbackQuery = supabaseClient
      .from("feedback_questionnaire")
      .select("*, conversation_id, persona_id");

    // Apply date filter if provided
    if (filters.startDate) {
      feedbackQuery = feedbackQuery.gte("created_at", filters.startDate);
    }
    if (filters.endDate) {
      feedbackQuery = feedbackQuery.lte("created_at", filters.endDate);
    }

    // Apply persona filter if provided
    if (filters.personaId) {
      feedbackQuery = feedbackQuery.eq("persona_id", filters.personaId);
    }

    const { data: feedbackData, error: feedbackError } = await feedbackQuery;

    if (feedbackError) {
      throw new Error(`Error fetching feedback: ${feedbackError.message}`);
    }

    if (!feedbackData || feedbackData.length === 0) {
      return [];
    }

    // Filter by score range
    const filteredFeedback = feedbackData.filter((f: any) => {
      const politeness = typeof f.politeness === 'number' ? f.politeness : 0;
      const fairness = typeof f.fairness === 'number' ? f.fairness : 0;
      const respectfulness = typeof f.respectfulness === 'number' ? f.respectfulness : 0;
      const trustworthiness = typeof f.trustworthiness === 'number' ? f.trustworthiness : 0;
      const competence = typeof f.competence === 'number' ? f.competence : 0;
      const likeability = typeof f.likeability === 'number' ? f.likeability : 0;
      
      const avgScore = calculateAverageScore({
        politeness,
        fairness,
        respectfulness,
        trustworthiness,
        competence,
        likeability,
      });

      if (filters.minScore !== undefined && avgScore < filters.minScore) {
        return false;
      }
      if (filters.maxScore !== undefined && avgScore > filters.maxScore) {
        return false;
      }
      return true;
    });

    if (filteredFeedback.length === 0) {
      return [];
    }

    // Get conversation IDs
    const conversationIds = filteredFeedback
      .map((f: any) => f.conversation_id)
      .filter((id: any): id is string => typeof id === 'string' && id.length > 0);

    if (conversationIds.length === 0) {
      return [];
    }

    // Fetch messages for these conversations
    const { data: messagesData, error: messagesError } = await supabaseClient
      .from("messages")
      .select("id, conversation_id, sender, content, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: true });

    if (messagesError) {
      throw new Error(`Error fetching messages: ${messagesError.message}`);
    }

    // Group messages by conversation_id
    const messagesByConversation: { [key: string]: ConversationMessage[] } = {};
    (messagesData || []).forEach((msg: any) => {
      const convId = String(msg.conversation_id || '');
      if (!convId) return;
      
      if (!messagesByConversation[convId]) {
        messagesByConversation[convId] = [];
      }
      messagesByConversation[convId].push({
        id: String(msg.id || ''),
        sender: (msg.sender === 'user' || msg.sender === 'bot') ? msg.sender : 'user',
        content: String(msg.content || ''),
        created_at: String(msg.created_at || ''),
      });
    });

    // Combine feedback with messages
    const result: FeedbackConversation[] = filteredFeedback.map((f: any) => {
      const politeness = typeof f.politeness === 'number' ? f.politeness : 0;
      const fairness = typeof f.fairness === 'number' ? f.fairness : 0;
      const respectfulness = typeof f.respectfulness === 'number' ? f.respectfulness : 0;
      const trustworthiness = typeof f.trustworthiness === 'number' ? f.trustworthiness : 0;
      const competence = typeof f.competence === 'number' ? f.competence : 0;
      const likeability = typeof f.likeability === 'number' ? f.likeability : 0;
      
      const avgScore = calculateAverageScore({
        politeness,
        fairness,
        respectfulness,
        trustworthiness,
        competence,
        likeability,
      });

      const conversationId = String(f.conversation_id || '');
      const personaId = String(f.persona_id || '');

      return {
        conversation_id: conversationId,
        persona_id: personaId,
        feedback: {
          politeness,
          fairness,
          respectfulness,
          trustworthiness,
          competence,
          likeability,
          open_ended: typeof f.open_ended === 'string' ? f.open_ended : undefined,
          created_at: String(f.created_at || ''),
        },
        messages: messagesByConversation[conversationId] || [],
        averageScore: avgScore,
      };
    });

    // Filter out conversations with no messages
    return result.filter((conv) => conv.messages.length > 0);
  } catch (error) {
    console.error("Error querying feedback conversations:", error);
    throw error;
  }
}

/**
 * Query feedback data with conversations and messages from Supabase
 * Uses the default supabase client (for client-side usage)
 */
export async function queryFeedbackConversations(
  filters: FeedbackExportFilters
): Promise<FeedbackConversation[]> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey) as any;
  return queryFeedbackConversationsWithClient(supabase, filters);
}

/**
 * Format conversation into Mistral chat format
 */
export function formatConversationForMistral(conversation: FeedbackConversation): string {
  const parts: string[] = [];
  parts.push("<|begin_of_text|>");

  // Build conversation history
  for (const message of conversation.messages) {
    if (message.sender === "user") {
      parts.push("<|start_header_id|>user<|end_header_id|>");
      parts.push("");
      parts.push(message.content);
      parts.push("<|eot_id|>");
    } else if (message.sender === "bot") {
      parts.push("<|start_header_id|>assistant<|end_header_id|>");
      parts.push("");
      parts.push(message.content);
      parts.push("<|eot_id|>");
    }
  }

  parts.push("<|end_of_text|>");
  return parts.join("\n");
}

/**
 * Convert conversations to JSONL format for training
 */
export function convertToJSONL(conversations: FeedbackConversation[]): string {
  const lines: string[] = [];

  for (const conversation of conversations) {
    const formattedText = formatConversationForMistral(conversation);
    
    // Include metadata in the JSON object for reference
    const trainingExample = {
      text: formattedText,
      // Metadata for reference (won't be used in training but helpful for tracking)
      metadata: {
        conversation_id: conversation.conversation_id,
        persona_id: conversation.persona_id,
        average_score: conversation.averageScore,
        feedback_scores: conversation.feedback,
        message_count: conversation.messages.length,
      },
    };

    lines.push(JSON.stringify(trainingExample));
  }

  return lines.join("\n");
}

/**
 * Format flagged message as negative example for training
 * Shows the user input and the problematic bot response
 */
export function formatFlaggedMessageAsNegative(
  userInput: string,
  flaggedResponse: string,
  reason: string
): string {
  const parts: string[] = [];
  parts.push("<|begin_of_text|>");
  parts.push("<|start_header_id|>user<|end_header_id|>");
  parts.push("");
  parts.push(userInput);
  parts.push("<|eot_id|>");
  parts.push("<|start_header_id|>assistant<|end_header_id|>");
  parts.push("");
  parts.push(`[FLAGGED: ${reason}] ${flaggedResponse}`);
  parts.push("<|eot_id|>");
  parts.push("<|end_of_text|>");
  return parts.join("\n");
}

/**
 * Convert flagged messages to JSONL format for negative training examples
 */
export function convertFlaggedMessagesToJSONL(
  flaggedData: Array<{
    userInput: string;
    flaggedResponse: string;
    reason: string;
    severity: string;
    conversation_id: string;
    persona_id: string;
    message_id: string;
  }>
): string {
  const lines: string[] = [];

  for (const flag of flaggedData) {
    const formattedText = formatFlaggedMessageAsNegative(
      flag.userInput,
      flag.flaggedResponse,
      flag.reason
    );
    
    const trainingExample = {
      text: formattedText,
      metadata: {
        type: "negative_example",
        conversation_id: flag.conversation_id,
        persona_id: flag.persona_id,
        message_id: flag.message_id,
        reason: flag.reason,
        severity: flag.severity,
      },
    };

    lines.push(JSON.stringify(trainingExample));
  }

  return lines.join("\n");
}
