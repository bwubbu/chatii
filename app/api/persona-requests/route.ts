import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/persona-requests
 * Get all persona requests with user emails (admin only)
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

    // Fetch all persona requests using admin client (bypasses RLS)
    const { data: requests, error: requestsError } = await supabaseAdmin
      .from("persona_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (requestsError) {
      console.error("Error fetching persona requests:", requestsError);
      return NextResponse.json(
        { error: "Failed to fetch persona requests", details: requestsError.message },
        { status: 500 }
      );
    }

    // Fetch user emails for each request
    const requestsWithEmails = await Promise.all(
      (requests || []).map(async (request) => {
        try {
          const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(request.user_id);
          return {
            ...request,
            user_email: userData?.user?.email || 'Unknown'
          };
        } catch (err) {
          console.error(`Error fetching email for user ${request.user_id}:`, err);
          return {
            ...request,
            user_email: 'Unknown'
          };
        }
      })
    );

    return NextResponse.json({ 
      requests: requestsWithEmails 
    });
  } catch (error: any) {
    console.error("Persona requests GET error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/persona-requests
 * Update persona request status and admin notes (admin only)
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

    const { requestId, status, admin_notes } = await request.json();

    if (!requestId || !status) {
      return NextResponse.json(
        { error: "Request ID and status are required" },
        { status: 400 }
      );
    }

    // Update request using admin client (bypasses RLS)
    const { error: updateError } = await supabaseAdmin
      .from("persona_requests")
      .update({
        status,
        admin_notes: admin_notes || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", requestId);

    if (updateError) {
      console.error("Error updating persona request:", updateError);
      return NextResponse.json(
        { error: "Failed to update request", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: "Request updated successfully"
    });
  } catch (error: any) {
    console.error("Persona requests PATCH error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}






