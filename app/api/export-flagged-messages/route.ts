import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { convertFlaggedMessagesToJSONL, convertFlaggedMessagesToEmbeddingJSONL } from "@/lib/feedback-export";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const ADMIN_EMAIL = "kyrodahero123@gmail.com";

// Create admin client for querying (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/export-flagged-messages
 * Export flagged messages as negative training examples
 * Admin only endpoint
 */
export async function GET(request: NextRequest) {
  try {
    // Check for service role key
    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: "Server configuration error: SUPABASE_SERVICE_ROLE_KEY not set" },
        { status: 500 }
      );
    }

    // Get auth token from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized: Missing or invalid authorization token" },
        { status: 401 }
      );
    }

    // Verify user is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const personaId = searchParams.get("personaId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const severity = searchParams.get("severity") || undefined;
    const status = searchParams.get("status") || "resolved"; // Only export resolved/approved flags
    const format = searchParams.get("format") || "embedding"; // "embedding" or "finetuning"

    // Build query for flagged messages
    let flaggedQuery = supabaseAdmin
      .from("flagged_messages")
      .select("id, message_id, content, reason, severity, created_at")
      .eq("status", status); // Only get resolved/approved flags

    if (startDate) {
      flaggedQuery = flaggedQuery.gte("created_at", startDate);
    }
    if (endDate) {
      flaggedQuery = flaggedQuery.lte("created_at", endDate);
    }
    if (severity) {
      flaggedQuery = flaggedQuery.eq("severity", severity);
    }

    const { data: flaggedMessages, error: flaggedError } = await flaggedQuery;

    if (flaggedError) {
      throw new Error(`Error fetching flagged messages: ${flaggedError.message}`);
    }

    if (!flaggedMessages || flaggedMessages.length === 0) {
      return NextResponse.json(
        { error: "No flagged messages found matching the specified filters" },
        { status: 404 }
      );
    }

    // Get message IDs and fetch full conversation context
    const messageIds = flaggedMessages
      .map((f) => f.message_id)
      .filter((id): id is string => id !== null);

    if (messageIds.length === 0) {
      return NextResponse.json(
        { error: "No flagged messages with valid message references found" },
        { status: 404 }
      );
    }

    // Fetch messages with conversation info
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from("messages")
      .select("id, conversation_id, sender, content, created_at")
      .in("id", messageIds);

    if (messagesError) {
      throw new Error(`Error fetching messages: ${messagesError.message}`);
    }

    // Get conversation IDs and fetch persona info
    const conversationIds = [...new Set(messages?.map((m) => m.conversation_id) || [])];

    const { data: conversations, error: conversationsError } = await supabaseAdmin
      .from("conversations")
      .select("id, persona_id")
      .in("id", conversationIds);

    if (conversationsError) {
      throw new Error(`Error fetching conversations: ${conversationsError.message}`);
    }

    // Filter by persona if specified
    let filteredConversationIds = conversationIds;
    if (personaId) {
      filteredConversationIds = conversations
        ?.filter((c) => c.persona_id === personaId)
        .map((c) => c.id) || [];
    }

    // Build map of conversation_id -> persona_id
    const conversationToPersona: { [key: string]: string } = {};
    conversations?.forEach((c) => {
      conversationToPersona[c.id] = c.persona_id;
    });

    // For each flagged message, get the user input that preceded it
    const flaggedData: Array<{
      userInput: string;
      flaggedResponse: string;
      reason: string;
      severity: string;
      conversation_id: string;
      persona_id: string;
      message_id: string;
    }> = [];

    for (const flag of flaggedMessages) {
      const message = messages?.find((m) => m.id === flag.message_id);
      if (!message || !filteredConversationIds.includes(message.conversation_id)) {
        continue;
      }

      // Get the user message that preceded this flagged response
      const { data: userMessages } = await supabaseAdmin
        .from("messages")
        .select("content")
        .eq("conversation_id", message.conversation_id)
        .eq("sender", "user")
        .lt("created_at", message.created_at)
        .order("created_at", { ascending: false })
        .limit(1);

      const userInput = userMessages?.[0]?.content || "User input not available";

      flaggedData.push({
        userInput,
        flaggedResponse: flag.content,
        reason: flag.reason,
        severity: flag.severity,
        conversation_id: message.conversation_id,
        persona_id: conversationToPersona[message.conversation_id] || "",
        message_id: flag.message_id,
      });
    }

    if (flaggedData.length === 0) {
      return NextResponse.json(
        { error: "No flagged messages found matching the specified filters" },
        { status: 404 }
      );
    }

    // Convert to JSONL format based on selected format
    const jsonlContent = format === "finetuning"
      ? convertFlaggedMessagesToJSONL(flaggedData)
      : convertFlaggedMessagesToEmbeddingJSONL(flaggedData);

    // Generate filename with timestamp and format
    const timestamp = new Date().toISOString().split("T")[0];
    const severityStr = severity ? `_${severity}` : "";
    const formatSuffix = format === "embedding" ? "_embedding" : "_finetuning";
    const filename = `flagged_messages_negative_examples${formatSuffix}${severityStr}_${timestamp}.jsonl`;

    // Return as downloadable file
    return new NextResponse(jsonlContent, {
      status: 200,
      headers: {
        "Content-Type": "application/jsonl",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Export flagged messages error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

