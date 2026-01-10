import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { queryFeedbackConversationsWithClient, convertToJSONL, convertToEmbeddingJSONL } from "@/lib/feedback-export";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const ADMIN_EMAIL = "kyrodahero123@gmail.com";

// Create admin client for querying (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/export-feedback
 * Export feedback data with conversations for training
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
    const minScore = searchParams.get("minScore")
      ? parseFloat(searchParams.get("minScore")!)
      : undefined;
    const maxScore = searchParams.get("maxScore")
      ? parseFloat(searchParams.get("maxScore")!)
      : undefined;
    const personaId = searchParams.get("personaId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const format = searchParams.get("format") || "embedding"; // "embedding" or "finetuning"

    // Validate parameters
    if (minScore !== undefined && (isNaN(minScore) || minScore < 0 || minScore > 5)) {
      return NextResponse.json(
        { error: "Invalid minScore: must be between 0 and 5" },
        { status: 400 }
      );
    }

    if (maxScore !== undefined && (isNaN(maxScore) || maxScore < 0 || maxScore > 5)) {
      return NextResponse.json(
        { error: "Invalid maxScore: must be between 0 and 5" },
        { status: 400 }
      );
    }

    if (minScore !== undefined && maxScore !== undefined && minScore > maxScore) {
      return NextResponse.json(
        { error: "minScore must be less than or equal to maxScore" },
        { status: 400 }
      );
    }

    // Query feedback conversations using admin client
    const conversations = await queryFeedbackConversationsWithClient(supabaseAdmin, {
      minScore,
      maxScore,
      personaId,
      startDate,
      endDate,
    });

    if (conversations.length === 0) {
      return NextResponse.json(
        { error: "No conversations found matching the specified filters" },
        { status: 404 }
      );
    }

    // Convert to JSONL format based on selected format
    const jsonlContent = format === "finetuning" 
      ? convertToJSONL(conversations)
      : convertToEmbeddingJSONL(conversations);

    // Generate filename with timestamp and format
    const timestamp = new Date().toISOString().split("T")[0];
    const scoreRange = minScore !== undefined || maxScore !== undefined
      ? `_${minScore ?? 0}-${maxScore ?? 5}`
      : "";
    const formatSuffix = format === "embedding" ? "_embedding" : "_finetuning";
    const filename = `feedback_training_data${formatSuffix}${scoreRange}_${timestamp}.jsonl`;

    // Return as downloadable file
    return new NextResponse(jsonlContent, {
      status: 200,
      headers: {
        "Content-Type": "application/jsonl",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Export feedback error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

