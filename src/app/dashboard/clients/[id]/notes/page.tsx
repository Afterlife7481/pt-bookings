import { redirect } from "next/navigation";

export default async function ClientNotesIndexPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/clients/${id}/notes/private`);
}
