"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageLayout } from "@/components/layout/page-layout";
import { Palette } from "lucide-react";
import { saveDefaultBranding } from "./actions";

interface Branding {
  id: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string | null;
}

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

  const [primaryColor, setPrimaryColor] = useState("#0097a7");
  const [secondaryColor, setSecondaryColor] = useState("#7b1fa2");
  const [accentColor, setAccentColor] = useState("#c2185b");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFileDataUrl, setLogoFileDataUrl] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("branding")
        .select("id, primary_color, secondary_color, accent_color, logo_url")
        .eq("is_default", true)
        .is("office_id", null)
        .maybeSingle();

      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }

      if (data) {
        setBranding(data);
        setPrimaryColor(data.primary_color || "#0097a7");
        setSecondaryColor(data.secondary_color || "#7b1fa2");
        setAccentColor(data.accent_color || "#c2185b");
        setLogoUrl(data.logo_url || "");
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const result = await saveDefaultBranding({
      id: branding?.id,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      accent_color: accentColor,
      logo_url: logoUrl || null,
      logo_file_data_url: logoFileDataUrl,
    });

    if (result?.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    if (result?.id) {
      setBranding((prev) => (prev ? { ...prev, id: result.id } : null));
    }
    if (result?.logo_url !== undefined) {
      setLogoUrl(result.logo_url || "");
      setLogoFileDataUrl(null);
    }
    setSaving(false);
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
      <PageLayout title="Identidade Visual" description="Configure a identidade visual padrão da plataforma." icon={Palette}>
        <p className="text-muted-foreground">Carregando...</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Identidade Visual" description="Configure a identidade visual padrão da plataforma." icon={Palette}>
      <Card>
        <CardHeader>
          <CardTitle>Branding Padrão</CardTitle>
          <CardDescription>
            Cores e logo aplicados por padrão aos escritórios que não possuem customização.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Cor primária</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary_color"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-14 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary_color">Cor secundária</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondary_color"
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="h-10 w-14 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accent_color">Cor de destaque</Label>
                <div className="flex gap-2">
                  <Input
                    id="accent_color"
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-10 w-14 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

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

            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pré-visualização do layout</CardTitle>
          <CardDescription>
            Como as cores e o logo aparecem na plataforma (base neutra + identidade em destaque).
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  <div className="rounded px-2 py-1.5 text-[10px] font-medium bg-[var(--identity-primary)]/10 text-[var(--identity-primary)]">
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
                  <div className="ml-auto h-5 rounded px-1.5 text-[10px] font-medium border border-[var(--identity-primary)]/50 bg-[var(--identity-primary)]/10 text-[var(--identity-primary)]">
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
        </CardContent>
      </Card>
    </PageLayout>
  );
}
