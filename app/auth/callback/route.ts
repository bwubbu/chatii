import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * OAuth callback handler
 * Handles the redirect from OAuth providers (Google, etc.)
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';

  console.log('OAuth callback received:', { 
    code: code ? 'present' : 'missing', 
    next,
    origin: requestUrl.origin 
  });

  if (code) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('OAuth callback error:', error);
      // Redirect to login with error
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
      );
    }

    if (data?.user) {
      console.log('OAuth success, redirecting to homepage');
      // Successful authentication - always redirect to homepage
      // Profile completion will be handled by a modal on the homepage
      // Add a query param to indicate fresh OAuth sign-in for better modal triggering
      const redirectUrl = new URL('/', requestUrl.origin);
      redirectUrl.searchParams.set('oauth_success', 'true');
      return NextResponse.redirect(redirectUrl);
    } else {
      console.error('OAuth callback: No user in response data');
      // No user but no error - redirect to login
      return NextResponse.redirect(
        new URL('/login?error=Authentication failed', requestUrl.origin)
      );
    }
  }

  // If no code, redirect to login
  console.error('OAuth callback: No authorization code received');
  return NextResponse.redirect(new URL('/login?error=No authorization code', requestUrl.origin));
}
