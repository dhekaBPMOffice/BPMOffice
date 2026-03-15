import { getProfile } from "@/lib/auth";
import { getAllowedModuleIds } from "@/lib/manual";
import { FIRST_STEPS_BY_ROLE, MANUAL_MODULES } from "@/lib/manual/config";
import { FirstStepsRadial, ModuleCard } from "@/components/manual";
import { PageLayout } from "@/components/layout/page-layout";
import { Book } from "lucide-react";

export default async function ManualPage() {
  const profile = await getProfile();
  const allowedIds = await getAllowedModuleIds(profile);

  const profileRole = profile.role === "admin_master" || profile.role === "leader" ? "leader" : "user";
  const firstSteps = FIRST_STEPS_BY_ROLE[profileRole].filter((s) => allowedIds.has(s.moduleId));

  const modules = MANUAL_MODULES.filter((m) => allowedIds.has(m.id));

  return (
    <PageLayout
      title="Manual do Usuário"
      description="Documentação das funcionalidades disponíveis para seu perfil."
      icon={Book}
    >
      <div className="space-y-8">
        {firstSteps.length > 0 && <FirstStepsRadial steps={firstSteps} />}

        <section>
          <h2 className="mb-4 text-lg font-semibold">Módulos e Funcionalidades</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
