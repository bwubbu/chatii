import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export interface APIKeyInfo {
  id: string;
  key: string;
  user_id: string;
  name: string;
  persona_id: string;
  is_active: boolean;
  usage_count: number;
  rate_limit: number;
  last_used: string | null;
  permissions: string[];
}

/**
 * Verify an API key and return its information
 * Also updates usage statistics
 */
export async function verifyAPIKey(apiKey: string): Promise<APIKeyInfo | null> {
  try {
    // Look up the API key in the database
    const { data: keyData, error } = await supabaseAdmin
      .from("api_keys")
      .select("*")
      .eq("key", apiKey)
      .eq("is_active", true)
      .single();

    if (error || !keyData) {
      return null;
    }

    // Check rate limiting (simple hourly limit)
    const now = new Date();
    if (keyData.last_used) {
      const lastUsed = new Date(keyData.last_used);
      const hoursSinceLastUse = (now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60);
      
      // Reset counter if more than 1 hour has passed
      if (hoursSinceLastUse >= 1) {
        await supabaseAdmin
          .from("api_keys")
          .update({ usage_count: 0 })
          .eq("id", keyData.id);
        keyData.usage_count = 0;
      }
      
      // Check if rate limit exceeded
      if (keyData.usage_count >= keyData.rate_limit) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
    }

    // Update usage statistics
    await supabaseAdmin
      .from("api_keys")
      .update({
        last_used: now.toISOString(),
        usage_count: (keyData.usage_count || 0) + 1,
      })
      .eq("id", keyData.id);

    return {
      id: keyData.id,
      key: keyData.key,
      user_id: keyData.user_id,
      name: keyData.name,
      persona_id: keyData.persona_id,
      is_active: keyData.is_active,
      usage_count: (keyData.usage_count || 0) + 1,
      rate_limit: keyData.rate_limit || 100,
      last_used: now.toISOString(),
      permissions: keyData.permissions || ["persona:read", "chat:create"],
    };
  } catch (error) {
    console.error("Error verifying API key:", error);
    if (error instanceof Error && error.message.includes("Rate limit")) {
      throw error;
    }
    return null;
  }
}

/**
 * Extract API key from Authorization header
 * Supports both "Bearer sk_..." and "sk_..." formats
 */
export function extractAPIKey(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  // Remove "Bearer " prefix if present
  const key = authHeader.startsWith("Bearer ") 
    ? authHeader.replace("Bearer ", "").trim()
    : authHeader.trim();

  // Verify it starts with "sk_"
  if (key.startsWith("sk_")) {
    return key;
  }

  return null;
}
