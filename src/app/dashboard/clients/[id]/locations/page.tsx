import { redirect } from "next/navigation";

export default async function ClientLocationsRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/clients/${id}/settings`);
}
