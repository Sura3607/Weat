/**
 * Voice transcription: OpenAI Whisper direct → Manus Forge fallback
 * Note: Gemini does not have a Whisper-compatible endpoint,
 *       so voice transcription always uses OpenAI or Forge.
 *       If neither is available, we use Gemini LLM as a fallback
 *       by converting audio to text via the chat endpoint.
 */
import { ENV } from "./env";

export type TranscribeOptions = {
  audioUrl: string;
  language?: string;
  prompt?: string;
};

export type WhisperSegment = {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
};

export type WhisperResponse = {
  task: "transcribe";
  language: string;
  duration: number;
  text: string;
  segments: WhisperSegment[];
};

export type TranscriptionResponse = WhisperResponse;

export type TranscriptionError = {
  error: string;
  code: "FILE_TOO_LARGE" | "INVALID_FORMAT" | "TRANSCRIPTION_FAILED" | "SERVICE_ERROR";
  details?: string;
};

function getFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "audio/webm": "webm", "audio/mp3": "mp3", "audio/mpeg": "mp3",
    "audio/wav": "wav", "audio/wave": "wav", "audio/ogg": "ogg",
    "audio/m4a": "m4a", "audio/mp4": "m4a",
  };
  return mimeToExt[mimeType] || "audio";
}

function getLanguageName(langCode: string): string {
  const langMap: Record<string, string> = {
    en: "English", vi: "Vietnamese", es: "Spanish", fr: "French",
    de: "German", ja: "Japanese", ko: "Korean", zh: "Chinese",
  };
  return langMap[langCode] || langCode;
}

/**
 * Fallback: Use Gemini LLM to transcribe audio via the chat endpoint.
 * Gemini supports audio input via file_url in OpenAI-compatible mode.
 */
async function transcribeViaGemini(
  audioBuffer: Buffer,
  mimeType: string,
  language?: string
): Promise<TranscriptionResponse | TranscriptionError> {
  try {
    const audioBase64 = audioBuffer.toString("base64");
    const model = ENV.geminiModel || "gemini-2.5-flash";
    const url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

    const langHint = language ? ` The audio is in ${getLanguageName(language)}.` : "";
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ENV.geminiApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `You are a speech-to-text transcription engine. Transcribe the audio accurately. Return ONLY the transcribed text, nothing else.${langHint}`,
          },
          {
            role: "user",
            content: [
              {
                type: "input_audio",
                input_audio: {
                  data: audioBase64,
                  format: mimeType.includes("wav") ? "wav" : "mp3",
                },
              },
              { type: "text", text: "Transcribe this audio to text." },
            ],
          },
        ],
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("[Whisper/Gemini] Gemini transcription failed:", response.status, errorText);
      return { error: "Gemini transcription failed", code: "TRANSCRIPTION_FAILED", details: `${response.status} ${errorText}` };
    }

    const result = await response.json();
    const text = result.choices?.[0]?.message?.content || "";
    
    if (!text) {
      return { error: "Empty transcription", code: "SERVICE_ERROR" };
    }

    // Return in WhisperResponse format for compatibility
    return {
      task: "transcribe",
      language: language || "vi",
      duration: 0,
      text: text.trim(),
      segments: [],
    };
  } catch (error) {
    console.error("[Whisper/Gemini] Fallback failed:", error);
    return { error: "Gemini transcription failed", code: "SERVICE_ERROR", details: String(error) };
  }
}

export async function transcribeAudio(
  options: TranscribeOptions
): Promise<TranscriptionResponse | TranscriptionError> {
  try {
    // Download audio
    let audioBuffer: Buffer;
    let mimeType: string;
    try {
      const response = await fetch(options.audioUrl);
      if (!response.ok) {
        return { error: "Failed to download audio", code: "INVALID_FORMAT", details: `HTTP ${response.status}` };
      }
      audioBuffer = Buffer.from(await response.arrayBuffer());
      mimeType = response.headers.get("content-type") || "audio/mpeg";
      if (audioBuffer.length > 16 * 1024 * 1024) {
        return { error: "Audio exceeds 16MB limit", code: "FILE_TOO_LARGE" };
      }
    } catch (error) {
      return { error: "Failed to fetch audio", code: "SERVICE_ERROR", details: String(error) };
    }

    // Build form data for Whisper API
    const filename = `audio.${getFileExtension(mimeType)}`;
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    const formData = new FormData();
    formData.append("file", audioBlob, filename);
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");

    const prompt = options.prompt || (
      options.language
        ? `Transcribe the user's voice, language is ${getLanguageName(options.language)}`
        : "Transcribe the user's voice to text"
    );
    formData.append("prompt", prompt);

    // Determine API endpoint - Whisper only available via OpenAI or Forge
    let apiUrl: string | null = null;
    let apiKey: string | null = null;

    if (ENV.openaiApiKey && ENV.openaiApiKey.startsWith("sk-")) {
      // Real OpenAI key → call api.openai.com directly
      apiUrl = "https://api.openai.com/v1/audio/transcriptions";
      apiKey = ENV.openaiApiKey;
    } else if (ENV.openaiApiKey) {
      // Non-standard key → check for custom base URL (proxy)
      const baseUrl = process.env.OPENAI_BASE_URL
        || process.env.OPENAI_API_BASE
        || "https://api.openai.com/v1";
      apiUrl = baseUrl.replace(/\/+$/, "") + "/audio/transcriptions";
      apiKey = ENV.openaiApiKey;
    } else if (ENV.forgeApiKey && ENV.forgeApiUrl) {
      // Manus Forge fallback
      const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
      apiUrl = new URL("v1/audio/transcriptions", baseUrl).toString();
      apiKey = ENV.forgeApiKey;
    }

    // Try Whisper API first
    if (apiUrl && apiKey) {
      console.log(`[Whisper] Calling ${apiUrl}`);
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "Accept-Encoding": "identity" },
        body: formData,
      });

      if (response.ok) {
        const result = (await response.json()) as WhisperResponse;
        if (result.text && typeof result.text === "string") {
          return result;
        }
      } else {
        const errorText = await response.text().catch(() => "");
        console.warn(`[Whisper] OpenAI Whisper failed (${response.status}), trying Gemini fallback...`, errorText);
      }
    }

    // Fallback: Use Gemini for transcription if available
    if (ENV.geminiApiKey) {
      console.log("[Whisper] Falling back to Gemini for transcription");
      return await transcribeViaGemini(audioBuffer, mimeType, options.language);
    }

    return { error: "No transcription API configured", code: "SERVICE_ERROR" };
  } catch (error) {
    return { error: "Voice transcription failed", code: "SERVICE_ERROR", details: String(error) };
  }
}
