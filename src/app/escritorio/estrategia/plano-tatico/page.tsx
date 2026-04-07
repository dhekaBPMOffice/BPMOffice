import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Map,
  FilePlus,
  CalendarDays,
  ClipboardList,
  CheckCircle2,
  Clock,
  Ban,
  FileText,
} from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { getTacticalPlanDocuments } from "./actions";

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  draft: { label: "Rascunho", className: "bg-gray-100 text-gray-700", icon: FileText },
  active: { label: "Ativo", className: "bg-teal-100 text-teal-700", icon: Clock },
  completed: { label: "Concluído", className: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", className: "bg-red-100 text-red-700", icon: Ban },
};

const HORIZON_LABELS: Record<string, string> = {
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

export default async function PlanoTaticoPage() {
  const { data: documents, error } = await getTacticalPlanDocuments();

  return (
    <PageLayout
      title="Planos Táticos"
      description="Visualize e gerencie os planos táticos do escritório."
      iconName="Map"
      backHref="/escritorio/estrategia"
      actions={
        <Link
          href="/escritorio/estrategia/plano-tatico/criar"
          className={buttonVariants({ size: "sm" }) + " gap-2"}
        >
          <FilePlus className="h-4 w-4" />
          Novo Plano Tático
        </Link>
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            Erro ao carregar planos: {error}
          </div>
        )}

        {(!documents || documents.length === 0) && !error && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground/30" />
              <div className="text-center space-y-1">
                <p className="font-medium text-foreground">Nenhum plano tático cadastrado</p>
                <p className="text-sm text-muted-foreground">
                  Crie seu primeiro plano tático com auxílio de IA para organizar as ações
                  estratégicas do escritório.
                </p>
              </div>
              <Link
                href="/escritorio/estrategia/plano-tatico/criar"
                className={buttonVariants() + " gap-2"}
              >
                <FilePlus className="h-4 w-4" />
                Criar Plano Tático
              </Link>
            </CardContent>
          </Card>
        )}

        {documents && documents.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => {
              const statusConf = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.draft;
              const StatusIcon = statusConf.icon;
              const progress =
                doc.total_actions > 0
                  ? Math.round((doc.completed_actions / doc.total_actions) * 100)
                  : 0;

              return (
                <Link
                  key={doc.id}
                  href={`/escritorio/estrategia/plano-tatico/${doc.id}`}
                  className="block"
                >
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-border/60">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-tight">
                          {doc.title}
                        </CardTitle>
                        <Badge className={`shrink-0 text-[10px] ${statusConf.className}`}>
                          <StatusIcon className="h-3 w-3 mr-0.5" />
                          {statusConf.label}
                        </Badge>
                      </div>
                      {doc.period_start && doc.period_end && (
                        <CardDescription className="flex items-center gap-1 text-xs">
                          <CalendarDays className="h-3 w-3" />
                          {new Date(doc.period_start + "T00:00:00").toLocaleDateString("pt-BR")} —{" "}
                          {new Date(doc.period_end + "T00:00:00").toLocaleDateString("pt-BR")}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{doc.total_actions} ações</span>
                          <span>{HORIZON_LABELS[doc.horizon] ?? doc.horizon}</span>
                        </div>

                        {doc.total_actions > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Progresso</span>
                              <span className="font-medium">{progress}%</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-teal-500 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
