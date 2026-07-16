import { TrainerSessionDetail } from "../../components/TrainerSessionDetail";

export default async function TrainerSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  return (
    <TrainerSessionDetail
      bookingId={id}
      backHref={from === "schedule" ? "/dashboard/schedule" : "/dashboard/sessions"}
      backLabel={from === "schedule" ? "← Back to schedule" : "← Back to sessions"}
    />
  );
}
