# Arquitetura

## Componentes

- **Next.js App Router:** `app/page.tsx` carrega registos Prisma e passa uma lista vazia quando não há anúncios ou a base está indisponível; não substitui dados reais por anúncios fictícios. `components/dashboard.tsx` aplica pesquisa e filtros no cliente. A rota `/simulador` contém o formulário financeiro.
- **Componentes de interface:** `components/ui` contém Button e Badge no padrão Shadcn/Radix, com variantes e classes Tailwind.
- **Prisma + SQLite:** `prisma/schema.prisma` define anúncios, estatísticas de mercado e avaliação. A ligação padrão aponta para `prisma/dev.db`.
- **Ingestão:** `mcp-server/scraper.ts` recebe a localização, verifica `robots.txt`, navega com Playwright e normaliza os campos disponíveis. `lib/ingest.ts` faz upsert e preserva o preço anterior quando deteta alteração.
- **MCP:** `mcp-server/index.ts` regista cinco ferramentas e serve o protocolo por STDIO.
- **Avaliação:** `evaluateDeals` agrupa anúncios pela chave distrito/concelho/freguesia, calcula €/m² médio e grava o desvio e score. Só mede o conjunto local já recolhido; não é uma avaliação bancária nem uma estatística oficial.

## Fluxo de dados

Não existe uma tarefa de recolha agendada nem um comando de execução única. npm run mcp inicia o servidor à espera de um cliente; só recolhe quando uma ferramenta MCP é chamada.

```text
Portal autorizado → Playwright → normalização → Prisma/SQLite
                                              ├─ Dashboard e filtros
                                              ├─ MarketStats / DealEvaluation
                                              └─ Ferramentas MCP
```

O endpoint `POST /api/scrape` inicia um cliente MCP local, liga ao servidor por STDIO e chama `scrape_portal`. O servidor e o frontend partilham `DATABASE_URL`.

## Modelo e índices

`Property` usa chave única composta `(portal, externalId)` para atualizar o mesmo anúncio sem duplicar registos. Os índices apoiam localização, preço/tipologia, €/m² e data de recolha. `MarketStats.locationKey` é única. `DealEvaluation.propertyId` é única e apaga-se em cascata com o imóvel.

As imagens são JSON no SQLite. Os preços e as áreas usam `Float` para simplificar a ingestão; um serviço financeiro de produção deve guardar valores monetários em decimal e rever a precisão antes de relatórios contabilísticos.

## Scores

O score compara €/m² do imóvel com a média dos anúncios guardados na mesma freguesia. A amostra pequena ou enviesada pode alterar o resultado. Quando não há área útil, o anúncio não entra na média. O rendimento de arrendamento fica vazio porque não existe uma fonte de rendas comparáveis neste protótipo.

## Cálculo fiscal

O simulador aplica as tabelas oficiais de IMT de 2026 e a taxa de Imposto do Selo aos valores introduzidos no formulário. Usa o maior entre preço e VPT, calcula a situação de cada comprador e não apresenta resultados enquanto faltar um dado necessário. O âmbito atual é uma compra normal da totalidade de um imóvel urbano habitacional numa escritura; quotas separadas, permutas e imóveis não habitacionais ficam sem cálculo. A base de dados não tem seed: sem anúncios recolhidos, a página mostra uma lista vazia.

## Evolução

Os adaptadores de portal concentram a construção de URL e extração. Quando um portal oferece API ou feed autorizado, pode ser ligado a `ScrapedProperty` sem alterar o dashboard ou a base. Para produção, recomenda-se fila de recolha, logs persistentes, migrações versionadas, monitorização de qualidade e PostgreSQL partilhado.
