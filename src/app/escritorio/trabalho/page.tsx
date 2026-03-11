import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase } from "lucide-react";

export default function UserWorkspace() {
  return (
    <PageLayout
      title="Área de Trabalho"
      description="Suas demandas e atividades recentes."
      icon={Briefcase}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bem-vindo!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Você ainda não possui demandas atribuídas. Consulte o líder do seu
            escritório para mais informações.
          </p>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
