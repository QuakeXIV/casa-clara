import { chromium, type Locator, type Page } from "playwright";
import type { Portal } from "@/lib/types";

export type ScrapeRequest = { portal: Portal; distrito?: string; concelho: string; freguesia?: string; maxPages?: number };
export type ScrapedProperty = {
  externalId: string; sourceUrl: string; portal: Portal; title: string; description: string; price: number;
  typology?: string; usefulArea?: number; grossArea?: number; bathrooms?: number; condition: "NOVO" | "USADO" | "RECUPERADO" | "PARA_RECOMPOR";
  distrito: string; concelho: string; freguesia?: string; address?: string; images: string[]; isPromoted: boolean;
};

const portals: Record<Portal, { host: string; searchUrl: (term: string) => string }> = {
  IDEALISTA: { host: "www.idealista.pt", searchUrl: (term) => `https://www.idealista.pt/comprar-casas/${term}/` },
  IMOVIRTUAL: { host: "www.imovirtual.com", searchUrl: (term) => `https://www.imovirtual.com/comprar/imoveis/${term}/` },
  CASASAPO: { host: "casa.sapo.pt", searchUrl: (term) => `https://casa.sapo.pt/comprar-casas/${term}/` },
  REMAX: { host: "www.remax.pt", searchUrl: (term) => `https://www.remax.pt/comprar?search=${encodeURIComponent(term)}` },
  ERA: { host: "www.era.pt", searchUrl: (term) => `https://www.era.pt/comprar?location=${encodeURIComponent(term)}` },
  SUPERCASA: { host: "supercasa.pt", searchUrl: (term) => `https://supercasa.pt/comprar-casas/${term}` },
  OUTRO: { host: "", searchUrl: (term) => term },
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const normalise = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const lastRequestAt = new Map<Portal, number>();

function parseNumber(raw?: string) {
  if (!raw) return undefined;
  const token = raw.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const value = Number(token);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function euros(text: string) {
  const match = text.match(/€\s*([\d][\d.,\s]*\d?)/u) ?? text.match(/(?:^|[^\p{L}\d])([\d][\d.,\s]*\d?)\s*€/u);
  return parseNumber(match?.[1]);
}

function area(text: string) {
  const match = text.match(/(\d[\d.,]*)\s*m(?:²|2)\b/i);
  return parseNumber(match?.[1]);
}

function robotsAllows(robots: string, path: string) {
  const lines = robots.split(/\r?\n/).map((line) => line.split("#")[0].trim()).filter(Boolean);
  const rules: { allow: boolean; path: string }[] = [];
  let applies = false;
  for (const line of lines) {
    const [rawName, ...rawValue] = line.split(":");
    const name = rawName.trim().toLowerCase();
    const value = rawValue.join(":").trim();
    if (name === "user-agent") {
      applies = value === "*" || /casaclara/i.test(value);
      continue;
    }
    if (!applies || (name !== "allow" && name !== "disallow") || !value) continue;
    rules.push({ allow: name === "allow", path: value.replace(/\*.*$/, "") });
  }
  const matching = rules.filter((rule) => path.startsWith(rule.path)).sort((a, b) => b.path.length - a.path.length);
  return matching[0]?.allow ?? true;
}

async function checkRobots(url: URL) {
  let response: Response;
  try {
    response = await fetch(`${url.origin}/robots.txt`, { headers: { "User-Agent": "CasaClaraLocal/1.0" }, signal: AbortSignal.timeout(8000) });
  } catch {
    throw new Error(`Não foi possível consultar robots.txt de ${url.host}; a recolha foi interrompida por precaução.`);
  }
  if (response.status === 404) return;
  if (!response.ok) throw new Error(`robots.txt de ${url.host} respondeu ${response.status}; a recolha foi interrompida.`);
  const allowed = robotsAllows(await response.text(), url.pathname);
  if (!allowed) throw new Error(`robots.txt de ${url.host} não autoriza esta página de pesquisa.`);
}

async function firstText(card: Locator, selectors: string[]) {
  for (const selector of selectors) {
    const item = card.locator(selector).first();
    if (await item.count().catch(() => 0)) {
      const value = (await item.innerText().catch(() => "")).trim();
      if (value) return value;
    }
  }
  return "";
}

async function collectPage(page: Page, portal: Portal, request: ScrapeRequest) {
  const cardLocator = page.locator("article, [data-testid*=listing], [data-test*=listing], [class*=listing-item], [class*=property-card], [class*=propertyCard]");
  const total = Math.min(await cardLocator.count().catch(() => 0), 120);
  const entries: ScrapedProperty[] = [];
  for (let index = 0; index < total; index += 1) {
    const card = cardLocator.nth(index);
    const text = (await card.innerText().catch(() => "")).replace(/\s+/g, " ").trim();
    if (!text) continue;
    const anchor = card.locator("a[href]").first();
    const href = await anchor.getAttribute("href").catch(() => null);
    if (!href) continue;
    let sourceUrl: string;
    try {
      sourceUrl = new URL(href, page.url()).toString();
    } catch {
      continue;
    }
    if (new URL(sourceUrl).host !== new URL(page.url()).host) continue;
    const price = euros(text);
    if (!price) continue;
    const title = await firstText(card, ["h2", "h3", "[class*=title]", "[data-testid*=title]"]) || text.slice(0, 100);
    const areaValue = area(text);
    const typology = text.match(/\bT\s?([0-9]\+?)(?:\s?\+\s?[0-9])?\b/i)?.[0]?.replace(/\s/g, "").toUpperCase();
    const bathMatch = text.match(/(\d+)\s*(?:casa de banho|casas de banho|wc|w\.c\.)/i);
    const imageLocators = card.locator("img");
    const images: string[] = [];
    for (let imageIndex = 0; imageIndex < Math.min(await imageLocators.count().catch(() => 0), 8); imageIndex += 1) {
      const image = imageLocators.nth(imageIndex);
      const imageUrl = await image.getAttribute("src") || await image.getAttribute("data-src") || await image.getAttribute("data-lazy-src");
      if (imageUrl && /^https?:/.test(imageUrl)) images.push(imageUrl);
    }
    const condition = /novo|constru[cç][aã]o nova/i.test(text) ? "NOVO" : /recuperar|reabilita/i.test(text) ? "RECUPERADO" : "USADO";
    const externalId = new URL(sourceUrl).pathname.split("/").filter(Boolean).pop() || sourceUrl;
    entries.push({ externalId: externalId.slice(0, 180), sourceUrl, portal, title: title.slice(0, 220), description: "", price, typology, usefulArea: areaValue, bathrooms: bathMatch ? Number(bathMatch[1]) : undefined, condition, distrito: request.distrito || "Não especificado", concelho: request.concelho, freguesia: request.freguesia, address: [request.freguesia, request.concelho].filter(Boolean).join(", "), images: [...new Set(images)], isPromoted: /destaque|premium|patrocinado/i.test(text) });
  }
  return entries;
}

export async function scrapePortal(request: ScrapeRequest) {
  if (process.env.SCRAPING_ENABLED !== "true") throw new Error("A recolha está desligada. Define SCRAPING_ENABLED=true depois de confirmares as regras do portal.");
  const config = portals[request.portal];
  if (!config?.host) throw new Error("Portal não configurado para recolha automática.");
  const query = normalise([request.freguesia, request.concelho].filter(Boolean).join(" "));
  const overrideUrl = process.env[`PORTAL_SEARCH_URL_${request.portal}`];
  const startUrl = overrideUrl ? overrideUrl.replace(/\{local\}/g, query) : config.searchUrl(query);
  const start = new URL(startUrl);
  if (start.host !== config.host) throw new Error("O endereço de pesquisa não pertence ao domínio configurado para este portal.");
  const delayMs = Math.max(3000, Number(process.env.SCRAPE_DELAY_MS) || 4000);
  const remainingMs = delayMs - (Date.now() - (lastRequestAt.get(request.portal) ?? 0));
  if (remainingMs > 0) await wait(remainingMs);
  lastRequestAt.set(request.portal, Date.now());
  const configuredMax = Number(process.env.SCRAPE_MAX_PAGES);
  const requestedMax = request.maxPages ?? (Number.isFinite(configuredMax) && configuredMax > 0 ? configuredMax : 2);
  const maxPages = Math.max(1, Math.min(5, requestedMax));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ userAgent: "CasaClaraLocal/1.0 (local property research; contact configured by operator)" });
  const page = await context.newPage();
  const found: ScrapedProperty[] = [];
  try {
    let nextUrl: string | null = start.toString();
    for (let pageNumber = 0; pageNumber < maxPages && nextUrl; pageNumber += 1) {
      if (pageNumber > 0) await wait(delayMs);
      await checkRobots(new URL(nextUrl));
      const response = await page.goto(nextUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
      if (response && [403, 429].includes(response.status())) throw new Error(`O portal respondeu ${response.status()}; a recolha foi parada sem nova tentativa.`);
      await page.locator("body").waitFor({ state: "visible", timeout: 12000 });
      found.push(...await collectPage(page, request.portal, request));
      const next = page.locator('a[rel="next"], a[aria-label*=Próxima], a[aria-label*=Seguinte]').first();
      const href = await next.getAttribute("href").catch(() => null);
      nextUrl = href ? new URL(href, page.url()).toString() : null;
      if (nextUrl && new URL(nextUrl).host !== config.host) nextUrl = null;
    }
    const unique = new Map(found.map((item) => [`${item.portal}:${item.externalId}`, item]));
    return [...unique.values()];
  } finally {
    await context.close();
    await browser.close();
  }
}
