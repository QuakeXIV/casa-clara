import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { evaluateDeals, ingestPortal, searchProperties } from "@/lib/ingest";
import { prisma } from "@/lib/prisma";

const outputSchema = z.object({ result: z.unknown() });
const jsonResult = (value: Record<string, unknown>) => ({
  structuredContent: { result: value },
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

const portal = z.enum(["IDEALISTA", "IMOVIRTUAL", "CASASAPO", "REMAX", "ERA", "SUPERCASA"]);

function createServer() {
  const server = new McpServer({ name: "casa-clara-imoveis", version: "1.0.0" });
  server.registerTool("scrape_portal", {
    description: "Recolhe anúncios de um portal quando a recolha está ativada e autorizada.",
    inputSchema: z.object({ portal, distrito: z.string().max(100).optional(), concelho: z.string().min(1).max(100), freguesia: z.string().max(100).optional(), maxPages: z.number().int().min(1).max(5).default(2) }),
    outputSchema,
  }, async ({ portal: portalName, distrito, concelho, freguesia, maxPages }) => jsonResult(await ingestPortal({ portal: portalName, distrito, concelho, freguesia, maxPages })));

  server.registerTool("search_database_properties", {
    description: "Pesquisa os imóveis guardados com filtros geográficos, de preço, área e avaliação.",
    inputSchema: z.object({
      distrito: z.string().optional(), concelho: z.string().optional(), freguesia: z.string().optional(),
      minPrice: z.number().nonnegative().optional(), maxPrice: z.number().positive().optional(), typology: z.string().optional(),
      minArea: z.number().nonnegative().optional(), dealScoreMin: z.number().min(0).max(100).optional(), portal: portal.optional(),
    }),
    outputSchema,
  }, async (filters) => {
    const rows = await searchProperties(filters);
    return jsonResult({ count: rows.length, properties: rows });
  });

  server.registerTool("evaluate_market_deals", {
    description: "Calcula preço médio por m² e score relativo aos imóveis guardados por freguesia.",
    inputSchema: z.object({ distrito: z.string().optional(), concelho: z.string().optional(), freguesia: z.string().optional() }),
    outputSchema,
  }, async (filters) => jsonResult(await evaluateDeals(filters)));

  server.registerTool("run_full_sync", {
    description: "Executa uma recolha sequencial dos portais configurados para uma região.",
    inputSchema: z.object({ distrito: z.string().max(100).optional(), concelho: z.string().min(1).max(100), freguesia: z.string().max(100).optional(), maxPages: z.number().int().min(1).max(5).default(1) }),
    outputSchema,
  }, async ({ distrito, concelho, freguesia, maxPages }) => {
    const portals = ["IDEALISTA", "IMOVIRTUAL", "CASASAPO", "REMAX", "ERA", "SUPERCASA"] as const;
    const results = [];
    for (const portalName of portals) {
      try {
        results.push(await ingestPortal({ portal: portalName, distrito, concelho, freguesia, maxPages }));
      } catch (error) {
        results.push({ portal: portalName, error: error instanceof Error ? error.message : "Falha desconhecida." });
      }
    }
    return jsonResult({ distrito, concelho, freguesia, results });
  });

  server.registerTool("get_market_stats", {
    description: "Devolve as estatísticas de mercado já calculadas, ordenadas pela última atualização.",
    inputSchema: z.object({}),
    outputSchema,
  }, async () => {
    const rows = await prisma.marketStats.findMany({ orderBy: { lastCalculatedAt: "desc" }, take: 100 });
    return jsonResult({ count: rows.length, locations: rows });
  });
  return server;
}

serveStdio(createServer);
