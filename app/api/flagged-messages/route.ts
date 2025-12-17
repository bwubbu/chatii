import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/flagged-messages
 * Get all flagged messages with context and reporter info (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const adminEmail = process.env.ADMIN_EMAIL || "kyrodahero123@gmail.com";
    if (user.email !== adminEmail) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    // Fetch all pending flagged messages using admin client (bypasses RLS)
    const { data: flaggedMessages, error: flaggedError } = await supabaseAdmin
      .from("flagged_messages")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (flaggedError) {
      console.error("Error fetching flagged messages:", flaggedError);
      return NextResponse.json(
        { error: "Failed to fetch flagged messages", details: flaggedError.message },
        { status: 500 }
      );
    }

    // Count how many approved flags exist in flag_training_data (used for negative examples)
    const { count: approvedCount, error: trainingCountError } = await supabaseAdmin
      .from("flag_training_data")
      .select("*", { count: "exact", head: true });

    if (trainingCountError) {
      console.error("Error counting approved flags:", trainingCountError);
    }

    // Enrich each flagged message with additional data
    const enrichedMessages = await Promise.all(
      (flaggedMessages || []).map(async (flag) => {
        try {
          // Get the message details
          const { data: message } = await supabaseAdmin
            .from("messages")
            .select("id, conversation_id, content, sender, created_at")
            .eq("id", flag.message_id)
            .single();

          if (!message) {
            return { ...flag, error: "Message not found" };
          }

          // Get conversation and persona info
          const { data: conversation } = await supabaseAdmin
            .from("conversations")
            .select("persona_id")
            .eq("id", message.conversation_id)
            .single();

          let persona = null;
          if (conversation?.persona_id) {
            const { data: personaData } = await supabaseAdmin
              .from("personas")
              .select("id, title, avatar_url")
              .eq("id", conversation.persona_id)
              .single();
            persona = personaData;
          }

          // Get the previous user message (context)
          const { data: previousMessages } = await supabaseAdmin
            .from("messages")
            .select("content, sender, created_at")
            .eq("conversation_id", message.conversation_id)
            .lt("created_at", message.created_at)
            .order("created_at", { ascending: false })
            .limit(10);

          const previousUserMessage = previousMessages?.find(m => m.sender === "user");

          // Get reporter email and count previous reports
          const { data: reporterData } = await supabaseAdmin.auth.admin.getUserById(flag.user_id);
          const { count: previousReportsCount } = await supabaseAdmin
            .from("flagged_messages")
            .select("*", { count: "exact", head: true })
            .eq("user_id", flag.user_id)
            .neq("id", flag.id);

          return {
            ...flag,
            message_content: message.content,
            persona: persona ? {
              id: persona.id,
              name: persona.title,
              avatar_url: persona.avatar_url
            } : null,
            context: previousUserMessage?.content || null,
            reporter: {
              email: reporterData?.user?.email || "Unknown",
              previous_reports: previousReportsCount || 0
            }
          };
        } catch (err) {
          console.error(`Error enriching flagged message ${flag.id}:`, err);
          return { ...flag, error: "Failed to load details" };
        }
      })
    );

    return NextResponse.json({ 
      messages: enrichedMessages,
      approvedCount: approvedCount || 0,
    });
  } catch (error: any) {
    console.error("Flagged messages GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/flagged-messages
 * Update flagged message status (approve/remove) (admin only)
 */
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const adminEmail = process.env.ADMIN_EMAIL || "kyrodahero123@gmail.com";
    if (user.email !== adminEmail) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const { flagId, action } = await request.json();

    if (!flagId || !action) {
      return NextResponse.json(
        { error: "Flag ID and action are required" },
        { status: 400 }
      );
    }

    // First, get the flagged message details before updating
    const { data: flaggedMessage, error: fetchError } = await supabaseAdmin
      .from("flagged_messages")
      .select("*")
      .eq("id", flagId)
      .single();

    if (fetchError || !flaggedMessage) {
      return NextResponse.json(
        { error: "Flagged message not found" },
        { status: 404 }
      );
    }

    let status: string;
    if (action === "approve") {
      status = "resolved"; // Mark as resolved when approved
      
      // Get the message details for training data
      const { data: message } = await supabaseAdmin
        .from("messages")
        .select("id, conversation_id, content, sender, created_at")
        .eq("id", flaggedMessage.message_id)
        .single();

      if (message) {
        // Get conversation and persona info
        const { data: conversation } = await supabaseAdmin
          .from("conversations")
          .select("persona_id")
          .eq("id", message.conversation_id)
          .single();

        // Get the previous user message (context)
        const { data: previousMessages } = await supabaseAdmin
          .from("messages")
          .select("content, sender, created_at")
          .eq("conversation_id", message.conversation_id)
          .lt("created_at", message.created_at)
          .order("created_at", { ascending: false })
          .limit(10);

        const previousUserMessage = previousMessages?.find(m => m.sender === "user");

        // Save to training data for fine-tuning
        const { error: trainingDataError } = await supabaseAdmin
          .from("flag_training_data")
          .insert({
            flagged_message_id: flagId,
            message_id: message.id,
            conversation_id: message.conversation_id,
            persona_id: conversation?.persona_id || null,
            flagged_content: message.content,
            context: previousUserMessage?.content || null,
            reason: flaggedMessage.reason,
            severity: flaggedMessage.severity || "high",
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString()
          });

        if (trainingDataError) {
          console.error("Error saving training data:", trainingDataError);
          // Continue with the approval even if training data save fails
        }
      }
    } else if (action === "remove") {
      status = "dismissed"; // Mark as dismissed when removed (false flag)
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'approve' or 'remove'" },
        { status: 400 }
      );
    }

    // Update flagged message using admin client (bypasses RLS)
    const { error: updateError } = await supabaseAdmin
      .from("flagged_messages")
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", flagId);

    if (updateError) {
      console.error("Error updating flagged message:", updateError);
      return NextResponse.json(
        { error: "Failed to update flagged message", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: action === "approve" 
        ? "Flag approved and saved for fine-tuning" 
        : "Flag removed (false flag)"
    });
  } catch (error: any) {
    console.error("Flagged messages PATCH error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}


