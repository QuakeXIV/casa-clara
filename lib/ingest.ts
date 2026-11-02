import { Portal as PortalEnum, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { scrapePortal, type ScrapeRequest } from "@/mcp-server/scraper";
import type { Portal } from "@/lib/types";

export async function ingestPortal(request: ScrapeRequest) {
  const scraped = await scrapePortal(request);
  let saved = 0;
  for (const item of scraped) {
    const where = { portal_externalId: { portal: item.portal as PortalEnum, externalId: item.externalId } };
    const previous = await prisma.property.findUnique({ where });
    await prisma.property.upsert({
      where,
      create: {
        externalId: item.externalId, sourceUrl: item.sourceUrl, portal: item.portal as PortalEnum, title: item.title,
        description: item.description, price: item.price, typology: item.typology, usefulArea: item.usefulArea,
        grossArea: item.grossArea, pricePerM2: item.usefulArea ? item.price / item.usefulArea : undefined,
        bathrooms: item.bathrooms, condition: item.condition, distrito: item.distrito, concelho: item.concelho,
        freguesia: item.freguesia, address: item.address, images: item.images, isPromoted: item.isPromoted,
      },
      update: {
        sourceUrl: item.sourceUrl, title: item.title, description: item.description,
        previousPrice: previous && previous.price !== item.price ? previous.price : previous?.previousPrice,
        price: item.price, typology: item.typology, usefulArea: item.usefulArea, grossArea: item.grossArea,
        pricePerM2: item.usefulArea ? item.price / item.usefulArea : undefined, bathrooms: item.bathrooms,
        condition: item.condition, distrito: item.distrito, concelho: item.concelho, freguesia: item.freguesia,
        address: item.address, images: item.images, isPromoted: item.isPromoted, scrapedAt: new Date(),
      },
    });
    saved += 1;
  }
  return { portal: request.portal, found: scraped.length, saved };
}

export function dealScore(deviation: number) {
  if (deviation <= -15) return Math.min(98, 88 + Math.abs(deviation + 15) * 0.5);
  if (deviation <= -5) return 75 + Math.abs(deviation + 5) * 1.3;
  if (deviation <= 5) return 70 - Math.abs(deviation) * 1.5;
  return Math.max(10, 62 - (deviation - 5) * 1.4);
}

export function locationKey(item: { distrito: string; concelho: string; freguesia: string | null }) {
  return [item.distrito, item.concelho, item.freguesia ?? ""].join("_");
}

export async function evaluateDeals(filters: { distrito?: string; concelho?: string; freguesia?: string } = {}) {
  const properties = await prisma.property.findMany({ where: filters, orderBy: { scrapedAt: "desc" } });
  const market = new Map<string, number[]>();
  for (const item of properties) {
    const pricePerM2 = item.pricePerM2 ?? (item.usefulArea ? item.price / item.usefulArea : undefined);
    if (!pricePerM2 || !Number.isFinite(pricePerM2)) continue;
    const key = locationKey(item);
    market.set(key, [...(market.get(key) ?? []), pricePerM2]);
  }
  let evaluated = 0;
  for (const [key, prices] of market) {
    const average = prices.reduce((sum, value) => sum + value, 0) / prices.length;
    const stats = { avgPricePerM2: average, minPricePerM2: Math.min(...prices), maxPricePerM2: Math.max(...prices), totalProperties: prices.length };
    await prisma.marketStats.upsert({ where: { locationKey: key }, create: { locationKey: key, ...stats }, update: stats });
    const rows = properties.filter((item) => locationKey(item) === key && (item.pricePerM2 !== null || item.usefulArea !== null));
    for (const item of rows) {
      const itemPrice = item.pricePerM2 ?? (item.usefulArea ? item.price / item.usefulArea : 0);
      if (!itemPrice) continue;
      const deviation = ((itemPrice - average) / average) * 100;
      await prisma.dealEvaluation.upsert({
        where: { propertyId: item.id },
        create: { propertyId: item.id, dealScore: dealScore(deviation), priceDeviationPercent: deviation, notes: { method: "zona-local", locationKey: key, sampleSize: prices.length } },
        update: { dealScore: dealScore(deviation), priceDeviationPercent: deviation, notes: { method: "zona-local", locationKey: key, sampleSize: prices.length } },
      });
      evaluated += 1;
    }
  }
  return { evaluated, locations: market.size };
}

export type SearchFilters = {
  distrito?: string; concelho?: string; freguesia?: string; minPrice?: number; maxPrice?: number;
  typology?: string; minArea?: number; dealScoreMin?: number; portal?: Portal;
};

export async function searchProperties(filters: SearchFilters = {}) {
  const where: Prisma.PropertyWhereInput = {
    ...(filters.distrito ? { distrito: { contains: filters.distrito } } : {}),
    ...(filters.concelho ? { concelho: { contains: filters.concelho } } : {}),
    ...(filters.freguesia ? { freguesia: { contains: filters.freguesia } } : {}),
    ...(filters.minPrice !== undefined || filters.maxPrice !== undefined ? { price: { ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}), ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}) } } : {}),
    ...(filters.typology ? { typology: filters.typology } : {}),
    ...(filters.minArea !== undefined ? { usefulArea: { gte: filters.minArea } } : {}),
    ...(filters.dealScoreMin !== undefined ? { evaluation: { is: { dealScore: { gte: filters.dealScoreMin } } } } : {}),
    ...(filters.portal ? { portal: filters.portal as PortalEnum } : {}),
  };
  return prisma.property.findMany({ where, include: { evaluation: true }, take: 100, orderBy: [{ isPromoted: "desc" }, { price: "asc" }] });
}
