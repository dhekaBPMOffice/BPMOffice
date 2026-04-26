/**
 * Multi-provider AI abstraction for BPM SaaS.
 * Each provider implements the AIProvider interface.
 */

export interface AIProvider {
  generate(prompt: string, context?: string): Promise<{ text: string; tokensUsed?: number }>;
}

type GooglePart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

type GoogleGenerateContentResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  usageMetadata?: { totalTokenCount?: number };
};

export class OpenAIProvider implements AIProvider {
  constructor(
    private apiKey: string,
    private model: string
  ) {}

  async generate(prompt: string, context?: string): Promise<{ text: string; tokensUsed?: number }> {
    const fullPrompt = context ? `${context}\n\n---\n\n${prompt}` : prompt;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: fullPrompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error: ${res.status} - ${err}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };

    const text = data.choices?.[0]?.message?.content ?? "";
    const tokensUsed = data.usage?.total_tokens;

    return { text, tokensUsed };
  }

  /**
   * Gera texto a partir de um prompt e uma imagem (visão).
   * Útil para extrair dados de matriz SWOT em imagem.
   */
  async generateWithImage(
    prompt: string,
    imageDataUrl: string
  ): Promise<{ text: string; tokensUsed?: number }> {
    const content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [
      { type: "text", text: prompt },
      { type: "image_url", image_url: { url: imageDataUrl } },
    ];

    const model = this.model.toLowerCase().includes("gpt-4") ? this.model : "gpt-4o";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content }],
        max_tokens: 2048,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error: ${res.status} - ${err}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };

    const text = data.choices?.[0]?.message?.content ?? "";
    const tokensUsed = data.usage?.total_tokens;

    return { text, tokensUsed };
  }
}

export class AnthropicProvider implements AIProvider {
  constructor(
    private apiKey: string,
    private model: string
  ) {}

  async generate(prompt: string, context?: string): Promise<{ text: string; tokensUsed?: number }> {
    const fullPrompt = context ? `${context}\n\n---\n\n${prompt}` : prompt;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        messages: [{ role: "user", content: fullPrompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error: ${res.status} - ${err}`);
    }

    const data = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const text = data.content?.find((c) => c.type === "text")?.text ?? "";
    const usage = data.usage;
    const tokensUsed =
      usage && (usage.input_tokens != null || usage.output_tokens != null)
        ? (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0)
        : undefined;

    return { text, tokensUsed };
  }
}

export class GoogleProvider implements AIProvider {
  constructor(
    private apiKey: string,
    private model: string
  ) {}

  async generate(prompt: string, context?: string): Promise<{ text: string; tokensUsed?: number }> {
    const fullPrompt = context ? `${context}\n\n---\n\n${prompt}` : prompt;

    return this.generateContent([{ text: fullPrompt }]);
  }

  async generateWithImage(
    prompt: string,
    imageDataUrl: string
  ): Promise<{ text: string; tokensUsed?: number }> {
    const image = this.parseImageDataUrl(imageDataUrl);

    return this.generateContent([
      { text: prompt },
      {
        inline_data: {
          mime_type: image.mimeType,
          data: image.base64,
        },
      },
    ]);
  }

  private async generateContent(parts: GooglePart[]): Promise<{ text: string; tokensUsed?: number }> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google Gemini API error: ${res.status} - ${err}`);
    }

    const data = (await res.json()) as GoogleGenerateContentResponse;

    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text)
        .filter((text): text is string => Boolean(text))
        .join("") ?? "";
    const tokensUsed = data.usageMetadata?.totalTokenCount;

    return { text, tokensUsed };
  }

  private parseImageDataUrl(imageDataUrl: string): { mimeType: string; base64: string } {
    const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new Error("Formato de imagem inválido para o Google Gemini.");
    }

    return {
      mimeType: match[1],
      base64: match[2],
    };
  }
}

export function createProvider(
  provider: "openai" | "anthropic" | "google",
  apiKey: string,
  model: string
): AIProvider {
  switch (provider) {
    case "openai":
      return new OpenAIProvider(apiKey, model);
    case "anthropic":
      return new AnthropicProvider(apiKey, model);
    case "google":
      return new GoogleProvider(apiKey, model);
    default:
      throw new Error(`Provider desconhecido: ${provider}`);
  }
}
