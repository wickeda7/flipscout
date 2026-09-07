export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { DealDetailView } from "@/components/deals/DealDetailView";
import { flipScoutApi } from "@/lib/api";

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deal = await flipScoutApi.getDeal(id);

  if (!deal) notFound();

  return <DealDetailView deal={deal} />;
}
