import axios from "axios";

export interface GoogleUserInfo {
  openId: string; // Google's sub (subject identifier)
  email: string;
  name: string;
  picture?: string;
  loginMethod: "google";
}

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token: string;
  refresh_token?: string;
}

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export class GoogleOAuthService {
  constructor(
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string
  ) {}

  /**
   * Generate Google OAuth authorization URL
   */
  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
      ...(state && { state }),
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForToken(code: string): Promise<GoogleTokenResponse> {
    const { data } = await axios.post<GoogleTokenResponse>(
      GOOGLE_TOKEN_URL,
      new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: this.redirectUri,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return data;
  }

  /**
   * Get user info from Google
   */
  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const { data } = await axios.get<{
      sub: string;
      email: string;
      name: string;
      picture?: string;
      email_verified: boolean;
    }>(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return {
      openId: `google_${data.sub}`,
      email: data.email,
      name: data.name,
      picture: data.picture,
      loginMethod: "google",
    };
  }
}

let _googleOAuth: GoogleOAuthService | null = null;

export function getGoogleOAuth(): GoogleOAuthService | null {
  if (_googleOAuth) return _googleOAuth;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  if (!clientId || !clientSecret) {
    console.warn("[GoogleOAuth] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
    return null;
  }

  _googleOAuth = new GoogleOAuthService(
    clientId,
    clientSecret,
    `${appUrl}/api/auth/google/callback`
  );

  return _googleOAuth;
}
