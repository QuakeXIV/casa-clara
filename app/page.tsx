import { Dashboard } from "@/components/dashboard";
import { prisma } from "@/lib/prisma";
import type { Listing } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getListings(): Promise<Listing[]> {
  try {
    const rows = await prisma.property.findMany({
      include: { evaluation: true }, orderBy: [{ isPromoted: "desc" }, { scrapedAt: "desc" }], take: 80,
    });
    return rows.map((row) => ({
      id: row.id, externalId: row.externalId, sourceUrl: row.sourceUrl, portal: row.portal, title: row.title,
      description: row.description, price: row.price, typology: row.typology ?? "—", usefulArea: row.usefulArea ?? 0,
      grossArea: row.grossArea ?? undefined, bathrooms: row.bathrooms ?? undefined, condition: row.condition,
      distrito: row.distrito, concelho: row.concelho, freguesia: row.freguesia ?? "", address: row.address ?? undefined,
      images: Array.isArray(row.images) ? row.images.filter((image): image is string => typeof image === "string") : [],
      isPromoted: row.isPromoted, scrapedAt: row.scrapedAt.toISOString(), dealScore: row.evaluation?.dealScore,
      priceDeviationPercent: row.evaluation?.priceDeviationPercent, estimatedRentalYield: row.evaluation?.estimatedRentalYield ?? undefined,
    }));
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const listings = await getListings();
  return <Dashboard initialListings={listings} />;
}
