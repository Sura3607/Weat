export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Generate login URL at runtime.
 * Priority: Google OAuth route → Manus OAuth portal (legacy)
 */
export const getLoginUrl = (returnTo?: string): string => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // If VITE_OAUTH_PORTAL_URL is not set, use Google OAuth route
  if (!oauthPortalUrl) {
    const url = new URL(`${window.location.origin}/api/auth/google`);
    if (returnTo) {
      url.searchParams.set("returnTo", returnTo);
    }
    return url.toString();
  }

  // Manus OAuth (legacy)
  try {
    const redirectUri = `${window.location.origin}/api/oauth/callback`;
    const state = btoa(redirectUri);
    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", appId || "");
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");
    return url.toString();
  } catch {
    // Fallback to Google OAuth if Manus URL construction fails
    return `${window.location.origin}/api/auth/google`;
  }
};
