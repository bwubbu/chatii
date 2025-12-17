import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Helper to get base URL for internal API calls
function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * POST /api/moderation/ingest-flags
 * Admin-only endpoint that:
 * - Counts approved flags in flag_training_data
 * - If >= threshold, generates embeddings and stores them in flag_negative_examples
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

    const adminEmail = process.env.ADMIN_EMAIL || "kyrodahero123@gmail.com";
    if (user.email !== adminEmail) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const THRESHOLD = 50;

    // Find training rows that don't yet have negative examples
    const { data: trainingRows, error: trainingError } = await supabaseAdmin
      .from("flag_training_data")
      .select("id, persona_id, flagged_content, context, reason, severity")
      .order("created_at", { ascending: false });

    if (trainingError) {
      console.error("Error fetching flag_training_data:", trainingError);
      return NextResponse.json(
        { error: "Failed to fetch training data", details: trainingError.message },
        { status: 500 }
      );
    }

    if (!trainingRows || trainingRows.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No approved flags available in training data yet.",
        totalApproved: 0,
        processed: 0,
      });
    }

    // Filter out ones already ingested into flag_negative_examples
    const { data: existingExamples, error: examplesError } = await supabaseAdmin
      .from("flag_negative_examples")
      .select("flag_training_id");

    if (examplesError) {
      console.error("Error fetching existing negative examples:", examplesError);
      return NextResponse.json(
        { error: "Failed to fetch existing negative examples", details: examplesError.message },
        { status: 500 }
      );
    }

    const alreadyIngested = new Set((existingExamples || []).map(row => row.flag_training_id));
    const pending = trainingRows.filter(row => !alreadyIngested.has(row.id));

    if (pending.length < THRESHOLD) {
      return NextResponse.json({
        success: false,
        message: `Need at least ${THRESHOLD} approved flags to generate negative examples. Currently have ${pending.length} new approved flags.`,
        totalApproved: pending.length,
        processed: 0,
      });
    }

    const baseUrl = getBaseUrl();
    let processed = 0;
    const errors: any[] = [];

    for (const row of pending) {
      try {
        const textParts = [
          `FLAGGED RESPONSE (UNACCEPTABLE BEHAVIOR):`,
          `Reason: ${row.reason}`,
          row.severity ? `Severity: ${row.severity}` : "",
          row.context ? `User context: ${row.context}` : "",
          `Assistant response: ${row.flagged_content}`,
        ].filter(Boolean);

        const content = textParts.join("\n");

        // Generate embedding using existing embeddings API
        const embedRes = await fetch(`${baseUrl}/api/embeddings/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: content }),
        });

        if (!embedRes.ok) {
          const errJson = await embedRes.json().catch(() => ({}));
          console.error("Embedding generation failed:", errJson);
          errors.push({ id: row.id, error: "embedding_failed", details: errJson });
          continue;
        }

        const embedData = await embedRes.json();
        const embedding = embedData.embedding;

        if (!embedding || !Array.isArray(embedding) || embedding.length !== 1536) {
          console.error("Invalid embedding for flag_training_id:", row.id);
          errors.push({ id: row.id, error: "invalid_embedding" });
          continue;
        }

        const { error: insertError } = await supabaseAdmin
          .from("flag_negative_examples")
          .insert({
            flag_training_id: row.id,
            persona_id: row.persona_id || null,
            content,
            reason: row.reason,
            severity: row.severity || null,
            embedding,
            metadata: {
              source: "flag_training_data",
              created_from_flag: true,
            },
          });

        if (insertError) {
          console.error("Error inserting negative example:", insertError);
          errors.push({ id: row.id, error: "insert_failed", details: insertError.message });
          continue;
        }

        processed += 1;
      } catch (e: any) {
        console.error("Unexpected error ingesting flag_training_data row:", e);
        errors.push({ id: row.id, error: "unexpected", details: e?.message });
      }
    }

    return NextResponse.json({
      success: processed > 0,
      message: processed > 0
        ? `Successfully generated ${processed} negative examples from approved flags.`
        : "No negative examples were generated.",
      totalApproved: pending.length,
      processed,
      errors,
    });
  } catch (error: any) {
    console.error("Ingest flags error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

