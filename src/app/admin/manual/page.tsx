import { requireRole } from "@/lib/auth";
import { ADMIN_FIRST_STEPS, ADMIN_MANUAL_MODULES } from "@/lib/manual/admin-config";
import { FirstStepsRadial, ModuleCard } from "@/components/manual";
import { PageLayout } from "@/components/layout/page-layout";
import { Book } from "lucide-react";

export default async function AdminManualPage() {
  await requireRole(["admin_master"]);

  return (
    <PageLayout
      title="Manual do Administrador"
      description="Documentação das funcionalidades da área de administração master."
      iconName="Book"
    >
      <div className="space-y-8">
        <FirstStepsRadial steps={ADMIN_FIRST_STEPS} />

        <section>
          <h2 className="mb-4 text-lg font-semibold">Módulos e Funcionalidades</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ADMIN_MANUAL_MODULES.map((module) => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
