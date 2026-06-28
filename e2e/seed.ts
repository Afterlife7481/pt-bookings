import path from "path";
import { seedE2eFixtures, writeE2eFixtures } from "../tests/helpers/db";

async function main() {
  const fixtures = await seedE2eFixtures();
  const fixturePath = path.join(process.cwd(), "e2e", "fixtures.json");
  writeE2eFixtures(fixtures, fixturePath);

  console.log("E2E database seeded.");
  console.log(`Trainer: ${fixtures.trainerEmail}`);
  console.log(
    `Open slot: ${fixtures.locationName} on ${fixtures.slotDayLabel} 10:00 (week ${fixtures.weekStart})`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
