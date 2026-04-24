import { FormBuilderPage } from "@/components/admin/form-builder-page";

export default async function AdminFormBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <FormBuilderPage
      formId={id}
      listHref="/admin/formularios"
      listLabel="Voltar aos formulários"
      pageDescription="Estruture formulários em etapas, com contexto, subtítulo e perguntas organizadas para uma experiência mais guiada."
    />
  );
}
