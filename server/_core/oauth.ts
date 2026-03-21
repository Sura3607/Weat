import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Determine if we should use Google OAuth directly (EC2/self-hosted)
 * or Manus OAuth (Manus platform).
 */
function isGoogleOAuthMode(): boolean {
  return !!(ENV.googleClientId && ENV.googleClientSecret);
}

export function registerOAuthRoutes(app: Express) {
  // ─── Google OAuth: initiate login ─────────────────────────────
  app.get("/api/auth/google", (req: Request, res: Response) => {
    if (!isGoogleOAuthMode()) {
      res.status(500).json({ error: "Google OAuth not configured" });
      return;
    }

    const redirectUri = `${getBaseUrl(req)}/api/auth/google/callback`;
    const state = req.query.returnTo
      ? Buffer.from(String(req.query.returnTo)).toString("base64")
      : Buffer.from("/feed").toString("base64");

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", ENV.googleClientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);

    res.redirect(302, url.toString());
  });

  // ─── Google OAuth: callback ───────────────────────────────────
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code) {
      res.status(400).json({ error: "Authorization code is required" });
      return;
    }

    try {
      const redirectUri = `${getBaseUrl(req)}/api/auth/google/callback`;

      // Exchange code for tokens
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        console.error("[Google OAuth] Token exchange failed:", err);
        res.status(500).json({ error: "Token exchange failed" });
        return;
      }

      const tokens = (await tokenRes.json()) as {
        access_token: string;
        id_token?: string;
      };

      // Get user info from Google
      const userInfoRes = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
      );

      if (!userInfoRes.ok) {
        res.status(500).json({ error: "Failed to get user info" });
        return;
      }

      const googleUser = (await userInfoRes.json()) as {
        id: string;
        email: string;
        name: string;
        picture?: string;
      };

      // Upsert user in DB (use google ID as openId)
      const openId = `google_${googleUser.id}`;
      await db.upsertUser({
        openId,
        name: googleUser.name || null,
        email: googleUser.email ?? null,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      // Also update avatar if available
      const existingUser = await db.getUserByOpenId(openId);
      if (existingUser && !existingUser.avatarUrl && googleUser.picture) {
        await db.updateUserProfile(existingUser.id, {
          avatarUrl: googleUser.picture,
        });
      }

      // Create session JWT
      const sessionToken = await sdk.createSessionToken(openId, {
        name: googleUser.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      // Redirect to returnTo path or /feed
      const returnTo = state
        ? Buffer.from(state, "base64").toString("utf-8")
        : "/feed";
      res.redirect(302, returnTo);
    } catch (error) {
      console.error("[Google OAuth] Callback failed:", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  // ─── Manus OAuth: callback (legacy, for Manus platform) ──────
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[Manus OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

function getBaseUrl(req: Request): string {
  if (ENV.baseUrl && ENV.baseUrl !== "http://localhost:3000") {
    return ENV.baseUrl.replace(/\/+$/, "");
  }
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
  return `${proto}://${host}`;
}
