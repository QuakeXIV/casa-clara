import { NextResponse } from "next/server";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { resolve } from "node:path";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  portal: z.enum(["IDEALISTA", "IMOVIRTUAL", "CASASAPO", "REMAX", "ERA", "SUPERCASA"]),
  distrito: z.string().trim().max(100).optional(),
  concelho: z.string().trim().min(1).max(100).optional().default("Porto"),
  freguesia: z.string().trim().max(100).optional(),
  maxPages: z.number().int().min(1).max(5).optional().default(1),
});

type ScrapeRateState = typeof globalThis & { casaClaraScrapeTimes?: Map<string, number> };
const scrapeTimes = ((globalThis as ScrapeRateState).casaClaraScrapeTimes ??= new Map<string, number>());

export async function POST(request: Request) {
  let client: Client | undefined;
  try {
    const input = requestSchema.parse(await request.json());
    if (process.env.SCRAPING_ENABLED !== "true") {
      const message = "A recolha está desligada. Define SCRAPING_ENABLED=true depois de confirmares as regras do portal.";
      return NextResponse.json({ error: message, message }, { status: 409 });
    }
    const delayMs = Math.max(3000, Number(process.env.SCRAPE_DELAY_MS) || 4000);
    const remainingMs = delayMs - (Date.now() - (scrapeTimes.get(input.portal) ?? 0));
    if (remainingMs > 0) {
      const message = `Aguarda ${Math.ceil(remainingMs / 1000)} s antes de pedir outra recolha deste portal.`;
      return NextResponse.json({ error: message, message }, { status: 429 });
    }
    scrapeTimes.set(input.portal, Date.now());
    client = new Client({ name: "casa-clara-dashboard", version: "1.0.0" });
    const root = process.cwd();
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [resolve(root, "node_modules/tsx/dist/cli.mjs"), resolve(root, "mcp-server/index.ts")],
    });
    await client.connect(transport);
    const result = await client.callTool({ name: "scrape_portal", arguments: input });
    if (result.isError) {
      const errorText = result.content.find((block) => block.type === "text")?.text;
      throw new Error(errorText ?? "O servidor MCP não concluiu a recolha.");
    }
    const text = result.content.find((block) => block.type === "text")?.text ?? "{}";
    const payload = JSON.parse(text) as { portal: string; found: number; saved: number };
    return NextResponse.json({ ...payload, message: `${payload.saved} anúncios de ${payload.portal} atualizados via MCP.` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao recolher anúncios.";
    return NextResponse.json({ error: message, message }, { status: 400 });
  } finally {
    await client?.close().catch(() => undefined);
  }
}
