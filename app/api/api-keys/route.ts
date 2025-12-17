import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/api-keys
 * List API keys - users see their own, admins see all
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

    const adminEmail = process.env.ADMIN_EMAIL || "kyrodahero123@gmail.com";
    const isAdmin = user.email === adminEmail;

    let query = supabaseAdmin
      .from("api_keys")
      .select("id, name, created_at, last_used, usage_count, rate_limit, is_active, user_id, permissions, persona_id")
      .order("created_at", { ascending: false });

    if (!isAdmin) {
      query = query.eq("user_id", user.id);
    }

    const { data: apiKeys, error } = await query;

    if (error) {
      console.error("Error fetching API keys:", error);
      return NextResponse.json({ error: "Failed to fetch API keys" }, { status: 500 });
    }

    // For admins, enrich API keys with user email so the dashboard can show "who generated" each key
    let enrichedKeys = apiKeys || [];
    if (isAdmin && enrichedKeys.length > 0) {
      const enriched = [];
      for (const key of enrichedKeys) {
        let userEmail: string | null = null;
        let personaName: string | null = null;

        // Lookup owner email
        if (key.user_id) {
          try {
            const { data: userData, error: userFetchError } = await supabaseAdmin.auth.admin.getUserById(key.user_id);
            if (!userFetchError && userData?.user?.email) {
              userEmail = userData.user.email;
            }
          } catch (e) {
            console.error("Error fetching user for API key:", e);
          }
        }

        // Lookup persona name (type of persona)
        if (key.persona_id) {
          try {
            const { data: personaData, error: personaError } = await supabaseAdmin
              .from("personas")
              .select("title")
              .eq("id", key.persona_id)
              .single();
            if (!personaError && personaData?.title) {
              personaName = personaData.title;
            }
          } catch (e) {
            console.error("Error fetching persona for API key:", e);
          }
        }

        enriched.push({ ...key, user_email: userEmail, persona_name: personaName });
      }
      enrichedKeys = enriched;
    }

    return NextResponse.json({ apiKeys: enrichedKeys });
  } catch (error: any) {
    console.error("API keys GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/api-keys
 * Generate a new API key (users can generate their own)
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

    const { name, persona_id } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Require persona_id for all new API keys
    if (!persona_id) {
      return NextResponse.json(
        { error: "persona_id is required. All API keys must be linked to a specific persona." },
        { status: 400 }
      );
    }

    // Validate persona_id
    const { data: persona, error: personaError } = await supabaseAdmin
      .from("personas")
      .select("id")
      .eq("id", persona_id)
      .eq("is_active", true)
      .single();

    if (personaError || !persona) {
      return NextResponse.json({ error: "Invalid persona selected" }, { status: 400 });
    }

    // Generate API key
    const timestamp = Date.now().toString();
    const randomBytes = crypto.randomBytes(16).toString("hex");
    const rawKey = `${user.id}:${name}:${timestamp}:${randomBytes}`;
    const apiKey = `pk_fairness_${crypto.createHash("sha256").update(rawKey).digest("hex").substring(0, 32)}`;

    // Hash the key for storage (one-way encryption)
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

    // Store in database (hash only, not the plain key)
    const keyData: any = {
      key: apiKey, // Store plain key temporarily for migration compatibility
      key_hash: keyHash, // Store hashed version for verification
      user_id: user.id,
      name: name.trim(),
      created_by: user.id,
      rate_limit: 100,
      permissions: ["persona:read", "chat:create"],
      is_active: true,
    };

    // Add persona_id (column may not exist in older databases, so this is best-effort)
    keyData.persona_id = persona_id;

    const { data: newKey, error: insertError } = await supabaseAdmin
      .from("api_keys")
      .insert(keyData)
      .select("id, name, created_at, user_id, rate_limit, is_active, persona_id")
      .single();

    if (insertError) {
      console.error("Error creating API key:", insertError);
      return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
    }

    // Get persona name if persona_id was provided
    let personaName = null;
    if (persona_id) {
      const { data: persona } = await supabaseAdmin
        .from("personas")
        .select("title")
        .eq("id", persona_id)
        .single();
      personaName = persona?.title || null;
    }

    // Return the plain key only once (user must save it)
    return NextResponse.json({
      api_key: apiKey,
      key_id: newKey.id,
      name: newKey.name,
      persona_id: persona_id || null,
      persona_name: personaName,
      message: "API key generated successfully. Save this key now - it won't be shown again!",
      warning: "This is the only time you'll see this key. Make sure to copy and save it securely.",
      documentation: "http://localhost:8002/docs",
      rate_limit: "100 requests per hour",
    });
  } catch (error: any) {
    console.error("API keys POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/api-keys
 * Delete an API key (users can delete their own, admins can delete any)
 */
export async function DELETE(request: NextRequest) {
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

    const { keyId } = await request.json();

    if (!keyId) {
      return NextResponse.json({ error: "Key ID is required" }, { status: 400 });
    }

    const adminEmail = process.env.ADMIN_EMAIL || "kyrodahero123@gmail.com";
    const isAdmin = user.email === adminEmail;

    if (!isAdmin) {
      const { data: keyData, error: fetchError } = await supabaseAdmin
        .from("api_keys")
        .select("user_id")
        .eq("id", keyId)
        .single();

      if (fetchError || !keyData) {
        return NextResponse.json({ error: "API key not found" }, { status: 404 });
      }

      if (keyData.user_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { error: deleteError } = await supabaseAdmin
      .from("api_keys")
      .delete()
      .eq("id", keyId);

    if (deleteError) {
      console.error("Error deleting API key:", deleteError);
      return NextResponse.json({ error: "Failed to delete API key" }, { status: 500 });
    }

    return NextResponse.json({ message: "API key deleted successfully" });
  } catch (error: any) {
    console.error("API keys DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

