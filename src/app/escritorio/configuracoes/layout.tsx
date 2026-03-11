import { requireRole } from "@/lib/auth";

export default async function ConfiguracoesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["leader"]);
  return <>{children}</>;
}
