export const ENV = {
  // ─── App ────────────────────────────────────────────────────────
  appId: process.env.VITE_APP_ID ?? "weat",
  cookieSecret: process.env.JWT_SECRET ?? "weat-dev-secret-change-me",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  baseUrl: process.env.BASE_URL ?? "http://localhost:3000",

  // ─── Google OAuth ───────────────────────────────────────────────
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",

  // ─── OpenAI (LLM + Whisper) ────────────────────────────────────
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",

  // ─── AWS S3 Storage ─────────────────────────────────────────────
  s3Bucket: process.env.S3_BUCKET ?? "",
  s3Region: process.env.S3_REGION ?? "ap-southeast-1",
  s3AccessKey: process.env.S3_ACCESS_KEY ?? "",
  s3SecretKey: process.env.S3_SECRET_KEY ?? "",
  s3Endpoint: process.env.S3_ENDPOINT ?? "",
  s3PublicUrl: process.env.S3_PUBLIC_URL ?? "",

  // ─── Google Maps ────────────────────────────────────────────────
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",

  // ─── Legacy Manus (kept for backward compat on Manus platform) ─
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
