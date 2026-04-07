import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PageLayout } from "@/components/layout/page-layout";
import { IconChip } from "@/components/ui/icon-chip";
import {
  Target,
  Workflow,
  Compass,
  BarChart3,
  Briefcase,
  FilePlus,
  Search,
  Building2,
  FolderKanban,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SectionLink = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type Section = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: "teal" | "purple" | "warm";
  links: SectionLink[];
};

const sections: Section[] = [
  {
    title: "Estratégia da Empresa",
    description: "Objetivos estratégicos, cadeia de valor e gestão de processos do escritório.",
    icon: Building2,
    variant: "teal",
    links: [
      { label: "Objetivos Estratégicos", href: "/escritorio/estrategia/objetivos-estrategicos", icon: Target },
      { label: "Cadeia de Valor e Processos", href: "/escritorio/estrategia/cadeia-valor", icon: Workflow },
      { label: "Alinhamento Estratégico", href: "/escritorio/estrategia/alinhamento-estrategico", icon: Compass },
    ],
  },
  {
    title: "Escritório de Processos",
    description: "Análise SWOT, objetivos do escritório e portfólio de serviços.",
    icon: FolderKanban,
    variant: "purple",
    links: [
      { label: "Análise Swot", href: "/escritorio/estrategia/swot", icon: BarChart3 },
      { label: "Objetivos do Escritório", href: "/escritorio/estrategia/objetivos-escritorio", icon: Target },
      { label: "Portfólio de Serviços", href: "/escritorio/estrategia/portfolio", icon: Briefcase },
    ],
  },
  {
    title: "Plano Tático",
    description: "Crie e consulte planos táticos alinhados à estratégia.",
    icon: ClipboardList,
    variant: "warm",
    links: [
      { label: "Criar Plano Tático", href: "/escritorio/estrategia/plano-tatico/criar", icon: FilePlus },
      { label: "Consultar Plano Tático", href: "/escritorio/estrategia/plano-tatico", icon: Search },
    ],
  },
];

const linkButtonClass = cn(
  buttonVariants({ variant: "ghost", size: "default" }),
  "min-h-10 w-full justify-start gap-2.5 px-5 transition-colors"
);

export default function EstrategiaPage() {
  return (
    <PageLayout
      title="Estratégia"
      description="Planejamento estratégico, cadeia de valor, SWOT e portfólio de serviços."
      icon={Target}
    >
      <div
        className={cn(
          "grid gap-6 lg:grid-cols-3 lg:items-stretch lg:gap-x-6 lg:gap-y-1.5",
          "lg:[grid-template-rows:auto_repeat(3,minmax(2.5rem,auto))]"
        )}
      >
        {sections.map((section) => (
          <Card
            key={section.title}
            className={cn(
              "flex flex-col pb-5 card-hover-shadow hover:-translate-y-0.5",
              "lg:grid lg:row-span-4 lg:[grid-template-rows:subgrid] lg:min-h-0"
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <IconChip variant={section.variant} size="md" className="shrink-0">
                  <section.icon className="h-5 w-5 text-white" />
                </IconChip>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <CardTitle className="text-lg leading-snug">{section.title}</CardTitle>
                  <CardDescription className="leading-snug">
                    {section.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <div className="flex flex-col gap-1.5 lg:contents">
              {section.links.map((link) => (
                <Link key={link.href} href={link.href} className={linkButtonClass}>
                  <link.icon className="h-4 w-4 shrink-0 text-[var(--identity-primary)]" />
                  {link.label}
                </Link>
              ))}
              {section.links.length < 3 ? (
                <div aria-hidden className="hidden min-h-10 shrink-0 lg:block" />
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </PageLayout>
  );
}
