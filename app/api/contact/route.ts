import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, project, message } = body;

    // In a real implementation, you would:
    // 1. Save to database
    // 2. Send email to admin
    // 3. Create ticket in support system

    console.log('API Access Request:', {
      name,
      email,
      project,
      message,
      timestamp: new Date().toISOString()
    });

    // Mock successful response
    return NextResponse.json(
      { 
        success: true, 
        message: 'Your request has been received. An admin will contact you soon.' 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'An error occurred. Please try again later.' 
      },
      { status: 500 }
    );
  }
} 