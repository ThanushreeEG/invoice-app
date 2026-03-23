import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSessionToken } from "@/lib/auth";

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token: string;
  token_type: string;
  expires_in: number;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture: string;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/login?error=access_denied", request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/login?error=token_exchange_failed", request.url));
  }

  const tokens: GoogleTokenResponse = await tokenRes.json();

  // Get user info
  const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userRes.ok) {
    return NextResponse.redirect(new URL("/login?error=user_info_failed", request.url));
  }

  const googleUser: GoogleUserInfo = await userRes.json();

  // Check if this is the first user (becomes admin) or if they're allowed
  const userCount = await prisma.user.count();
  const isFirstUser = userCount === 0;

  if (!isFirstUser) {
    // Check if user is admin, or in the allowed list
    const existingUser = await prisma.user.findUnique({ where: { email: googleUser.email } });
    const isAdmin = existingUser?.role === "admin";

    if (!isAdmin) {
      const allowed = await prisma.allowedEmail.findUnique({
        where: { email: googleUser.email.toLowerCase() },
      });
      if (!allowed) {
        return NextResponse.redirect(new URL("/login?error=not_authorized", request.url));
      }
    }
  }

  // Upsert user with OAuth tokens
  const user = await prisma.user.upsert({
    where: { email: googleUser.email },
    update: {
      name: googleUser.name,
      avatar: googleUser.picture,
      googleId: googleUser.sub,
      accessToken: tokens.access_token,
      ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
    create: {
      email: googleUser.email,
      name: googleUser.name,
      avatar: googleUser.picture,
      googleId: googleUser.sub,
      role: isFirstUser ? "admin" : "user",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || "",
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });

  // Create session
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await prisma.session.create({
    data: {
      token,
      userId: user.id,
      expiresAt,
    },
  });

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set("session_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return response;
}
