import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseAndValidateJSONL, ParsedTrainingEntry } from "@/lib/training-data-import";
import { generateEmbedding } from "@/lib/embedding-utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_EMAIL = "kyrodahero123@gmail.com";

// Create admin client for database operations (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Batch size for embedding generation (to avoid rate limits)
const EMBEDDING_BATCH_SIZE = 10;

/**
 * POST /api/upload-training-data
 * Upload and process training data JSONL file
 * Admin only endpoint
 */
export async function POST(request: NextRequest) {
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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith(".jsonl")) {
      return NextResponse.json(
        { error: "Invalid file type. Only .jsonl files are allowed" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Read file content
    const fileContent = await file.text();

    // Parse and validate JSONL
    const { entries, errors: parseErrors, warnings, stats } = parseAndValidateJSONL(fileContent);

    if (entries.length === 0) {
      return NextResponse.json(
        {
          error: "No valid entries found in file",
          parseErrors,
          warnings,
          stats,
        },
        { status: 400 }
      );
    }

    // Separate positive and negative examples
    const positiveEntries = entries.filter((e) => e.type === "positive_example");
    const negativeEntries = entries.filter((e) => e.type === "negative_example");

    const results = {
      total: entries.length,
      positive: {
        processed: 0,
        skipped: 0,
        errors: [] as string[],
      },
      negative: {
        processed: 0,
        skipped: 0,
        errors: [] as string[],
      },
      parseErrors,
      warnings,
      stats,
    };

    // Process positive examples
    if (positiveEntries.length > 0) {
      await processPositiveExamples(positiveEntries, results.positive);
    }

    // Process negative examples
    if (negativeEntries.length > 0) {
      await processNegativeExamples(negativeEntries, results.negative);
    }

    const totalProcessed = results.positive.processed + results.negative.processed;
    const totalSkipped = results.positive.skipped + results.negative.skipped;
    const message = totalSkipped > 0
      ? `Successfully processed ${totalProcessed} of ${entries.length} entries (${totalSkipped} duplicates skipped)`
      : `Successfully processed ${totalProcessed} of ${entries.length} entries`;

    return NextResponse.json({
      success: true,
      message,
      results,
    });
  } catch (error) {
    console.error("Upload training data error:", error);
    return NextResponse.json(
      {
        error: "Failed to upload training data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Check if a positive example already exists in the database
 */
async function checkPositiveExampleExists(
  entry: ParsedTrainingEntry
): Promise<boolean> {
  try {
    // First, try to match by conversation_id and message_id if available (most reliable)
    if (entry.metadata.conversation_id && entry.metadata.message_id) {
      const { data, error } = await supabaseAdmin
        .from("conversation_embeddings")
        .select("id")
        .eq("conversation_id", entry.metadata.conversation_id)
        .eq("message_id", entry.metadata.message_id)
        .limit(1);

      if (!error && data && data.length > 0) {
        return true;
      }
    }

    // Fallback: Check by exact content match
    const { data, error } = await supabaseAdmin
      .from("conversation_embeddings")
      .select("id")
      .eq("content", entry.content)
      .limit(1);

    if (!error && data && data.length > 0) {
      return true;
    }

    return false;
  } catch (error) {
    // If check fails, allow insertion (fail open)
    console.error("Error checking for duplicate positive example:", error);
    return false;
  }
}

/**
 * Check if a negative example already exists in the database
 */
async function checkNegativeExampleExists(
  entry: ParsedTrainingEntry
): Promise<boolean> {
  try {
    // Check by exact content match (most reliable for duplicates)
    // Content should be unique enough to identify duplicate training examples
    const { data, error } = await supabaseAdmin
      .from("flag_negative_examples")
      .select("id")
      .eq("content", entry.content)
      .limit(1);

    if (!error && data && data.length > 0) {
      return true;
    }

    return false;
  } catch (error) {
    // If check fails, allow insertion (fail open)
    console.error("Error checking for duplicate negative example:", error);
    return false;
  }
}

/**
 * Process positive examples and store in conversation_embeddings table
 */
async function processPositiveExamples(
  entries: ParsedTrainingEntry[],
  result: { processed: number; skipped: number; errors: string[] }
) {
  // Process in batches to avoid rate limits
  for (let i = 0; i < entries.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = entries.slice(i, i + EMBEDDING_BATCH_SIZE);

    // Generate embeddings for batch
    const embeddingPromises = batch.map(async (entry, index) => {
      try {
        const embeddingData = await generateEmbedding(entry.content);

        // Validate embedding dimensions (must be 1536 for OpenAI)
        if (embeddingData.dimensions !== 1536) {
          throw new Error(
            `Invalid embedding dimensions: ${embeddingData.dimensions}. Expected 1536.`
          );
        }

        return {
          entry,
          embedding: embeddingData.embedding,
        };
      } catch (error) {
        result.errors.push(
          `Entry ${i + index + 1}: Failed to generate embedding - ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        return null;
      }
    });

    const embeddingResults = await Promise.all(embeddingPromises);

    // Check for duplicates and insert into database
    const insertPromises = embeddingResults
      .filter((r) => r !== null)
      .map(async ({ entry, embedding }, batchIndex) => {
        try {
          // Check if this example already exists
          const exists = await checkPositiveExampleExists(entry);
          if (exists) {
            result.skipped++;
            return;
          }

          const insertData: any = {
            content: entry.content,
            embedding: embedding,
            metadata: {
              ...entry.metadata,
              uploaded_at: new Date().toISOString(),
              source: "jsonl_upload",
            },
          };

          // Add conversation_id and message_id if available in metadata
          if (entry.metadata.conversation_id) {
            insertData.conversation_id = entry.metadata.conversation_id;
          }
          if (entry.metadata.message_id) {
            insertData.message_id = entry.metadata.message_id;
          }

          const { error } = await supabaseAdmin
            .from("conversation_embeddings")
            .insert(insertData);

          if (error) {
            throw error;
          }

          result.processed++;
        } catch (error) {
          result.errors.push(
            `Entry ${i + batchIndex + 1}: Failed to insert into database - ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      });

    await Promise.all(insertPromises);

    // Small delay between batches to avoid rate limits
    if (i + EMBEDDING_BATCH_SIZE < entries.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

/**
 * Process negative examples and store in flag_negative_examples table
 */
async function processNegativeExamples(
  entries: ParsedTrainingEntry[],
  result: { processed: number; skipped: number; errors: string[] }
) {
  // Process in batches to avoid rate limits
  for (let i = 0; i < entries.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = entries.slice(i, i + EMBEDDING_BATCH_SIZE);

    // Generate embeddings for batch
    const embeddingPromises = batch.map(async (entry, index) => {
      try {
        const embeddingData = await generateEmbedding(entry.content);

        // Validate embedding dimensions (must be 1536 for OpenAI)
        if (embeddingData.dimensions !== 1536) {
          throw new Error(
            `Invalid embedding dimensions: ${embeddingData.dimensions}. Expected 1536.`
          );
        }

        return {
          entry,
          embedding: embeddingData.embedding,
        };
      } catch (error) {
        result.errors.push(
          `Entry ${i + index + 1}: Failed to generate embedding - ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        return null;
      }
    });

    const embeddingResults = await Promise.all(embeddingPromises);

    // Check for duplicates and insert into database
    const insertPromises = embeddingResults
      .filter((r) => r !== null)
      .map(async ({ entry, embedding }, batchIndex) => {
        try {
          // Check if this example already exists
          const exists = await checkNegativeExampleExists(entry);
          if (exists) {
            result.skipped++;
            return;
          }

          // Extract required fields from metadata
          const reason = entry.metadata.reason || "Uploaded via JSONL";
          const severity = entry.metadata.severity || "medium";

          // Validate severity
          const validSeverities = ["low", "medium", "high", "critical"];
          const finalSeverity = validSeverities.includes(severity.toLowerCase())
            ? severity.toLowerCase()
            : "medium";

          const insertData: any = {
            content: entry.content,
            embedding: embedding,
            reason: reason,
            severity: finalSeverity,
            metadata: {
              ...entry.metadata,
              uploaded_at: new Date().toISOString(),
              source: "jsonl_upload",
            },
          };

          // Add persona_id if available
          if (entry.metadata.persona_id) {
            insertData.persona_id = entry.metadata.persona_id;
          }

          // Add flag_training_id if available (optional)
          if (entry.metadata.flag_training_id) {
            insertData.flag_training_id = entry.metadata.flag_training_id;
          }

          const { error } = await supabaseAdmin
            .from("flag_negative_examples")
            .insert(insertData);

          if (error) {
            throw error;
          }

          result.processed++;
        } catch (error) {
          result.errors.push(
            `Entry ${i + batchIndex + 1}: Failed to insert into database - ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      });

    await Promise.all(insertPromises);

    // Small delay between batches to avoid rate limits
    if (i + EMBEDDING_BATCH_SIZE < entries.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}
