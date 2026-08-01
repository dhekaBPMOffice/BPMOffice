export type AIProviderId = "openai" | "anthropic" | "google";

function tryParseJson(body: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(body) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore
  }
  return null;
}

function googleMessageFromBody(body: string): string | null {
  const json = tryParseJson(body);
  const error = json?.error;
  if (!error || typeof error !== "object") return null;

  const err = error as Record<string, unknown>;
  const message = typeof err.message === "string" ? err.message : "";
  const status = typeof err.status === "string" ? err.status : "";
  const lower = message.toLowerCase();

  if (
    status === "INVALID_ARGUMENT" ||
    lower.includes("api key not valid") ||
    lower.includes("api_key_invalid")
  ) {
    return (
      "Chave de API do Google Gemini inválida. Verifique a chave em Admin → IA ou em Configurações do escritório " +
      "(chave própria substitui a da plataforma). Use uma chave do Google AI Studio ou do Cloud Console com a Gemini API ativa."
    );
  }

  if (lower.includes("api has not been enabled") || lower.includes("not enabled")) {
    return "A Gemini API não está ativada no projeto Google Cloud desta chave. Ative a Gemini API na biblioteca de APIs e tente novamente.";
  }

  if (lower.includes("quota") || lower.includes("rate limit") || status === "RESOURCE_EXHAUSTED") {
    return "Limite de uso da API Google Gemini atingido. Aguarde ou verifique cota/billing no Google Cloud.";
  }

  if (message.trim()) {
    return message.length > 280 ? `${message.slice(0, 277)}…` : message;
  }

  return null;
}

function openAiMessageFromBody(body: string, status: number): string | null {
  const json = tryParseJson(body);
  const err = json?.error;
  if (err && typeof err === "object") {
    const message = (err as { message?: string }).message;
    if (message) {
      const lower = message.toLowerCase();
      if (status === 401 || lower.includes("incorrect api key") || lower.includes("invalid api key")) {
        return "Chave de API da OpenAI inválida. Atualize em Admin → IA ou nas Configurações do escritório.";
      }
      return message.length > 280 ? `${message.slice(0, 277)}…` : message;
    }
  }

  if (status === 401) {
    return "Chave de API da OpenAI inválida. Atualize em Admin → IA ou nas Configurações do escritório.";
  }

  return null;
}

function anthropicMessageFromBody(body: string, status: number): string | null {
  const json = tryParseJson(body);
  const err = json?.error;
  if (err && typeof err === "object") {
    const message = (err as { message?: string }).message;
    if (message) {
      const lower = message.toLowerCase();
      if (status === 401 || lower.includes("authentication") || lower.includes("api key")) {
        return "Chave de API da Anthropic inválida. Atualize em Admin → IA ou nas Configurações do escritório.";
      }
      return message.length > 280 ? `${message.slice(0, 277)}…` : message;
    }
  }

  if (status === 401) {
    return "Chave de API da Anthropic inválida. Atualize em Admin → IA ou nas Configurações do escritório.";
  }

  return null;
}

const PROVIDER_LABEL: Record<AIProviderId, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google Gemini",
};

/**
 * Converte respostas de erro das APIs de IA em mensagens curtas em português.
 */
export function formatProviderError(
  provider: AIProviderId,
  status: number,
  body: string
): string {
  const specific =
    provider === "google"
      ? googleMessageFromBody(body)
      : provider === "openai"
        ? openAiMessageFromBody(body, status)
        : anthropicMessageFromBody(body, status);

  if (specific) return specific;

  const label = PROVIDER_LABEL[provider];
  if (status >= 500) {
    return `Serviço ${label} indisponível no momento (erro ${status}). Tente novamente em instantes.`;
  }

  return `Erro ao comunicar com ${label} (HTTP ${status}). Verifique provedor, modelo e chave de API.`;
}
