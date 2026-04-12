import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * This endpoint initiates the OAuth 2.0 flow to get authorization
 * User will be redirected to Google login and will grant Drive access
 */
export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const redirectUri = `${process.env.NODE_ENV === "production" ? "https://reimbursement-app-ruby.vercel.app" : "http://localhost:3000"}/api/auth/google-drive-callback`;
    
    if (!clientId) {
      return NextResponse.json(
        { error: "GOOGLE_DRIVE_CLIENT_ID not configured" },
        { status: 500 }
      );
    }

    // Generate a cryptographically secure state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state in response cookie (secure, httpOnly)
    const response = NextResponse.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent("https://www.googleapis.com/auth/drive")}&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${state}`
    );

    response.cookies.set("oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    });

    console.log("🔐 Generated OAuth state:", state);
    return response;
  } catch (error: any) {
    console.error("OAuth authorization error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initiate OAuth flow" },
      { status: 500 }
    );
  }
}
