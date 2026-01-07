import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * API endpoint to generate or retrieve a training scenario
 * Can either fetch from database or generate dynamically
 */

interface ScenarioRequest {
  scenarioId?: string; // If provided, fetch specific scenario
  scenarioType?: string; // Type of scenario to generate
  difficulty?: number; // 1-5 difficulty level
  language?: 'english' | 'malay'; // Language for initial message
}

export async function POST(request: NextRequest) {
  try {
    const { scenarioId, scenarioType, difficulty = 2, language = 'english' }: ScenarioRequest = await request.json();

    // If scenarioId provided, fetch from database
    if (scenarioId) {
      const { data: scenario, error } = await supabase
        .from("training_scenarios")
        .select(`
          *,
          personas (
            id,
            title,
            description
          )
        `)
        .eq("id", scenarioId)
        .eq("is_active", true)
        .single();

      if (error || !scenario) {
        return NextResponse.json(
          { error: "Scenario not found" },
          { status: 404 }
        );
      }

      // Translate initial message if Malay is requested
      let initialMessage = scenario.initial_message;
      if (language === 'malay' && scenario.initial_message) {
        initialMessage = await translateInitialMessage(scenario.initial_message);
      }

      return NextResponse.json({
        id: scenario.id,
        title: scenario.title,
        description: scenario.description,
        scenarioType: scenario.scenario_type,
        difficulty: scenario.difficulty_level,
        initialMessage: initialMessage,
        systemPrompt: scenario.system_prompt,
        expectedBehaviors: scenario.expected_behaviors,
        persona_id: scenario.persona_id,
        persona: scenario.personas ? {
          id: scenario.personas.id,
          title: scenario.personas.title,
          description: scenario.personas.description,
        } : undefined,
      });
    }

    // Otherwise, fetch a random scenario matching criteria
    let query = supabase
      .from("training_scenarios")
      .select(`
        *,
        personas (
          id,
          title,
          description
        )
      `)
      .eq("is_active", true);

    if (scenarioType) {
      query = query.eq("scenario_type", scenarioType);
    }

    if (difficulty) {
      query = query.eq("difficulty_level", difficulty);
    }

    const { data: scenarios, error } = await query;

    if (error || !scenarios || scenarios.length === 0) {
      // Fallback: Generate a scenario dynamically using AI
      return NextResponse.json(await generateDynamicScenario(scenarioType, difficulty));
    }

    // Pick a random scenario
    const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];

    // Translate initial message if Malay is requested
    let initialMessage = randomScenario.initial_message;
    if (language === 'malay' && randomScenario.initial_message) {
      initialMessage = await translateInitialMessage(randomScenario.initial_message);
    }

    return NextResponse.json({
      id: randomScenario.id,
      title: randomScenario.title,
      description: randomScenario.description,
      scenarioType: randomScenario.scenario_type,
      difficulty: randomScenario.difficulty_level,
      initialMessage: initialMessage,
      systemPrompt: randomScenario.system_prompt,
      expectedBehaviors: randomScenario.expected_behaviors,
      persona_id: randomScenario.persona_id,
      persona: randomScenario.personas ? {
        id: randomScenario.personas.id,
        title: randomScenario.personas.title,
        description: randomScenario.personas.description,
      } : undefined,
    });
  } catch (error) {
    console.error("Scenario generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate scenario",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Generate a dynamic scenario using Gemini if database doesn't have one
 */
async function generateDynamicScenario(
  scenarioType?: string,
  difficulty: number = 2
): Promise<any> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const type = scenarioType || "frustrated";
  const prompt = `Generate a challenging customer service scenario for training purposes.

SCENARIO TYPE: ${type}
DIFFICULTY LEVEL: ${difficulty}/5

Create a scenario where an AI will act as a ${type} customer, and a human user will need to respond professionally and fairly.

Provide:
1. A title for the scenario
2. A brief description
3. An initial message the AI customer would send (should be challenging but realistic)
4. A system prompt for how the AI should act as this customer
5. Expected behaviors the human should demonstrate (array of strings)

Respond in this EXACT JSON format:
{
  "title": "Scenario Title",
  "description": "Brief description",
  "scenarioType": "${type}",
  "difficulty": ${difficulty},
  "initialMessage": "The first message the AI customer sends",
  "systemPrompt": "How the AI should act as this customer",
  "expectedBehaviors": ["behavior 1", "behavior 2", "behavior 3"]
}`;

  const modelName = "gemini-2.0-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to generate scenario");
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch ? jsonMatch[0] : text;

  return JSON.parse(jsonText);
}

/**
 * Translate the initial message to Malay using Gemini
 */
async function translateInitialMessage(englishMessage: string): Promise<string> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    // If no API key, return original message
    return englishMessage;
  }

  try {
    const prompt = `Translate this customer complaint message to Malay (Bahasa Malaysia). 
Keep the same tone, emotion, and level of frustration. Make it sound natural and authentic in Malay.

English message: "${englishMessage}"

Respond with ONLY the Malay translation, no explanations or quotes.`;

    const modelName = "gemini-2.0-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error("Translation failed, using original message");
      return englishMessage;
    }

    const data = await response.json();
    const translated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || englishMessage;
    
    // Remove quotes if present
    return translated.replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error("Translation error:", error);
    return englishMessage;
  }
}

