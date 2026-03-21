import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { getGoogleOAuth } from "./googleOAuth";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  // ─── Google OAuth Routes ────────────────────────────────────────────

  // Initiate Google OAuth login
  app.get("/api/auth/google", (req: Request, res: Response) => {
    const googleOAuth = getGoogleOAuth();
    if (!googleOAuth) {
      res.status(500).json({ error: "Google OAuth not configured" });
      return;
    }

    const redirectUrl = getQueryParam(req, "redirect") || "/";
    const state = Buffer.from(redirectUrl).toString("base64");
    const authUrl = googleOAuth.getAuthUrl(state);

    res.redirect(302, authUrl);
  });

  // Google OAuth callback
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const googleOAuth = getGoogleOAuth();
    if (!googleOAuth) {
      res.status(500).json({ error: "Google OAuth not configured" });
      return;
    }

    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const error = getQueryParam(req, "error");

    if (error) {
      console.error("[GoogleOAuth] Auth error:", error);
      res.redirect(302, "/?error=auth_failed");
      return;
    }

    if (!code) {
      res.status(400).json({ error: "Authorization code is required" });
      return;
    }

    try {
      const tokenResponse = await googleOAuth.exchangeCodeForToken(code);
      const userInfo = await googleOAuth.getUserInfo(tokenResponse.access_token);

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name,
        email: userInfo.email,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Decode redirect URL from state
      const redirectUrl = state ? Buffer.from(state, "base64").toString("utf-8") : "/";
      res.redirect(302, redirectUrl);
    } catch (err) {
      console.error("[GoogleOAuth] Callback failed:", err);
      res.redirect(302, "/?error=auth_failed");
    }
  });

  // ─── Manus OAuth Callback (existing) ────────────────────────────────
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
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  // ─── Logout ─────────────────────────────────────────────────────────
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, cookieOptions);
    res.json({ success: true });
  });
}
