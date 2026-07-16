import { TrainerSessionDetail } from "../../components/TrainerSessionDetail";

export default async function TrainerSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; clientId?: string }>;
}) {
  const { id } = await params;
  const { from, clientId } = await searchParams;

  let backHref = "/dashboard/sessions";
  let backLabel = "← Back to sessions";

  if (from === "schedule") {
    backHref = "/dashboard/schedule";
    backLabel = "← Back to schedule";
  } else if (from === "client" && clientId) {
    backHref = `/dashboard/clients/${clientId}`;
    backLabel = "← Back to client";
  }

  return (
    <TrainerSessionDetail
      bookingId={id}
      backHref={backHref}
      backLabel={backLabel}
    />
  );
}
