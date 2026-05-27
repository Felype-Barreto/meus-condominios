import { redirect } from "next/navigation";

export default async function InvitesRedirectPage({
  params,
}: {
  params: Promise<{ condoId: string }>;
}) {
  const { condoId } = await params;
  redirect(`/app/${condoId}/moradores#convites`);
}
