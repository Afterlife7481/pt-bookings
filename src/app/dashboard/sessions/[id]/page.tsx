import { TrainerSessionDetail } from "../../components/TrainerSessionDetail";

export default async function TrainerSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TrainerSessionDetail bookingId={id} />;
}
