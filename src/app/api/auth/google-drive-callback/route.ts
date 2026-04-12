import { NextRequest, NextResponse } from "next/server";

/**
 * This endpoint handles the OAuth callback from Google
 * It exchanges the authorization code for a refresh token
 */
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NODE_ENV === "production" ? "https://reimbursement-app-ruby.vercel.app" : "http://localhost:3000";
  
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    console.log("📨 OAuth callback received");
    console.log("  Code:", code ? "✓ present" : "✗ missing");
    console.log("  State:", state ? "✓ present" : "✗ missing");
    console.log("  Error:", error || "none");

    // Check for errors from Google
    if (error) {
      console.error("OAuth error from Google:", error);
      const redirectUrl = new URL(`${baseUrl}/auth/google-drive-callback`);
      redirectUrl.searchParams.set("error", error);
      return NextResponse.redirect(redirectUrl);
    }

    if (!code) {
      console.error("Missing authorization code");
      const redirectUrl = new URL(`${baseUrl}/auth/google-drive-callback`);
      redirectUrl.searchParams.set("error", "Missing authorization code");
      return NextResponse.redirect(redirectUrl);
    }

    // Verify state matches (but be lenient for now to debug)
    const storedState = request.cookies.get("oauth_state")?.value;
    console.log("🔐 State validation:");
    console.log("  Received state:", state);
    console.log("  Stored state:", storedState || "none");
    
    if (state && storedState && state !== storedState) {
      console.error("State mismatch - possible CSRF attack");
      const redirectUrl = new URL(`${baseUrl}/auth/google-drive-callback`);
      redirectUrl.searchParams.set("error", "State mismatch - CSRF protection failed");
      return NextResponse.redirect(redirectUrl);
    }

    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const redirectUri = `${baseUrl}/api/auth/google-drive-callback`;

    if (!clientId || !clientSecret) {
      console.error("Missing Google Drive OAuth credentials");
      const redirectUrl = new URL(`${baseUrl}/auth/google-drive-callback`);
      redirectUrl.searchParams.set("error", "Server configuration error");
      return NextResponse.redirect(redirectUrl);
    }

    // Exchange authorization code for tokens
    console.log("🔄 Exchanging authorization code for tokens...");

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error("Token exchange failed:", errorData);
      const redirectUrl = new URL(`${baseUrl}/auth/google-drive-callback`);
      redirectUrl.searchParams.set("error", `Failed to exchange code for token: ${JSON.stringify(errorData)}`);
      return NextResponse.redirect(redirectUrl);
    }

    const tokenData = await tokenResponse.json();
    const refreshToken = tokenData.refresh_token;

    if (!refreshToken) {
      console.error("No refresh token in response:", tokenData);
      const redirectUrl = new URL(`${baseUrl}/auth/google-drive-callback`);
      redirectUrl.searchParams.set("error", "No refresh token received from Google");
      return NextResponse.redirect(redirectUrl);
    }

    console.log("✅ Successfully obtained refresh token!");
    console.log("📋 Refresh Token:", refreshToken);
    console.log("\n⚠️  Add this to your .env.local:");
    console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${refreshToken}`);

    // Redirect to page component to display the refresh token
    const redirectUrl = new URL(`${baseUrl}/auth/google-drive-callback`);
    redirectUrl.searchParams.set("refresh_token", refreshToken);
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error("OAuth callback error:", error);
    const redirectUrl = new URL(`${baseUrl}/auth/google-drive-callback`);
    redirectUrl.searchParams.set("error", error.message || "Failed to complete OAuth flow");
    return NextResponse.redirect(redirectUrl);
  }
}
