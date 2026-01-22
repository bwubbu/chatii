import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_EMAIL = "kyrodahero123@gmail.com";

// Create admin client for querying (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * PATCH /api/flagged-messages
 * Update flagged message status (admin only)
 */
export async function PATCH(request: NextRequest) {
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

    const { flagId, status } = await request.json();

    if (!flagId || !status) {
      return NextResponse.json(
        { error: "Flag ID and status are required" },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = {
      status
    };

    // Optionally add reviewed_by and reviewed_at if they exist in schema
    // We'll try to add them, but if they don't exist, the update will still work
    try {
      updateData.reviewed_by = user.id;
      updateData.reviewed_at = new Date().toISOString();
    } catch (e) {
      // Ignore if these fields don't exist
    }

    // Update flagged message using admin client (bypasses RLS)
    const { data, error: updateError } = await supabaseAdmin
      .from("flagged_messages")
      .update(updateData)
      .eq("id", flagId)
      .select()
      .single();

    if (updateError) {
      // If error is about missing columns, try without them
      if (updateError.message?.includes('reviewed_by') || 
          updateError.message?.includes('reviewed_at') || 
          updateError.code === '42703') {
        const { data: retryData, error: retryError } = await supabaseAdmin
          .from("flagged_messages")
          .update({ status })
          .eq("id", flagId)
          .select()
          .single();

        if (retryError) {
          console.error("Error updating flagged message:", retryError);
          return NextResponse.json(
            { error: "Failed to update flagged message", details: retryError.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          flag: retryData,
          message: "Flagged message updated successfully"
        });
      }

      console.error("Error updating flagged message:", updateError);
      return NextResponse.json(
        { error: "Failed to update flagged message", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      flag: data,
      message: "Flagged message updated successfully"
    });
  } catch (error: any) {
    console.error("Flagged messages PATCH error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/flagged-messages
 * Get all flagged messages with persona information (admin only)
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

    // Fetch all flagged messages using admin client (bypasses RLS)
    const { data: flaggedMessages, error: flaggedError } = await supabaseAdmin
      .from("flagged_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (flaggedError) {
      console.error("Error fetching flagged messages:", flaggedError);
      return NextResponse.json(
        { error: "Failed to fetch flagged messages", details: flaggedError.message },
        { status: 500 }
      );
    }

    // Enrich with persona info, user context, and reporter info
    const enrichedData = await Promise.all((flaggedMessages || []).map(async (flag: any) => {
      let persona = null;
      let userContext = null;
      let previousReportsCount = 0;
      let reporterEmail = null;

      // Get message and conversation info
      if (flag.message_id) {
        try {
          const { data: message, error: messageError } = await supabaseAdmin
            .from("messages")
            .select("conversation_id, created_at")
            .eq("id", flag.message_id)
            .single();

          if (!messageError && message?.conversation_id) {
            // Get conversation and persona
            const { data: conversation, error: convError } = await supabaseAdmin
              .from("conversations")
              .select("persona_id")
              .eq("id", message.conversation_id)
              .single();

            if (!convError && conversation?.persona_id) {
              const { data: personaData, error: personaError } = await supabaseAdmin
                .from("personas")
                .select("id, title, avatar_url")
                .eq("id", conversation.persona_id)
                .single();

              if (!personaError && personaData) {
                persona = personaData;
              } else {
                console.warn(`Persona not found for ID: ${conversation.persona_id}`, personaError);
              }

              // Get user message context (the message before the flagged one)
              const { data: userMessage } = await supabaseAdmin
                .from("messages")
                .select("content")
                .eq("conversation_id", message.conversation_id)
                .eq("sender", "user")
                .lt("created_at", message.created_at)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              userContext = userMessage?.content || null;
            } else {
              console.warn(`Conversation not found for ID: ${message.conversation_id}`, convError);
            }
          } else {
            console.warn(`Message not found for ID: ${flag.message_id}`, messageError);
          }
        } catch (err: any) {
          console.error(`Error fetching message/conversation for flag ${flag.id}:`, err);
        }
      }

      // Get reporter info
      if (flag.user_id) {
        try {
          const { data: reporterUser } = await supabaseAdmin.auth.admin.getUserById(flag.user_id);
          reporterEmail = reporterUser?.user?.email || null;

          // Count previous reports by this user (before this flag was created)
          const { count } = await supabaseAdmin
            .from("flagged_messages")
            .select("*", { count: "exact", head: true })
            .eq("user_id", flag.user_id)
            .lt("created_at", flag.created_at);

          previousReportsCount = count || 0;
        } catch (err) {
          // Ignore errors getting reporter info
        }
      }

      return {
        ...flag,
        persona,
        userContext,
        previousReportsCount,
        reporterEmail,
      };
    }));

    return NextResponse.json({
      success: true,
      flaggedMessages: enrichedData,
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
 * DELETE /api/flagged-messages
 * Delete all flagged messages (admin only) - useful for testing
 */
export async function DELETE(request: NextRequest) {
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
    const deleteAll = searchParams.get("all") === "true";

    if (!deleteAll) {
      return NextResponse.json(
        { error: "To delete all flags, add ?all=true to the URL" },
        { status: 400 }
      );
    }

    // Delete all flagged messages using admin client (bypasses RLS)
    const { data, error: deleteError } = await supabaseAdmin
      .from("flagged_messages")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all (using a condition that's always true)

    if (deleteError) {
      console.error("Error deleting flagged messages:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete flagged messages", details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "All flagged messages deleted successfully",
      deletedCount: data?.length || 0
    });
  } catch (error: any) {
    console.error("Flagged messages DELETE error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
