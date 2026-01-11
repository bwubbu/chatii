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

    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id")
      .eq("user_id", user_id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is fine, but other errors are problematic
      console.error("Error checking existing profile:", {
        message: checkError.message,
        code: checkError.code,
      });
      // Continue anyway - might be a table that doesn't exist yet
    }

    // If profile already exists, return success (idempotent)
    if (existingProfile) {
      console.log(`Profile already exists for user ${user_id}, returning existing profile`);
      const { data: profileData } = await supabaseAdmin
        .from("user_profiles")
        .select("*")
        .eq("user_id", user_id)
        .single();
      
      return NextResponse.json({ 
        success: true,
        profile: profileData,
        message: "Profile already exists"
      });
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
      // Check for specific error codes
      const errorCode = profileError.code;
      const errorMessage = profileError.message || 'Unknown error';
      
      console.error("Error creating user profile:", {
        message: errorMessage,
        details: profileError.details,
        hint: profileError.hint,
        code: errorCode,
      });

      // Handle specific error cases
      if (errorCode === '23505') {
        // Unique constraint violation - profile already exists
        const { data: existingData } = await supabaseAdmin
          .from("user_profiles")
          .select("*")
          .eq("user_id", user_id)
          .single();
        
        return NextResponse.json({ 
          success: true,
          profile: existingData,
          message: "Profile already exists"
        });
      }

      if (errorCode === '42P01') {
        // Table doesn't exist
        return NextResponse.json(
          { 
            error: "Database configuration error: user_profiles table not found",
            details: "Please ensure database migrations have been run",
            code: errorCode
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { 
          error: "Failed to create user profile",
          details: errorMessage,
          code: errorCode,
          hint: profileError.hint
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















