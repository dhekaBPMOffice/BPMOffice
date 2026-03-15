import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/auth";
import { getAllowedModuleIds, markdownToHtml } from "@/lib/manual";
import { MANUAL_MODULES } from "@/lib/manual/config";
import { MANUAL_ICON_MAP } from "@/lib/manual/icons";
import { PageLayout } from "@/components/layout/page-layout";
import { ChevronLeft } from "lucide-react";

interface ManualSlugPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ManualSlugPage({ params }: ManualSlugPageProps) {
  const { slug } = await params;
  const profile = await getProfile();
  const allowedIds = await getAllowedModuleIds(profile);

  if (!allowedIds.has(slug)) {
    notFound();
  }

  const module = MANUAL_MODULES.find((m) => m.id === slug);
  if (!module) {
    notFound();
  }

  const Icon = MANUAL_ICON_MAP[module.iconName];

  return (
    <PageLayout
      title={module.title}
      description={module.shortDescription}
      icon={Icon}
      actions={
        <Link
          href="/escritorio/manual"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar ao manual
        </Link>
      }
    >
      <div className="space-y-6">
        <div
          className="prose prose-sm dark:prose-invert max-w-none [&_ul]:list-disc [&_ul]:ml-4 [&_li]:my-1"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(module.content) }}
        />

        {module.steps && module.steps.length > 0 && (
          <div className="rounded-xl border border-border/40 bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
            <h3 className="mb-3 font-semibold">Passos práticos</h3>
            <ol className="list-decimal space-y-2 pl-4">
              {module.steps.map((step, i) => (
                <li key={i} className="text-muted-foreground">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
