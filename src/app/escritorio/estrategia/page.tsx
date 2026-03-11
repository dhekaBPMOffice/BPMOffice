import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PageLayout } from "@/components/layout/page-layout";
import { IconChip } from "@/components/ui/icon-chip";
import {
  Target,
  Link2,
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
    description: "Objetivos estratégicos e visão da cadeia de valor da organização.",
    icon: Building2,
    variant: "teal",
    links: [
      { label: "Objetivos Estratégicos", href: "/escritorio/estrategia/objetivos-estrategicos", icon: Target },
      { label: "Cadeia de Valor", href: "/escritorio/estrategia/cadeia-valor", icon: Link2 },
      { label: "Alinhamento Estratégico", href: "/escritorio/estrategia/alinhamento-estrategico", icon: Link2 },
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

export default function EstrategiaPage() {
  return (
    <PageLayout
      title="Estratégia"
      description="Planejamento estratégico, cadeia de valor, SWOT e portfólio de serviços."
      icon={Target}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {sections.map((section) => (
          <Card
            key={section.title}
            className="flex flex-col card-hover-shadow hover:-translate-y-0.5"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <IconChip variant={section.variant} size="md">
                  <section.icon className="h-5 w-5 text-white" />
                </IconChip>
                <div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {section.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-2 pt-0">
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "default" }),
                    "w-full justify-start gap-2.5 transition-colors"
                  )}
                >
                  <link.icon className="h-4 w-4 shrink-0 text-[var(--identity-primary)]" />
                  {link.label}
                </Link>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageLayout>
  );
}
