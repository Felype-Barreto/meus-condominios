import type { ReactNode } from "react";
import { redirect } from "next/navigation";

export default async function WhatsAppLockedLayout({
  params,
}: {
  children: ReactNode;
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;
  redirect(`/app/${condoId}/dashboard`);
}
