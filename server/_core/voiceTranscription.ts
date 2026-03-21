/**
 * Voice transcription: OpenAI Whisper direct → Manus Forge fallback
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

    // Build form data
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

    // Determine API endpoint
    let apiUrl: string;
    let apiKey: string;

    if (ENV.openaiApiKey) {
      // OpenAI (direct or via proxy)
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
    } else {
      return { error: "No transcription API configured", code: "SERVICE_ERROR" };
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "Accept-Encoding": "identity" },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return { error: "Transcription failed", code: "TRANSCRIPTION_FAILED", details: `${response.status} ${errorText}` };
    }

    const result = (await response.json()) as WhisperResponse;
    if (!result.text || typeof result.text !== "string") {
      return { error: "Invalid transcription response", code: "SERVICE_ERROR" };
    }

    return result;
  } catch (error) {
    return { error: "Voice transcription failed", code: "SERVICE_ERROR", details: String(error) };
  }
}
