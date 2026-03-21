# Weat - Environment Variables Reference

Copy this to `.env` on your EC2 server and fill in the values.

```bash
# ─── App ────────────────────────────────────────────────────
NODE_ENV=production
BASE_URL=https://weat.compsci.studio
JWT_SECRET=your-random-secret-at-least-32-chars

# ─── Database (MySQL) ──────────────────────────────────────
DATABASE_URL=mysql://weat_user:your_password@db:3306/weat

# ─── Google OAuth ───────────────────────────────────────────
# Get from: https://console.cloud.google.com/apis/credentials
# Authorized redirect URI: https://weat.compsci.studio/api/auth/google/callback
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# ─── OpenAI (LLM + Whisper) ────────────────────────────────
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o-mini

# ─── AWS S3 Storage ────────────────────────────────────────
S3_BUCKET=weat-storage
S3_REGION=ap-southeast-1
S3_ACCESS_KEY=your-aws-access-key
S3_SECRET_KEY=your-aws-secret-key
# S3_ENDPOINT=          # Optional: for MinIO, DigitalOcean Spaces
# S3_PUBLIC_URL=         # Optional: CDN URL

# ─── Google Maps ────────────────────────────────────────────
# Enable: Maps JavaScript API, Places API, Geocoding API
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# ─── Vite Frontend ─────────────────────────────────────────
VITE_APP_ID=weat
VITE_APP_TITLE=Weat
VITE_OAUTH_PORTAL_URL=
```
