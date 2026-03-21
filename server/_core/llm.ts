import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = { type: "text"; text: string };
export type ImageContent = {
  type: "image_url";
  image_url: { url: string; detail?: "auto" | "low" | "high" };
};
export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: { name: string; description?: string; parameters?: Record<string, unknown> };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = { type: "function"; function: { name: string } };
export type ToolChoice = ToolChoicePrimitive | ToolChoiceByName | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  model?: string;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
};

export type JsonSchema = { name: string; schema: Record<string, unknown>; strict?: boolean };
export type OutputSchema = JsonSchema;
export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

// ─── Helpers ──────────────────────────────────────────────────────

const ensureArray = (value: MessageContent | MessageContent[]): MessageContent[] =>
  Array.isArray(value) ? value : [value];

const normalizeContentPart = (part: MessageContent): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") return { type: "text", text: part };
  if (part.type === "text" || part.type === "image_url" || part.type === "file_url") return part;
  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map((part) => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");
    return { role, name, tool_call_id, content };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return { role, name, content: contentParts[0].text };
  }
  return { role, name, content: contentParts };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;
  if (toolChoice === "none" || toolChoice === "auto") return toolChoice;
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) throw new Error("tool_choice 'required' but no tools");
    if (tools.length > 1) throw new Error("tool_choice 'required' needs single tool or explicit name");
    return { type: "function", function: { name: tools[0].function.name } };
  }
  if ("name" in toolChoice) return { type: "function", function: { name: toolChoice.name } };
  return toolChoice;
};

const normalizeResponseFormat = ({
  responseFormat, response_format, outputSchema, output_schema,
}: Pick<InvokeParams, "responseFormat" | "response_format" | "outputSchema" | "output_schema">):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error("responseFormat json_schema requires a defined schema object");
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return undefined;
  if (!schema.name || !schema.schema) throw new Error("outputSchema requires both name and schema");
  return { type: "json_schema", json_schema: { name: schema.name, schema: schema.schema, ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}) } };
};

// ─── API Resolution ───────────────────────────────────────────────

/**
 * Priority:
 * 1. GEMINI_API_KEY → Google Gemini via OpenAI-compatible endpoint
 * 2. OPENAI_API_KEY (real sk-* key) → OpenAI directly
 * 3. OPENAI_API_KEY + OPENAI_BASE_URL → custom proxy
 * 4. Manus Forge API (fallback for Manus platform)
 *
 * Gemini OpenAI-compatible endpoint:
 *   base_url = https://generativelanguage.googleapis.com/v1beta/openai/
 *   Supports: chat/completions, image_url (base64), response_format (json_schema)
 */
function resolveApiConfig(): { url: string; apiKey: string; model: string } {
  // 1. Google Gemini (preferred - free tier, supports Vision)
  if (ENV.geminiApiKey) {
    const model = ENV.geminiModel || "gemini-2.5-flash";
    const baseUrl = "https://generativelanguage.googleapis.com/v1beta/openai";
    const url = `${baseUrl}/chat/completions`;
    console.log(`[LLM] Using Gemini API (OpenAI-compatible), model=${model}`);
    return { url, apiKey: ENV.geminiApiKey, model };
  }

  // 2. OpenAI API key (real key starting with sk-)
  if (ENV.openaiApiKey && ENV.openaiApiKey.startsWith("sk-")) {
    const model = ENV.openaiModel || "gpt-4o-mini";
    const url = "https://api.openai.com/v1/chat/completions";
    console.log(`[LLM] Using OpenAI API directly, model=${model}`);
    return { url, apiKey: ENV.openaiApiKey, model };
  }

  // 3. OpenAI API key with custom base URL (proxy)
  if (ENV.openaiApiKey) {
    const model = ENV.openaiModel || "gpt-4o-mini";
    const baseUrl = process.env.OPENAI_BASE_URL
      || process.env.OPENAI_API_BASE
      || "https://api.openai.com/v1";
    const url = baseUrl.replace(/\/+$/, "") + "/chat/completions";
    console.log(`[LLM] Using OpenAI proxy at ${baseUrl}, model=${model}`);
    return { url, apiKey: ENV.openaiApiKey, model };
  }

  // 4. Manus Forge API (fallback for Manus platform)
  if (ENV.forgeApiKey) {
    const baseUrl = ENV.forgeApiUrl || "https://forge.manus.im";
    console.log(`[LLM] Using Manus Forge API`);
    return {
      url: `${baseUrl.replace(/\/$/, "")}/v1/chat/completions`,
      apiKey: ENV.forgeApiKey,
      model: "gemini-2.5-flash",
    };
  }

  throw new Error("No LLM API key configured. Set GEMINI_API_KEY, OPENAI_API_KEY, or BUILT_IN_FORGE_API_KEY.");
}

