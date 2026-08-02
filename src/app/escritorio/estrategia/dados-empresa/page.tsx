import { getOfficeCompanyProfile } from "./actions";
import { DadosEmpresaClient } from "./dados-empresa-client";

export default async function DadosEmpresaPage() {
  const { profile, officeName, error } = await getOfficeCompanyProfile();

  if (error && !officeName) {
    return (
      <div className="p-6 text-destructive">
        {error}
      </div>
    );
  }

  return (
    <DadosEmpresaClient initialProfile={profile} initialOfficeName={officeName} />
  );
}
