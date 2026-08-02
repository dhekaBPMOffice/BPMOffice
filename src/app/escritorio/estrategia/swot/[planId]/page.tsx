import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ planId: string }>;
};

export default async function SwotPlanRedirectPage({ params }: PageProps) {
  const { planId } = await params;
  redirect(`/escritorio/estrategia/swot?planId=${planId}&edit=1`);
}