function hasImageContent(messages: Message[]): boolean {
  return messages.some((message) => {
    const parts = Array.isArray(message.content) ? message.content : [message.content];
    return parts.some((part) => typeof part !== "string" && part.type === "image_url");
  });
}

function shouldRetryWithoutResponseFormat(errorText: string): boolean {
  const lowered = errorText.toLowerCase();
  return (
    lowered.includes("response_format")
    || lowered.includes("json_schema")
    || lowered.includes("unsupported")
    || lowered.includes("invalid parameter")
  );
}

function shouldRetryWithVisionModel(errorText: string): boolean {
  const lowered = errorText.toLowerCase();
  return (
    lowered.includes("image")
    || lowered.includes("vision")
    || lowered.includes("content type")
    || lowered.includes("unsupported")
    || lowered.includes("invalid image_url")
    || lowered.includes("does not support")
  );
}

async function callCompletionsApi(
  url: string,
  apiKey: string,
  payload: Record<string, unknown>
): Promise<InvokeResult> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`);
  }

  return (await response.json()) as InvokeResult;
}

// ─── Main invoke ──────────────────────────────────────────────────

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const config = resolveApiConfig();

  const { messages, tools, toolChoice, tool_choice, outputSchema, output_schema, responseFormat, response_format } = params;

  const normalizedMessages = messages.map(normalizeMessage);
  const normalizedToolChoice = normalizeToolChoice(toolChoice || tool_choice, tools);
  const normalizedResponseFormat = normalizeResponseFormat({ responseFormat, response_format, outputSchema, output_schema });

  const createPayload = (
    model: string,
    includeResponseFormat: boolean
  ): Record<string, unknown> => {
    const payload: Record<string, unknown> = {
      model,
      messages: normalizedMessages,
      max_tokens: params.maxTokens || params.max_tokens || 4096,
    };

    if (tools && tools.length > 0) payload.tools = tools;
    if (normalizedToolChoice) payload.tool_choice = normalizedToolChoice;
    if (includeResponseFormat && normalizedResponseFormat) payload.response_format = normalizedResponseFormat;

    return payload;
  };

  const primaryModel = params.model || config.model;
  const visionMode = hasImageContent(messages);
  const modelCandidates = visionMode
    ? Array.from(new Set([primaryModel, process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini", "gpt-4o"]))
    : [primaryModel];

  let lastError: unknown;

  for (const model of modelCandidates) {
    try {
      console.log(`[LLM] Calling ${config.url} with model ${model}`);
      return await callCompletionsApi(config.url, config.apiKey, createPayload(model, true));
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);

      if (normalizedResponseFormat && shouldRetryWithoutResponseFormat(message)) {
        try {
          console.warn(`[LLM] response_format rejected, retrying without response_format (model=${model})`);
          return await callCompletionsApi(config.url, config.apiKey, createPayload(model, false));
        } catch (retryError) {
          lastError = retryError;
        }
      }

      if (!visionMode || !shouldRetryWithVisionModel(message)) {
        break;
      }

      console.warn(`[LLM] Vision request failed on model ${model}, trying next candidate...`);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
