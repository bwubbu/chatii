import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Admin client for admin operations
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
    const isAdmin = user.email === process.env.ADMIN_EMAIL || user.email === "admin@fairnessai.com";
    
    // Build query - admins see all keys, users see only their own
    let query = supabase
      .from("api_keys")
      .select("*")
      .order("created_at", { ascending: false });

    if (!isAdmin) {
      query = query.eq("user_id", user.id);
    }

    const { data: apiKeys, error } = await query;

    if (error) {
      console.error("Error fetching API keys:", error);
      return NextResponse.json(
        { error: "Failed to fetch API keys", details: error.message },
        { status: 500 }
      );
    }

    // For admins, fetch user emails and don't return key snippets
    // For regular users, return masked key version
    if (isAdmin) {
      // Fetch user emails for each API key
      const keysWithEmails = await Promise.all(
        (apiKeys || []).map(async (key: any) => {
          try {
            const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(key.user_id);
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
              user_email: userData?.user?.email || 'Unknown'
            };
          } catch (err) {
            console.error(`Error fetching email for user ${key.user_id}:`, err);
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
              user_email: 'Unknown'
            };
          }
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
    const { name, persona_id } = body;

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

    // Insert the API key
    const { data: newKey, error: insertError } = await supabase
      .from("api_keys")
      .insert({
        key: apiKey,
        name: name.trim(),
        user_id: user.id,
        persona_id: persona_id,
        created_by: user.id,
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

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get("id");

    if (!keyId) {
      return NextResponse.json(
        { error: "API key ID is required" },
        { status: 400 }
      );
    }

    // Check if user is admin or owns the key
    const isAdmin = user.email === process.env.ADMIN_EMAIL || user.email === "admin@fairnessai.com";
    
    // First, check if the key exists and user has permission
    const { data: existingKey, error: fetchError } = await supabase
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

    if (!isAdmin && existingKey.user_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized - You can only delete your own API keys" },
        { status: 403 }
      );
    }

    // Delete the key
    const { error: deleteError } = await supabase
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
