/**
 * Script to generate embeddings for Malaysian guidelines
 * Run with: npx tsx scripts/generate_guideline_embeddings.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load environment variables from .env.local manually
function loadEnvFile(filePath: string): void {
  try {
    const envContent = readFileSync(filePath, "utf-8");
    const lines = envContent.split("\n");
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").trim();
          // Remove quotes if present
          const cleanValue = value.replace(/^["']|["']$/g, "");
          if (!process.env[key]) {
            process.env[key] = cleanValue;
          }
        }
      }
    }
  } catch (error) {
    // File doesn't exist, that's okay
  }
}

// Try loading .env.local first, then .env
loadEnvFile(resolve(process.cwd(), ".env.local"));
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  loadEnvFile(resolve(process.cwd(), ".env"));
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error("❌ Error: NEXT_PUBLIC_SUPABASE_URL not found in .env.local or .env");
  console.error("Please make sure your .env.local file has:");
  console.error("  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url");
  console.error("  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function generateEmbeddings() {
  console.log("🚀 Starting embedding generation for Malaysian guidelines...\n");

  // Fetch all guidelines without embeddings
  const { data: guidelines, error } = await supabase
    .from("malaysian_guidelines")
    .select("*")
    .is("embedding", null);

  if (error) {
    console.error("❌ Error fetching guidelines:", error);
    return;
  }

  if (!guidelines || guidelines.length === 0) {
    console.log("✅ All guidelines already have embeddings!");
    return;
  }

  console.log(`📝 Found ${guidelines.length} guidelines without embeddings\n`);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  for (const guideline of guidelines) {
    try {
      console.log(`Generating embedding for ${guideline.guideline_id}...`);

      // Generate embedding
      const response = await fetch(`${baseUrl}/api/embeddings/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: guideline.content }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error(`❌ Failed for ${guideline.guideline_id}:`, error);
        continue;
      }

      const embeddingData = await response.json();
      const embedding = embeddingData.embedding;
      const dimensions = embeddingData.dimensions || embedding?.length;

      if (!embedding || !Array.isArray(embedding)) {
        console.error(`❌ No embedding returned for ${guideline.guideline_id}`);
        continue;
      }

      // Check dimensions - must be 1536 for OpenAI (database requirement)
      if (dimensions !== 1536 && embedding.length !== 1536) {
        console.error(`❌ Wrong dimensions for ${guideline.guideline_id}: ${embedding.length}. Expected 1536.`);
        console.error(`   Please use OpenAI API key (not Cohere) for embeddings.`);
        continue;
      }

      console.log(`   Embedding dimensions: ${embedding.length}`);

      // Update guideline with embedding
      // Supabase automatically converts array to vector type
      const { data: updateData, error: updateError } = await supabase
        .from("malaysian_guidelines")
        .update({ embedding: embedding })
        .eq("id", guideline.id)
        .select();

      if (updateError) {
        console.error(`❌ Failed to update ${guideline.guideline_id}:`, updateError);
        console.error(`   Error details:`, JSON.stringify(updateError, null, 2));
      } else {
        // Verify it was saved
        const { data: verifyData, error: verifyError } = await supabase
          .from("malaysian_guidelines")
          .select("embedding")
          .eq("id", guideline.id)
          .single();
        
        if (verifyError || !verifyData?.embedding) {
          console.error(`❌ Verification failed for ${guideline.guideline_id}: embedding not saved`);
        } else {
          console.log(`✅ Generated and saved embedding for ${guideline.guideline_id}`);
        }
      }

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Error processing ${guideline.guideline_id}:`, error);
    }
  }

  console.log("\n✨ Embedding generation complete!");
}

// Run if executed directly
if (require.main === module) {
  generateEmbeddings().catch(console.error);
}

export { generateEmbeddings };

