import { NextRequest, NextResponse } from "next/server";

/**
 * API endpoint to score user responses for fairness and politeness
 * Uses Gemini API to evaluate responses on multiple dimensions
 */

interface ScoreRequest {
  aiMessage: string; // The challenging message from AI
  userResponse: string; // User's response to evaluate
  scenarioType?: string; // Type of scenario (for context)
  language?: 'english' | 'malay'; // Language for feedback
}

interface ScoreResponse {
  scores: {
    politeness: number; // 0-10
    fairness: number; // 0-10
    likeability: number; // 0-10
    competence: number; // 0-10
    respectfulness: number; // 0-10
    trustworthiness: number; // 0-10
    overall: number; // Average of above
  };
  strengths: string[]; // What the user did well
  improvements: string[]; // What could be improved
  detailedFeedback: string; // Detailed explanation
}

export async function POST(request: NextRequest) {
  try {
    const { aiMessage, userResponse, scenarioType = "general", language = "english" }: ScoreRequest = await request.json();

    if (!aiMessage || !userResponse) {
      return NextResponse.json(
        { error: "Both aiMessage and userResponse are required" },
        { status: 400 }
      );
    }

    // Use Gemini API to evaluate the response
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Language-specific instructions
    const languageInstructions = language === 'malay' 
      ? `LANGUAGE: Respond in Malay (Bahasa Malaysia). All feedback, strengths, improvements, and detailedFeedback should be in Malay.`
      : `LANGUAGE: Respond in English.`;

    // Create evaluation prompt
    const evaluationPrompt = `You are an expert evaluator assessing customer service responses across multiple dimensions.

${languageInstructions}

SCENARIO TYPE: ${scenarioType}

AI CUSTOMER MESSAGE: "${aiMessage}"

USER RESPONSE: "${userResponse}"

Evaluate the user's response on these dimensions (0-10 scale):
1. POLITENESS: Tone, courtesy, avoiding rudeness, using appropriate language
2. FAIRNESS: Unbiased treatment, equal respect, no discrimination, treating everyone equally
3. LIKEABILITY: Warmth, friendliness, approachability, positive impression
4. COMPETENCE: Knowledge, problem-solving ability, confidence, effectiveness
5. RESPECTFULNESS: Showing dignity, honoring boundaries, valuing the customer
6. TRUSTWORTHINESS: Reliability, honesty, credibility, keeping commitments

Provide your evaluation in this EXACT JSON format (no markdown, no code blocks, just pure JSON):
{
  "scores": {
    "politeness": <number 0-10>,
    "fairness": <number 0-10>,
    "likeability": <number 0-10>,
    "competence": <number 0-10>,
    "respectfulness": <number 0-10>,
    "trustworthiness": <number 0-10>,
    "overall": <average of above 6 scores>
  },
  "strengths": ["strength 1", "strength 2", ...],
  "improvements": ["improvement 1", "improvement 2", ...],
  "detailedFeedback": "A concise, actionable paragraph (2-3 sentences) highlighting key strengths and one specific area for improvement. Be encouraging and constructive."
}

IMPORTANT: Return ONLY valid JSON, no explanations before or after the JSON object.
${language === 'malay' ? 'IMPORTANT: All text in strengths, improvements, and detailedFeedback MUST be in Malay (Bahasa Malaysia).' : ''}

Be specific and constructive. Focus on actionable feedback.`;

    // Call Gemini API - use gemini-2.0-flash (same as chat route)
    const modelName = "gemini-2.0-flash";
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: evaluationPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3, // Lower temperature for more consistent evaluation
            topK: 1,
            topP: 0.8,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json().catch(() => ({}));
      console.error("Gemini API error:", errorData);
      return NextResponse.json(
        { error: "Failed to evaluate response", details: errorData },
        { status: 500 }
      );
    }

    const geminiData = await geminiResponse.json();
    const responseText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!responseText) {
      console.error("Empty response from Gemini API:", geminiData);
      // Use fallback scoring
      const evaluation = fallbackScoring(aiMessage, userResponse);
      return NextResponse.json(evaluation);
    }

    console.log("Gemini response text (first 500 chars):", responseText.substring(0, 500));

    // Parse JSON from response
    let evaluation: ScoreResponse;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : responseText;
      const parsed = JSON.parse(jsonText);
      
      // Convert old format (scores at top level) to new format (scores nested)
      if (parsed.politeness !== undefined && !parsed.scores) {
        // Old format detected - convert it (map old metrics to new ones)
        const oldOverall = parsed.overall || 5;
        evaluation = {
          scores: {
            politeness: parsed.politeness || 5,
            fairness: parsed.fairness || 5,
            likeability: parsed.likeability || oldOverall, // Map from old empathy/professionalism
            competence: parsed.competence || parsed.professionalism || oldOverall,
            respectfulness: parsed.respectfulness || parsed.politeness || oldOverall,
            trustworthiness: parsed.trustworthiness || oldOverall,
            overall: oldOverall,
          },
          strengths: parsed.strengths || [],
          improvements: parsed.improvements || [],
          detailedFeedback: parsed.detailedFeedback || "Evaluation completed.",
        };
      } else {
        evaluation = parsed;
      }
      
      // Validate that the parsed evaluation has the expected structure
      if (!evaluation || !evaluation.scores || typeof evaluation.scores !== 'object') {
        console.error("Invalid evaluation structure from AI:", evaluation);
        throw new Error("Invalid evaluation structure");
      }
    } catch (parseError) {
      console.error("Failed to parse evaluation:", parseError);
      console.error("Response text was:", responseText);
      // Fallback: Use rule-based scoring if JSON parsing fails
      evaluation = fallbackScoring(aiMessage, userResponse);
    }

    // Validate scores exist and are in range
    const validateScore = (score: number | undefined) => {
      if (typeof score !== 'number' || isNaN(score)) {
        return 5; // Default to middle score if invalid
      }
      return Math.max(0, Math.min(10, score));
    };
    
    // Ensure scores object exists
    if (!evaluation.scores) {
      console.error("Evaluation missing scores object, using fallback");
      evaluation = fallbackScoring(aiMessage, userResponse);
    }
    
    evaluation.scores = {
      politeness: validateScore(evaluation.scores.politeness),
      fairness: validateScore(evaluation.scores.fairness),
      likeability: validateScore(evaluation.scores.likeability),
      competence: validateScore(evaluation.scores.competence),
      respectfulness: validateScore(evaluation.scores.respectfulness),
      trustworthiness: validateScore(evaluation.scores.trustworthiness),
      overall: validateScore(evaluation.scores.overall) || 
        (validateScore(evaluation.scores.politeness) + 
         validateScore(evaluation.scores.fairness) + 
         validateScore(evaluation.scores.likeability) + 
         validateScore(evaluation.scores.competence) + 
         validateScore(evaluation.scores.respectfulness) + 
         validateScore(evaluation.scores.trustworthiness)) / 6,
    };
    
    // Ensure other required fields exist
    if (!evaluation.strengths || !Array.isArray(evaluation.strengths)) {
      evaluation.strengths = [];
    }
    if (!evaluation.improvements || !Array.isArray(evaluation.improvements)) {
      evaluation.improvements = [];
    }
    if (!evaluation.detailedFeedback || typeof evaluation.detailedFeedback !== 'string') {
      evaluation.detailedFeedback = "Evaluation completed.";
    }

    return NextResponse.json(evaluation);
  } catch (error) {
    console.error("Scoring error:", error);
    return NextResponse.json(
      {
        error: "Failed to score response",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Fallback scoring using rule-based approach if AI evaluation fails
 */
function fallbackScoring(aiMessage: string, userResponse: string): ScoreResponse {
  const response = userResponse.toLowerCase();
  
  // Check for positive indicators
  const hasAcknowledgment = /understand|sorry|apolog|acknowledge/i.test(userResponse);
  const hasEmpathy = /frustrat|feel|difficult|challeng/i.test(userResponse);
  const hasProfessionalism = /help|assist|support|solution/i.test(userResponse);
  const hasPoliteness = /please|thank|appreciate|respect/i.test(userResponse);
  const hasWarmth = /glad|happy|pleased|welcome/i.test(userResponse);
  const hasConfidence = /will|can|able|ensure|guarantee/i.test(userResponse);
  
  // Check for negative indicators
  const hasRudeness = /stupid|idiot|terrible|awful|hate/i.test(userResponse);
  const hasDefensiveness = /not my fault|blame|your problem/i.test(userResponse);
  const hasDiscrimination = /\b(all|every|none|never)\s+(people|they|them)\b/i.test(userResponse);
  
  // Calculate base scores
  let politeness = 7;
  if (hasPoliteness) politeness += 1;
  if (hasRudeness) politeness -= 3;
  if (hasDefensiveness) politeness -= 2;
  
  let fairness = 8;
  if (hasDiscrimination) fairness -= 5;
  if (hasDefensiveness) fairness -= 1;
  
  let likeability = 6;
  if (hasWarmth) likeability += 2;
  if (hasPoliteness) likeability += 1;
  if (hasRudeness) likeability -= 3;
  
  let competence = 7;
  if (hasConfidence) competence += 1;
  if (hasProfessionalism) competence += 1;
  if (hasRudeness) competence -= 2;
  
  let respectfulness = 7;
  if (hasPoliteness) respectfulness += 1;
  if (hasAcknowledgment) respectfulness += 1;
  if (hasRudeness) respectfulness -= 3;
  if (hasDefensiveness) respectfulness -= 1;
  
  let trustworthiness = 7;
  if (hasConfidence) trustworthiness += 1;
  if (hasProfessionalism) trustworthiness += 1;
  if (hasDefensiveness) trustworthiness -= 2;
  
  const overall = (politeness + fairness + likeability + competence + respectfulness + trustworthiness) / 6;
  
  const strengths: string[] = [];
  const improvements: string[] = [];
  
  if (hasAcknowledgment) strengths.push("Acknowledged the customer's concern");
  if (hasEmpathy) strengths.push("Showed understanding of the situation");
  if (hasProfessionalism) strengths.push("Offered helpful solutions");
  if (hasPoliteness) strengths.push("Used polite and respectful language");
  if (hasWarmth) strengths.push("Demonstrated a friendly, approachable tone");
  
  if (hasRudeness) improvements.push("Avoid using negative or rude language");
  if (hasDefensiveness) improvements.push("Take responsibility rather than being defensive");
  if (hasDiscrimination) improvements.push("Avoid making generalizations about groups of people");
  if (!hasAcknowledgment) improvements.push("Acknowledge the customer's feelings or concerns");
  if (!hasWarmth) improvements.push("Add warmth and friendliness to your communication");
  
  return {
    scores: {
      politeness: Math.max(0, Math.min(10, politeness)),
      fairness: Math.max(0, Math.min(10, fairness)),
      likeability: Math.max(0, Math.min(10, likeability)),
      competence: Math.max(0, Math.min(10, competence)),
      respectfulness: Math.max(0, Math.min(10, respectfulness)),
      trustworthiness: Math.max(0, Math.min(10, trustworthiness)),
      overall: Math.max(0, Math.min(10, overall)),
    },
    strengths: strengths.length > 0 ? strengths : ["Maintained basic professionalism"],
    improvements: improvements.length > 0 ? improvements : ["Continue practicing professional communication"],
    detailedFeedback: `Your response ${hasRudeness ? "contained some inappropriate language" : "maintained a professional tone"}. ${hasAcknowledgment ? "Good job acknowledging the customer's concern." : "Consider acknowledging the customer's feelings."} ${hasWarmth ? "Your friendly approach helps build rapport." : "Adding warmth can make your communication more effective."}`,
  };
}

