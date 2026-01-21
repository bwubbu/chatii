import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_EMAIL = "kyrodahero123@gmail.com";

// Admin client that bypasses RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/admin/analytics
 * Fetch all analytics data for admin dashboard
 * Uses service role key to bypass RLS and see all conversations
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user is admin
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized: Missing authorization token" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    // Fetch all data in parallel using admin client (bypasses RLS)
    const [
      conversationsResult,
      messagesResult,
      feedbackResult,
      flaggedResult,
      demographicsResult,
      personasResult
    ] = await Promise.all([
      supabaseAdmin.from("conversations").select("id, persona_id, created_at, updated_at, last_message_at, user_id"),
      supabaseAdmin.from("messages").select("id, conversation_id, created_at").order("created_at", { ascending: false }),
      supabaseAdmin.from("feedback_questionnaire").select("id, open_ended, created_at, persona_id, politeness, fairness, respectfulness, trustworthiness, competence, likeability"),
      supabaseAdmin.from("flagged_messages").select("id, created_at"),
      supabaseAdmin.from("demographics").select("*"),
      supabaseAdmin.from("personas").select("id, title")
    ]);

    const conversations = conversationsResult.data || [];
    const messages = messagesResult.data || [];
    const feedback = feedbackResult.data || [];
    const flagged = flaggedResult.data || [];
    const demographics = demographicsResult.data || [];
    const personas = personasResult.data || [];

    // Calculate metrics
    const uniqueUsers = new Set(conversations.map((c: any) => c.user_id)).size;
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsers24h = new Set(
      conversations.filter((c: any) => new Date(c.created_at) > last24h).map((c: any) => c.user_id)
    ).size;
    
    // Calculate user growth from last week
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const usersLastWeek = new Set(
      conversations.filter((c: any) => new Date(c.created_at) <= lastWeek).map((c: any) => c.user_id)
    ).size;
    const userGrowthPercent = usersLastWeek > 0 
      ? ((uniqueUsers - usersLastWeek) / usersLastWeek * 100).toFixed(1)
      : uniqueUsers > 0 ? "100.0" : "0.0";

    // Persona distribution
    const conversationsByPersona: { [key: string]: number } = {};
    conversations.forEach((c: any) => {
      conversationsByPersona[c.persona_id] = (conversationsByPersona[c.persona_id] || 0) + 1;
    });

    // Create persona name mapping for display
    const personaNameMap: { [key: string]: string } = {};
    personas.forEach((p: any) => {
      personaNameMap[p.id] = p.title || 'Unknown Persona';
    });

    // Demographics analysis
    const usersByDemographics = {
      age: {} as { [key: string]: number },
      gender: {} as { [key: string]: number },
      role: {} as { [key: string]: number }
    };

    demographics.forEach((d: any) => {
      if (d.age) {
        const ageGroup = d.age < 25 ? '18-24' : d.age < 35 ? '25-34' : d.age < 45 ? '35-44' : d.age < 55 ? '45-54' : '55+';
        usersByDemographics.age[ageGroup] = (usersByDemographics.age[ageGroup] || 0) + 1;
      }
      if (d.gender) {
        usersByDemographics.gender[d.gender] = (usersByDemographics.gender[d.gender] || 0) + 1;
      }
      if (d.role) {
        usersByDemographics.role[d.role] = (usersByDemographics.role[d.role] || 0) + 1;
      }
    });

    // Survey results averages
    const surveyResults = {
      politeness: feedback.reduce((sum: number, f: any) => sum + (f.politeness || 0), 0) / Math.max(feedback.length, 1),
      fairness: feedback.reduce((sum: number, f: any) => sum + (f.fairness || 0), 0) / Math.max(feedback.length, 1),
      respectfulness: feedback.reduce((sum: number, f: any) => sum + (f.respectfulness || 0), 0) / Math.max(feedback.length, 1),
      trustworthiness: feedback.reduce((sum: number, f: any) => sum + (f.trustworthiness || 0), 0) / Math.max(feedback.length, 1),
      competence: feedback.reduce((sum: number, f: any) => sum + (f.competence || 0), 0) / Math.max(feedback.length, 1),
      likeability: feedback.reduce((sum: number, f: any) => sum + (f.likeability || 0), 0) / Math.max(feedback.length, 1)
    };

    // Time series data (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    const timeSeriesData = {
      labels: last7Days.map(date => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      conversations: last7Days.map(date => 
        conversations.filter((c: any) => c.created_at.startsWith(date)).length
      ),
      users: last7Days.map(date => 
        new Set(conversations.filter((c: any) => c.created_at.startsWith(date)).map((c: any) => c.user_id)).size
      ),
      satisfaction: last7Days.map(date => {
        const dayFeedback = feedback.filter((f: any) => f.created_at.startsWith(date));
        return dayFeedback.length > 0 
          ? dayFeedback.reduce((sum: number, f: any) => sum + ((f.politeness + f.fairness + f.respectfulness) / 3), 0) / dayFeedback.length
          : 0;
      })
    };

    // Calculate average session duration from conversation timestamps
    const sessionDurations = conversations
      .filter((c: any) => c.created_at && (c.updated_at || c.last_message_at))
      .map((c: any) => {
        const start = new Date(c.created_at).getTime();
        const endTime = c.last_message_at || c.updated_at;
        const end = new Date(endTime).getTime();
        return (end - start) / (1000 * 60); // Convert to minutes
      })
      .filter((duration: number) => duration > 0 && duration < 1440); // Filter out invalid durations
    
    const avgSessionDuration = sessionDurations.length > 0
      ? sessionDurations.reduce((sum: number, d: number) => sum + d, 0) / sessionDurations.length
      : 0;

    return NextResponse.json({
      totalUsers: uniqueUsers,
      totalConversations: conversations.length,
      totalMessages: messages.length,
      activeUsers24h,
      avgSessionDuration,
      fairnessScore: surveyResults.fairness,
      userSatisfaction: (surveyResults.politeness + surveyResults.fairness + surveyResults.respectfulness) / 3,
      flaggedMessages: flagged.length,
      conversationsByPersona,
      personaNameMap,
      usersByDemographics,
      surveyResults,
      timeSeriesData,
      feedbackMessages: feedback.filter((f: any) => f.open_ended && f.open_ended.trim().length > 0),
      userGrowthPercent: parseFloat(userGrowthPercent)
    });
  } catch (error: any) {
    console.error("Error fetching admin analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data", details: error.message },
      { status: 500 }
    );
  }
}
