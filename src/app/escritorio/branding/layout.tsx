import { requireRole } from "@/lib/auth";

export default async function BrandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["leader"]);
  return <>{children}</>;
}
