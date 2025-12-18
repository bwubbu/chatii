import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/user-profiles
 * Create a user profile (called after signup)
 * Uses service role to bypass RLS since user might not have session yet
 */
export async function POST(request: NextRequest) {
  try {
    const { user_id, nationality, age, race, gender } = await request.json();

    // Validate required fields
    if (!user_id || !nationality || !age || !race || !gender) {
      return NextResponse.json(
        { error: "Missing required fields: user_id, nationality, age, race, and gender are required" },
        { status: 400 }
      );
    }

    // Validate age
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum <= 0 || ageNum >= 150) {
      return NextResponse.json(
        { error: "Invalid age. Must be between 1 and 149" },
        { status: 400 }
      );
    }

    // Verify user exists
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(user_id);
    if (userError || !user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Validate gender
    const validGenders = ['male', 'female', 'other', 'prefer-not-to-say'];
    if (!validGenders.includes(gender)) {
      return NextResponse.json(
        { error: "Invalid gender. Must be one of: male, female, other, prefer-not-to-say" },
        { status: 400 }
      );
    }

    // Insert profile using admin client (bypasses RLS)
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .insert({
        user_id,
        nationality,
        age: ageNum,
        race,
        gender,
      })
      .select()
      .single();

    if (profileError) {
      console.error("Error creating user profile:", {
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        code: profileError.code,
      });
      return NextResponse.json(
        { 
          error: "Failed to create user profile",
          details: profileError.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      profile: profileData 
    });
  } catch (error: any) {
    console.error("User profile POST error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}










