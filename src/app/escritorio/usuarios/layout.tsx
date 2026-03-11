import { requireRole } from "@/lib/auth";

export default async function UsuariosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["leader"]);
  return <>{children}</>;
}
