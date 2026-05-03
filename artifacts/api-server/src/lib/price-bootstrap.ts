import { db, tierPricesTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

const DEFAULT_PRICES: Array<{
  course: string;
  tier: string;
  amountMinor: number;
  currency: string;
}> = [
  { course: "intro", tier: "intro", amountMinor: 15000, currency: "SAR" },
  { course: "intro", tier: "advance", amountMinor: 15000, currency: "SAR" },
  { course: "intro", tier: "complete", amountMinor: 15000, currency: "SAR" },
  { course: "english", tier: "beginner", amountMinor: 15000, currency: "SAR" },
  { course: "english", tier: "intermediate", amountMinor: 15000, currency: "SAR" },
  { course: "english", tier: "advanced", amountMinor: 15000, currency: "SAR" },
];

export async function bootstrapTierPrices(): Promise<void> {
  try {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tierPricesTable);

    if (count > 0) return;

    await db
      .insert(tierPricesTable)
      .values(DEFAULT_PRICES)
      .onConflictDoNothing();

    logger.info(
      { inserted: DEFAULT_PRICES.length },
      "Seeded default tier_prices (table was empty)",
    );
  } catch (err) {
    logger.error({ err }, "Tier price bootstrap failed");
  }
}
