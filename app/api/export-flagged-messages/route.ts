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
    // For resolved flags, we want to filter by when they were resolved (reviewed_at),
    // not when they were created. This ensures recently resolved flags are included.
    let flaggedQuery = supabaseAdmin
      .from("flagged_messages")
      .select("id, message_id, content, reason, severity, created_at, reviewed_at")
      .eq("status", status); // Only get resolved/approved flags

    // For resolved flags, don't apply date filters by default since we only care that they're resolved
    // Date filters would exclude flags that were created earlier but resolved recently
    // If date filters are really needed, we can filter by reviewed_at in post-processing
    // For now, we'll skip date filtering for resolved flags to ensure all resolved flags are exportable
    
    if (severity && severity !== 'all') {
      flaggedQuery = flaggedQuery.eq("severity", severity);
    }

    let { data: flaggedMessages, error: flaggedError } = await flaggedQuery;
    
    // For resolved flags, apply date filtering in post-processing if needed
    // This allows us to filter by reviewed_at (when resolved) instead of created_at
    if (status === "resolved" && flaggedMessages && (startDate || endDate)) {
      flaggedMessages = flaggedMessages.filter((flag: any) => {
        // Use reviewed_at if available (when it was resolved), otherwise use created_at
        const dateToCheck = flag.reviewed_at || flag.created_at;
        if (!dateToCheck) return true; // Include if no date available
        
        const flagDate = new Date(dateToCheck).toISOString().split('T')[0];
        
        if (startDate && flagDate < startDate) return false;
        if (endDate && flagDate > endDate) return false;
        
        return true;
      });
      
      console.log(`[EXPORT] After date filtering (by reviewed_at/created_at): ${flaggedMessages.length} flags remain`);
    }
    
    console.log(`[EXPORT] Query params: status="${status}", startDate="${startDate}", endDate="${endDate}", severity="${severity}", personaId="${personaId}"`);
    console.log(`[EXPORT] Found ${flaggedMessages?.length || 0} flagged messages with status="${status}"`);
    if (flaggedMessages && flaggedMessages.length > 0) {
      console.log(`[EXPORT] Flag details:`, flaggedMessages.map(f => ({
        id: f.id,
        reason: f.reason,
        severity: f.severity,
        status: f.status,
        created_at: f.created_at,
        has_message_id: !!f.message_id,
        message_id: f.message_id
      })));
    }

    if (flaggedError) {
      console.error(`[EXPORT] Error fetching flagged messages:`, flaggedError);
      throw new Error(`Error fetching flagged messages: ${flaggedError.message}`);
    }

    if (!flaggedMessages || flaggedMessages.length === 0) {
      // Provide more detailed error message
      const filterDetails = [];
      if (status) filterDetails.push(`status="${status}"`);
      if (startDate) filterDetails.push(`startDate="${startDate}"`);
      if (endDate) filterDetails.push(`endDate="${endDate}"`);
      if (severity && severity !== 'all') filterDetails.push(`severity="${severity}"`);
      
      console.warn(`[EXPORT] No flagged messages found with filters: ${filterDetails.join(', ')}`);
      
      return NextResponse.json(
        { 
          error: "No flagged messages found matching the specified filters",
          details: `Filters applied: ${filterDetails.join(', ')}. Make sure you have resolved/approved flags within the date range.`
        },
        { status: 404 }
      );
    }

    // Get message IDs (only those that exist) for fetching conversation context
    const messageIds = flaggedMessages
      .map((f) => f.message_id)
      .filter((id): id is string => id !== null);
    
    console.log(`[EXPORT] ${messageIds.length} flagged messages have message_ids, ${flaggedMessages.length - messageIds.length} are missing message_ids`);

    // Fetch messages with conversation info (if message_ids exist)
    let messages: any[] = [];
    let conversationToPersona: { [key: string]: string } = {};
    let filteredConversationIds: string[] = [];

    if (messageIds.length > 0) {
      const { data: fetchedMessages, error: messagesError } = await supabaseAdmin
        .from("messages")
        .select("id, conversation_id, sender, content, created_at")
        .in("id", messageIds);

      if (messagesError) {
        console.warn(`[EXPORT] Error fetching messages: ${messagesError.message}`);
      } else {
        messages = fetchedMessages || [];
        console.log(`[EXPORT] Found ${messages.length} messages in database for ${messageIds.length} message_ids`);
        if (messages.length < messageIds.length) {
          const missingIds = messageIds.filter(id => !messages.find(m => m.id === id));
          console.warn(`[EXPORT] Missing ${missingIds.length} messages:`, missingIds);
        }
      }

      // Get conversation IDs and fetch persona info
      const conversationIds = [...new Set(messages.map((m) => m.conversation_id).filter(Boolean))];

      if (conversationIds.length > 0) {
        const { data: conversations, error: conversationsError } = await supabaseAdmin
          .from("conversations")
          .select("id, persona_id")
          .in("id", conversationIds);

        if (conversationsError) {
          console.warn(`Error fetching conversations: ${conversationsError.message}`);
        } else if (conversations) {
          // Build map of conversation_id -> persona_id
          conversations.forEach((c) => {
            conversationToPersona[c.id] = c.persona_id;
          });

          // Filter by persona if specified
          filteredConversationIds = personaId
            ? conversations
                .filter((c) => c.persona_id === personaId)
                .map((c) => c.id)
            : conversationIds;
        }
      }
    }

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
      // Skip if message_id doesn't exist (can't get conversation context)
      if (!flag.message_id) {
        console.warn(`[EXPORT] Flagged message ${flag.id} (reason: ${flag.reason}, severity: ${flag.severity}) has no message_id, skipping`);
        continue;
      }

      const message = messages.find((m) => m.id === flag.message_id);
      
      // If message doesn't exist, skip this flag (can't get conversation context)
      if (!message) {
        console.warn(`[EXPORT] Message not found for flagged message ${flag.id} (reason: ${flag.reason}, severity: ${flag.severity}), message_id: ${flag.message_id}`);
        console.warn(`[EXPORT] Flagged content: "${flag.content.substring(0, 100)}..."`);
        continue;
      }

      // If persona filter is applied and conversation doesn't match, skip
      if (personaId && !filteredConversationIds.includes(message.conversation_id)) {
        console.log(`[EXPORT] Flagged message ${flag.id} (reason: ${flag.reason}) filtered out by persona filter`);
        continue;
      }

      // Get the user message that preceded this flagged response
      let userInput = "User input not available";
      try {
        const { data: userMessages, error: userMessagesError } = await supabaseAdmin
          .from("messages")
          .select("content")
          .eq("conversation_id", message.conversation_id)
          .eq("sender", "user")
          .lt("created_at", message.created_at)
          .order("created_at", { ascending: false })
          .limit(1);

        if (userMessagesError) {
          console.warn(`[EXPORT] Error fetching user message for flag ${flag.id}: ${userMessagesError.message}`);
        } else {
          userInput = userMessages?.[0]?.content || "User input not available";
        }
      } catch (err: any) {
        console.warn(`[EXPORT] Exception fetching user message for flag ${flag.id}: ${err.message}`);
      }

      flaggedData.push({
        userInput,
        flaggedResponse: flag.content,
        reason: flag.reason,
        severity: flag.severity,
        conversation_id: message.conversation_id,
        persona_id: conversationToPersona[message.conversation_id] || "",
        message_id: flag.message_id,
      });
      
      console.log(`[EXPORT] Added flagged message ${flag.id} (reason: ${flag.reason}, severity: ${flag.severity})`);
    }
    
    console.log(`[EXPORT] Total: Found ${flaggedMessages.length} resolved flags, exporting ${flaggedData.length} as negative examples`);

    if (flaggedData.length === 0) {
      // Provide detailed error about why no data was exported
      const skippedCount = flaggedMessages.length - flaggedData.length;
      let errorMessage = "No flagged messages could be exported.";
      let errorDetails = [];
      
      if (flaggedMessages.length === 0) {
        errorMessage = "No resolved/approved flagged messages found matching the specified filters.";
        errorDetails.push(`- Status filter: "${status}"`);
        if (startDate) errorDetails.push(`- Start date: "${startDate}"`);
        if (endDate) errorDetails.push(`- End date: "${endDate}"`);
        if (severity && severity !== 'all') errorDetails.push(`- Severity: "${severity}"`);
      } else if (skippedCount > 0) {
        errorMessage = `Found ${flaggedMessages.length} resolved flags, but ${skippedCount} were skipped because they don't have valid message references.`;
        errorDetails.push(`- Flags need valid message_id that exists in the messages table`);
        errorDetails.push(`- Check server console logs for details about which flags were skipped`);
      }
      
      console.error(`[EXPORT] Export failed: ${errorMessage}`);
      if (errorDetails.length > 0) {
        console.error(`[EXPORT] Details:`, errorDetails);
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: errorDetails.length > 0 ? errorDetails.join('\n') : undefined,
          foundFlags: flaggedMessages.length,
          exportedFlags: flaggedData.length
        },
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

