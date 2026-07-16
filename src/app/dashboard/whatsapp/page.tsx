import { redirect } from "next/navigation";

/** Legacy URL — the activity log lives at /dashboard/feed */
export default function LegacyFeedRedirectPage() {
  redirect("/dashboard/feed");
}
