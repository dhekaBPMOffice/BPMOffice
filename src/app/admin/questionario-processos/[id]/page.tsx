import { FormBuilderPage } from "@/components/admin/form-builder-page";

export default async function ActivationFormBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <FormBuilderPage
      formId={id}
      listHref="/admin/questionario-processos"
      listLabel="Voltar ao formulário de ativação"
      pageDescription="Organize o formulário de ativação em blocos guiados para tornar o primeiro contato do líder mais claro, envolvente e memorável."
      lockActivationForm
    />
  );
}
