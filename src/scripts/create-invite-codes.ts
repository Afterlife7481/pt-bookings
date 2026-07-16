/**
 * Admin/ops helper: create seed invite codes (no trainer owner).
 *
 * Usage:
 *   npm run invite:create -- --count 5
 *   npm run invite:create -- --count 3 --max-uses 10
 */
import { ensureDb } from "@/lib/db/init";
import {
  createSeedInviteCodes,
  formatInviteCode,
} from "@/lib/services/invites";

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main() {
  const count = Number(readArg("--count") ?? "5");
  const maxUsesRaw = readArg("--max-uses");
  const maxUses =
    maxUsesRaw === "unlimited" || maxUsesRaw === "null"
      ? null
      : maxUsesRaw != null
        ? Number(maxUsesRaw)
        : undefined;

  if (maxUses !== undefined && maxUses !== null && !Number.isFinite(maxUses)) {
    throw new Error("--max-uses must be a number or 'unlimited'");
  }

  await ensureDb();
  const codes = await createSeedInviteCodes({ count, maxUses });

  console.log(`Created ${codes.length} invite code(s):`);
  for (const code of codes) {
    console.log(`  ${formatInviteCode(code)}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
