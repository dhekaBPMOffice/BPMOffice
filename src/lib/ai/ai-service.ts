/**
 * AIService - Orquestra geração de conteúdo com IA multi-provider.
 * Obtém config (escritório ou plataforma), roteia para o provider correto e persiste interações.
 */

import { createClient } from "@/lib/supabase/server";
import { createProvider } from "./providers";
import { getDefaultPrompt } from "./prompts";

export interface AIConfig {
  provider: string;
  model: string;
  apiKey: string;
  prompts: Record<string, string>;
  learnFromHistory: boolean;
}

export interface GenerateOptions {
  phase: string;
  input: string;
  projectId?: string;
  officeId: string;
  userId: string;
}

export interface GenerateResult {
  text: string;
  interactionId: string;
  tokensUsed?: number;
}

export class AIService {
  /**
   * Obtém a configuração de IA: primeiro override do escritório (office_config),
   * depois padrão da plataforma (ai_configs).
   */
  static async getConfig(officeId: string): Promise<AIConfig> {
    const supabase = await createClient();

    // Config da plataforma (ai_configs)
    const { data: platformConfig } = await supabase
      .from("ai_configs")
      .select("default_provider, default_model, default_api_key_encrypted, prompts")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Override do escritório (office_config)
    const { data: officeConfig } = await supabase
      .from("office_config")
      .select("ai_api_key_encrypted, ai_learn_from_history")
      .eq("office_id", officeId)
      .maybeSingle();

    const provider = platformConfig?.default_provider ?? "openai";
    const model = platformConfig?.default_model ?? "gpt-4";
    const apiKey =
      (officeConfig?.ai_api_key_encrypted as string | null) ??
      (platformConfig?.default_api_key_encrypted as string | null) ??
      "";
    const prompts = (platformConfig?.prompts as Record<string, string>) ?? {};
    const learnFromHistory = officeConfig?.ai_learn_from_history ?? true;

    return { provider, model, apiKey, prompts, learnFromHistory };
  }

  /**
   * Busca histórico de interações do projeto para incluir no contexto (se learnFromHistory).
   */
  static async getHistoryContext(projectId: string, limit = 5): Promise<string> {
    const supabase = await createClient();

    const { data: interactions } = await supabase
      .from("ai_interactions")
      .select("phase, input_data, output_data, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!interactions?.length) return "";

    const parts = interactions.map(
      (i) =>
        `[${i.phase}] ${new Date(i.created_at).toLocaleString("pt-BR")}\nEntrada: ${(i.input_data ?? "").slice(0, 500)}...\nSaída: ${(i.output_data ?? "").slice(0, 800)}...`
    );
    return "Histórico de interações anteriores deste projeto:\n\n" + parts.join("\n\n---\n\n");
  }

  /**
   * Gera conteúdo para uma fase BPM.
   */
  static async generateForPhase(options: GenerateOptions): Promise<GenerateResult> {
    const { phase, input, projectId, officeId, userId } = options;

    const config = await this.getConfig(officeId);

    if (!config.apiKey?.trim()) {
      throw new Error("Chave de API de IA não configurada. Configure em Configurações ou no painel admin.");
    }

    const promptTemplate =
      (config.prompts[phase] as string) || getDefaultPrompt(phase);
    const promptUsed = promptTemplate;
    const fullPrompt = `${promptTemplate}\n\nDados de entrada:\n${input}`;

    let context = "";
    if (config.learnFromHistory && projectId) {
      context = await this.getHistoryContext(projectId);
    }

    const provider = createProvider(
      config.provider as "openai" | "anthropic" | "google",
      config.apiKey,
      config.model
    );

    const { text, tokensUsed } = await provider.generate(fullPrompt, context || undefined);

    const supabase = await createClient();

    const { data: interaction, error } = await supabase
      .from("ai_interactions")
      .insert({
        office_id: officeId,
        project_id: projectId ?? null,
        user_id: userId,
        phase,
        provider: config.provider,
        model: config.model,
        prompt_used: promptUsed,
        input_data: input,
        output_data: text,
        tokens_used: tokensUsed ?? null,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Erro ao salvar interação: ${error.message}`);
    }

    return {
      text,
      interactionId: interaction.id,
      tokensUsed,
    };
  }
}
