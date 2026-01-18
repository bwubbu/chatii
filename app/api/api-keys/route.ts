import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Regular client for user operations (uses anon key, respects RLS)
// This client is used for:
// - Token verification (getUser works with anon key when token is provided)
// - User-scoped queries that should respect RLS policies
// DO NOT use this client for admin operations - use supabaseAdmin instead
const supabase = createClient(
  supabaseUrl,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Admin client for admin operations (uses service role key, bypasses RLS)
// This client is used for:
// - Admin queries that need to see all data
// - Operations that require elevated permissions
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/api-keys
 * Fetch API keys for the authenticated user (or all keys if admin)
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token from Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 }
      );
    }

    // Check if user is admin
    // Match the admin email from admin page: "kyrodahero123@gmail.com"
    const adminEmail = process.env.ADMIN_EMAIL || "kyrodahero123@gmail.com";
    const isAdmin = user.email === adminEmail || user.email === "admin@fairnessai.com";
    
    // Check if this is an admin request to see all keys (only from admin page)
    const { searchParams } = new URL(request.url);
    const adminView = searchParams.get("admin") === "true" || searchParams.get("all") === "true";
    
    console.log(`[API Keys] User: ${user.email}, Admin Email Check: ${adminEmail}, Is Admin: ${isAdmin}, Admin View: ${adminView}`);
    console.log(`[API Keys] Service Role Key exists: ${!!supabaseServiceKey}`);
    
    // Build query - only show all keys if user is admin AND explicitly requesting admin view
    // Otherwise, always filter by user_id (even for admins on dev/profile pages)
    let clientToUse;
    let query;
    
    if (isAdmin && adminView) {
      // Admin on admin page: use service role client to see ALL keys
      clientToUse = supabaseAdmin;
      console.log(`[API Keys] Using admin client (service role - sees all keys for admin page)`);
      query = clientToUse
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false });
      console.log(`[API Keys] Admin query - no user_id filter (should see all keys)`);
    } else {
      // Regular user OR admin on dev/profile pages: use authenticated client to see only their own keys
      const userSupabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      });
      clientToUse = userSupabase;
      console.log(`[API Keys] Using authenticated user client (RLS will filter to user's own keys)`);
      query = clientToUse
        .from("api_keys")
        .select("*")
        .eq("user_id", user.id)  // Explicitly filter by user_id for extra safety
        .order("created_at", { ascending: false });
      console.log(`[API Keys] Filtering by user_id: ${user.id}${isAdmin ? ' (admin on dev/profile page)' : ''}`);
    }

    const { data: apiKeys, error } = await query;
    
    if (error) {
      console.error(`[API Keys] Query error (isAdmin: ${isAdmin}):`, error);
      console.error(`[API Keys] Error details:`, JSON.stringify(error, null, 2));
    } else {
      console.log(`[API Keys] Successfully fetched ${apiKeys?.length || 0} keys`);
      if (apiKeys && apiKeys.length > 0) {
        console.log(`[API Keys] User IDs in results:`, apiKeys.map((k: any) => k.user_id));
      }
    }

    if (error) {
      console.error("Error fetching API keys:", error);
      return NextResponse.json(
        { error: "Failed to fetch API keys", details: error.message },
        { status: 500 }
      );
    }

    // For admins viewing all keys (admin page), fetch user emails and don't return key snippets
    // For regular users or admins on dev/profile pages, return masked key version
    if (isAdmin && adminView) {
      // Fetch user emails for each API key
      const keysWithEmails = await Promise.all(
        (apiKeys || []).map(async (key: any) => {
          let userEmail = 'Unknown';
          
          // Only try to fetch email if user_id exists
          if (key.user_id) {
            try {
              const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(key.user_id);
              
              if (userError) {
                console.error(`Error fetching email for user ${key.user_id}:`, userError);
              } else if (userData?.user?.email) {
                userEmail = userData.user.email;
              } else {
                console.warn(`No email found for user ${key.user_id}`);
              }
            } catch (err) {
              console.error(`Exception fetching email for user ${key.user_id}:`, err);
            }
          } else {
            console.warn(`API key ${key.id} has no user_id`);
          }
          
          return {
            id: key.id,
            name: key.name,
            created_at: key.created_at,
            last_used: key.last_used,
            usage_count: key.usage_count,
            rate_limit: key.rate_limit,
            permissions: key.permissions,
            is_active: key.is_active,
            user_id: key.user_id,
            persona_id: key.persona_id,
            created_by: key.created_by,
            user_email: userEmail,
            custom_context: key.custom_context || null,
          };
        })
      );

      return NextResponse.json({
        apiKeys: keysWithEmails,
      });
    }

    // For regular users, return masked key version
    const sanitizedKeys = (apiKeys || []).map((key: any) => ({
      id: key.id,
      name: key.name,
      key: key.key ? `${key.key.substring(0, 8)}...${key.key.substring(key.key.length - 4)}` : null,
      created_at: key.created_at,
      last_used: key.last_used,
      usage_count: key.usage_count,
      rate_limit: key.rate_limit,
      permissions: key.permissions,
      is_active: key.is_active,
      user_id: key.user_id,
      persona_id: key.persona_id,
      created_by: key.created_by,
      custom_context: key.custom_context || null,
    }));

    return NextResponse.json({
      apiKeys: sanitizedKeys,
    });
  } catch (error) {
    console.error("API keys GET error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch API keys",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/api-keys
 * Generate a new API key for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth token from Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, persona_id, custom_context } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "API key name is required" },
        { status: 400 }
      );
    }

    if (!persona_id || !persona_id.trim()) {
      return NextResponse.json(
        { error: "Persona selection is required. Each API key must be associated with a specific persona." },
        { status: 400 }
      );
    }

    // Generate a secure API key
    const apiKey = `sk_${Buffer.from(`${Date.now()}-${Math.random().toString(36).substring(2, 15)}`).toString('base64').replace(/[^a-zA-Z0-9]/g, '')}`;

    // Verify persona exists
    const { data: persona, error: personaError } = await supabase
      .from("personas")
      .select("id")
      .eq("id", persona_id)
      .eq("is_active", true)
      .single();

    if (personaError || !persona) {
      return NextResponse.json(
        { error: "Invalid persona selected. Please choose an active persona." },
        { status: 400 }
      );
    }

    // Create an authenticated Supabase client for this user
    // This ensures auth.uid() is set correctly in RLS policies
    const userSupabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Insert the API key using the authenticated client
    const { data: newKey, error: insertError } = await userSupabase
      .from("api_keys")
      .insert({
        key: apiKey,
        name: name.trim(),
        user_id: user.id,
        persona_id: persona_id,
        created_by: user.id,
        custom_context: custom_context?.trim() || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating API key:", insertError);
      return NextResponse.json(
        { error: "Failed to create API key", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      api_key: apiKey,
      id: newKey.id,
      name: newKey.name,
      created_at: newKey.created_at,
      custom_context: newKey.custom_context || null,
    });
  } catch (error) {
    console.error("API keys POST error:", error);
    return NextResponse.json(
      {
        error: "Failed to create API key",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/api-keys
 * Delete an API key (soft delete by setting is_active to false, or hard delete)
 */
export async function DELETE(request: NextRequest) {
  console.log("[DELETE /api/api-keys] Request received");
  
  try {
    // Get auth token from Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[DELETE /api/api-keys] Missing authorization header");
      return NextResponse.json(
        { error: "Unauthorized - Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.log("[DELETE /api/api-keys] Invalid token");
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 }
      );
    }

    console.log("[DELETE /api/api-keys] User authenticated:", user.email);

    // Get keyId from request body or query params
    let keyId: string | null = null;
    
    // Check content-type to determine if body should be parsed
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        const body = await request.json();
        console.log("[DELETE /api/api-keys] Request body:", body);
        keyId = body.keyId || body.id || null;
      } catch (e) {
        console.warn("[DELETE /api/api-keys] Failed to parse body:", e);
      }
    }
    
    // If not found in body, try query params
    if (!keyId) {
      const { searchParams } = new URL(request.url);
      keyId = searchParams.get("id");
      console.log("[DELETE /api/api-keys] KeyId from query params:", keyId);
    }

    if (!keyId) {
      console.log("[DELETE /api/api-keys] Missing keyId");
      return NextResponse.json(
        { error: "API key ID is required" },
        { status: 400 }
      );
    }

    console.log("[DELETE /api/api-keys] Deleting key:", keyId);

    // Check if user is admin
    const adminEmail = process.env.ADMIN_EMAIL || "kyrodahero123@gmail.com";
    const isAdmin = user.email === adminEmail || user.email === "admin@fairnessai.com";
    
    // For admins, use service role client to delete any key
    // For regular users, use authenticated client to delete only their own keys
    let clientToUse;
    
    if (isAdmin) {
      // Admin: use service role client to delete any key
      clientToUse = supabaseAdmin;
      console.log("[DELETE /api/api-keys] Admin deleting - using service role client");
    } else {
      // Regular user: use authenticated client (RLS will enforce ownership)
      clientToUse = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      });
      console.log("[DELETE /api/api-keys] User deleting - using authenticated client");
    }
    
    // First, check if the key exists
    const { data: existingKey, error: fetchError } = await clientToUse
      .from("api_keys")
      .select("user_id")
      .eq("id", keyId)
      .single();

    if (fetchError || !existingKey) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    // For regular users, double-check ownership (RLS should handle this, but extra safety)
    if (!isAdmin && existingKey.user_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized - You can only delete your own API keys" },
        { status: 403 }
      );
    }

    // Delete the key using the appropriate client
    // Admin client can delete any key, user client can only delete their own (enforced by RLS)
    const { error: deleteError } = await clientToUse
      .from("api_keys")
      .delete()
      .eq("id", keyId);

    if (deleteError) {
      console.error("Error deleting API key:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete API key", details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "API key deleted successfully",
    });
  } catch (error) {
    console.error("API keys DELETE error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete API key",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/api-keys
 * Update an API key's custom context
 */
export async function PATCH(request: NextRequest) {
  try {
    // Get auth token from Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { keyId, custom_context } = body;

    if (!keyId) {
      return NextResponse.json(
        { error: "API key ID is required" },
        { status: 400 }
      );
    }

    // Check if user is admin
    const adminEmail = process.env.ADMIN_EMAIL || "kyrodahero123@gmail.com";
    const isAdmin = user.email === adminEmail || user.email === "admin@fairnessai.com";
    
    // Create appropriate client
    const userSupabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const clientToUse = isAdmin ? supabaseAdmin : userSupabase;

    // First, check if the key exists and user has permission
    const { data: existingKey, error: fetchError } = await clientToUse
      .from("api_keys")
      .select("user_id")
      .eq("id", keyId)
      .single();

    if (fetchError || !existingKey) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }

    // For regular users, verify ownership
    if (!isAdmin && existingKey.user_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized - You can only update your own API keys" },
        { status: 403 }
      );
    }

    // Update the custom context
    const { data: updatedKey, error: updateError } = await clientToUse
      .from("api_keys")
      .update({
        custom_context: custom_context?.trim() || null,
      })
      .eq("id", keyId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating API key:", updateError);
      return NextResponse.json(
        { error: "Failed to update API key", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "API key updated successfully",
      api_key: {
        id: updatedKey.id,
        name: updatedKey.name,
        custom_context: updatedKey.custom_context,
      },
    });
  } catch (error) {
    console.error("API keys PATCH error:", error);
    return NextResponse.json(
      {
        error: "Failed to update API key",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
