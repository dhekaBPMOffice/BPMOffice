"use client";

import { useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { createClient } from "@/lib/supabase/client";
import { saveOfficeBranding } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Palette } from "lucide-react";
import type { Branding } from "@/types/database";

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Falha ao ler arquivo."));
    reader.readAsDataURL(file);
  });
}

export default function BrandingPage() {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [logoUrl, setLogoUrl] = useState("");
  const [logoFileDataUrl, setLogoFileDataUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#0097a7");
  const [secondaryColor, setSecondaryColor] = useState("#7b1fa2");
  const [accentColor, setAccentColor] = useState("#c2185b");
  const [coverUrl, setCoverUrl] = useState("");
  const [headerHtml, setHeaderHtml] = useState("");
  const [footerHtml, setFooterHtml] = useState("");

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("office_id")
        .eq("auth_user_id", user.id)
        .single();

      if (!profile?.office_id) return;

      const { data } = await supabase
        .from("branding")
        .select("*")
        .eq("office_id", profile.office_id)
        .single();

      if (data) {
        setBranding(data as Branding);
        setLogoUrl(data.logo_url ?? "");
        setPrimaryColor(data.primary_color ?? "#0097a7");
        setSecondaryColor(data.secondary_color ?? "#7b1fa2");
        setAccentColor(data.accent_color ?? "#c2185b");
        setCoverUrl(data.cover_url ?? "");
        setHeaderHtml(data.header_html ?? "");
        setFooterHtml(data.footer_html ?? "");
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const result = await saveOfficeBranding({
      logo_url: logoUrl || null,
      logo_file_data_url: logoFileDataUrl,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      accent_color: accentColor,
      cover_url: coverUrl || null,
      header_html: headerHtml || null,
      footer_html: footerHtml || null,
    });

    setSaving(false);

    if (result.success) {
      if (result.logo_url !== undefined) {
        setLogoUrl(result.logo_url || "");
        setLogoFileDataUrl(null);
      }
      setBranding((prev) => (prev ? { ...prev, primary_color: primaryColor, secondary_color: secondaryColor, accent_color: accentColor } : null));
    } else {
      setError(result.error ?? "Erro ao salvar.");
    }
  }

  async function handleLogoUpload(file: File | null) {
    if (!file) return;

    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setError("Formato inválido. Envie apenas PNG ou JPEG.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("O logo deve ter no máximo 5MB.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setLogoFileDataUrl(dataUrl);
      setError(null);
    } catch {
      setError("Não foi possível ler o arquivo selecionado.");
    }
  }

  const currentLogoSrc = logoFileDataUrl || logoUrl;

  if (loading) {
    return (
      <PageLayout title="Identidade Visual" description="Carregando..." icon={Palette}>
        <span />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Identidade Visual"
      description="Personalize a aparência do escritório na plataforma."
      icon={Palette}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configuração</CardTitle>
            <CardDescription>
              Upload do logo e cores do tema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {error}
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor="logo_upload">Logo (PNG ou JPEG)</Label>
                <Input
                  id="logo_upload"
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) => void handleLogoUpload(e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">
                  Envie uma imagem com no máximo 5MB.
                </p>
                {(logoUrl || logoFileDataUrl) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setLogoUrl("");
                      setLogoFileDataUrl(null);
                    }}
                  >
                    Remover logo
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cover_url">URL da capa</Label>
                <Input
                  id="cover_url"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="primary_color">Cor primária</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="primary_color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-14 cursor-pointer rounded border border-input"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondary_color">Cor secundária</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="secondary_color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="h-10 w-14 cursor-pointer rounded border border-input"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accent_color">Cor de destaque</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="accent_color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-10 w-14 cursor-pointer rounded border border-input"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="header_html">HTML do cabeçalho</Label>
                <Textarea
                  id="header_html"
                  value={headerHtml}
                  onChange={(e) => setHeaderHtml(e.target.value)}
                  placeholder="<div>...</div>"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="footer_html">HTML do rodapé</Label>
                <Textarea
                  id="footer_html"
                  value={footerHtml}
                  onChange={(e) => setFooterHtml(e.target.value)}
                  placeholder="<div>...</div>"
                  rows={3}
                />
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pré-visualização</CardTitle>
            <CardDescription>
              Visualização em tempo real das cores e do layout na plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Layout na plataforma</p>
              <div
                className="rounded-[var(--radius-block)] border border-border overflow-hidden bg-background w-full max-w-md"
                style={{
                  ["--identity-primary" as string]: primaryColor,
                  ["--identity-primary-foreground" as string]:
                    primaryColor.toLowerCase().startsWith("#") &&
                    parseInt(primaryColor.slice(1), 16) > 0xffffff / 2
                      ? "#0a0a0a"
                      : "#ffffff",
                  ["--identity-secondary" as string]: secondaryColor,
                  ["--identity-accent" as string]: accentColor,
                }}
              >
                <div className="flex min-h-[120px]">
                  <aside className="w-14 shrink-0 flex flex-col border-r border-border bg-card">
                    <div className="p-2 border-b border-border flex items-center justify-center min-h-[40px]">
                      {currentLogoSrc ? (
                        <img
                          src={currentLogoSrc}
                          alt="Logo"
                          className="h-6 w-auto object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <span className="text-[10px] font-semibold text-foreground">BPM</span>
                      )}
                    </div>
                    <nav className="p-1 flex-1">
                      <div
                        className="rounded px-2 py-1.5 text-[10px] font-medium bg-[var(--identity-primary)]/10 text-[var(--identity-primary)]"
                      >
                        Menu ativo
                      </div>
                      <div className="rounded px-2 py-1.5 text-[10px] text-muted-foreground mt-0.5">
                        Item
                      </div>
                    </nav>
                  </aside>
                  <div className="flex-1 flex flex-col min-w-0">
                    <header className="h-8 border-b border-border bg-card flex items-center px-2">
                      <span className="text-[10px] text-muted-foreground">Barra superior</span>
                      <div
                        className="ml-auto h-5 rounded px-1.5 text-[10px] font-medium border border-[var(--identity-primary)]/50 bg-[var(--identity-primary)]/10 text-[var(--identity-primary)]"
                      >
                        Sair
                      </div>
                    </header>
                    <main className="flex-1 p-2 bg-background">
                      <div className="rounded-[var(--radius-block)] border border-border bg-card p-2">
                        <div className="h-2 w-[75%] bg-muted rounded mb-1" />
                        <div className="h-1.5 w-1/2 bg-muted rounded" />
                      </div>
                    </main>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="rounded-[var(--radius-block)] border border-border p-4 space-y-4"
              style={{
                ["--identity-primary" as string]: primaryColor,
                ["--identity-secondary" as string]: secondaryColor,
                ["--identity-accent" as string]: accentColor,
              }}
            >
              {coverUrl && (
                <div
                  className="h-24 rounded-t-lg bg-cover bg-center -m-4 mb-4 rounded-t-[var(--radius-block)]"
                  style={{ backgroundImage: `url(${coverUrl})` }}
                />
              )}
              <div className="flex items-center gap-4">
                {currentLogoSrc && (
                  <img
                    src={currentLogoSrc}
                    alt="Logo"
                    className="h-12 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <div>
                  <div
                    className="h-3 w-24 rounded"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <div
                    className="mt-1 h-2 w-32 rounded"
                    style={{ backgroundColor: secondaryColor }}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div
                  className="h-8 w-20 rounded"
                  style={{ backgroundColor: primaryColor }}
                />
                <div
                  className="h-8 w-20 rounded"
                  style={{ backgroundColor: accentColor }}
                />
              </div>
              {headerHtml && (
                <div
                  className="text-sm text-muted-foreground border-t border-border pt-4"
                  dangerouslySetInnerHTML={{ __html: headerHtml }}
                />
              )}
              {footerHtml && (
                <div
                  className="text-sm text-muted-foreground border-t border-border pt-4"
                  dangerouslySetInnerHTML={{ __html: footerHtml }}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
