import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/flag-message
 * Flag a message (users can flag their own messages)
 */
export async function POST(request: NextRequest) {
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

    const { message_id, content, reason, severity, flag_type, conversation_id } = await request.json();

    if (!content || !reason) {
      return NextResponse.json(
        { error: "Missing required fields: content and reason are required" },
        { status: 400 }
      );
    }

    // Check if message_id is a valid UUID or a timestamp
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let actualMessageId = message_id;

    // If message_id is not a UUID (it's a timestamp), find the message in the database
    if (!uuidRegex.test(message_id) && conversation_id) {
      const { data: foundMessage } = await supabaseAdmin
        .from("messages")
        .select("id")
        .eq("conversation_id", conversation_id)
        .eq("content", content)
        .eq("sender", "assistant")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (foundMessage) {
        actualMessageId = foundMessage.id;
      } else {
        // If we can't find the message, we can still flag it but without message_id
        // The content and reason are still valuable for moderation
        console.warn("Could not find message in database, flagging without message_id reference");
      }
    }

    // Insert flag using admin client (bypasses RLS)
    const insertData: any = {
      user_id: user.id,
      content,
      reason,
      severity: severity || 'medium',
      flag_type: flag_type || 'inappropriate',
      status: "pending"
    };

    // Only include message_id if we have a valid UUID
    if (actualMessageId && uuidRegex.test(actualMessageId)) {
      insertData.message_id = actualMessageId;
    }

    const { data, error } = await supabaseAdmin
      .from("flagged_messages")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error flagging message:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return NextResponse.json(
        { 
          error: "Failed to flag message",
          details: error.message || error.details || error.hint 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      flag: data,
      message: "Message flagged successfully"
    });
  } catch (error: any) {
    console.error("Flag message POST error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}






