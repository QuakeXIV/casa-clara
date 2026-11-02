# Casa Clara

Casa Clara é uma aplicação local para consultar anúncios imobiliários, comparar os anúncios guardados e calcular os impostos da compra de uma casa em Portugal.

## Começar a usar no Windows

Abre o PowerShell e executa:

    cd "C:\Users\Pedro Vale\Desktop\SimuladorCasas"
    npm run dev

Deixa essa janela aberta e visita http://localhost:3000 no Chrome ou Edge. Para desligar a aplicação, volta ao PowerShell e carrega em Ctrl+C.

Também podes iniciar a aplicação com duplo clique em Iniciar Casa Clara.cmd, dentro da pasta do projeto. A janela que abrir tem de ficar ligada enquanto usas a aplicação.

Não precisas de criar uma conta para usar a Casa Clara localmente.

### Instalar a Casa Clara como aplicação

Com a Casa Clara aberta no Chrome ou Edge, clica em Instalar no computador no cabeçalho. O navegador cria uma janela e um atalho próprios para a Casa Clara. Continua a ser a aplicação local deste computador; não é necessário Claude, Cursor nem uma conta num serviço pago.

## Preparação inicial

Só precisas de fazer estes passos uma vez neste computador. No PowerShell:

    cd "C:\Users\Pedro Vale\Desktop\SimuladorCasas"
    if (-not (Test-Path .env)) { Copy-Item .env.example .env }
    npm install
    npx playwright install chromium
    npm run db:generate
    npm run db:push
    npm run dev

Depois abre http://localhost:3000. Nas próximas utilizações, basta executar npm run dev ou abrir Iniciar Casa Clara.cmd.

Se já existe um ficheiro .env, não o substituas: pode conter definições locais. A recolha de anúncios começa desligada.

## Ver as tabelas e os dados

O SQLite é a base de dados da aplicação. Os dados ficam no ficheiro prisma/dev.db, dentro da pasta do projeto. Não é uma aplicação gráfica.

Para ver as tabelas, abre uma segunda janela do PowerShell, mantendo a aplicação ligada, e executa:

    cd "C:\Users\Pedro Vale\Desktop\SimuladorCasas"
    npx prisma studio --browser none

Visita http://localhost:5555 no navegador. Aí podes abrir as tabelas Property, MarketStats e DealEvaluation. O Prisma Studio é a ferramenta visual para consultar a base de dados; o Prisma Client é a biblioteca que a aplicação usa para ler e guardar dados. Não precisas de criar conta.

A base de dados deste projeto está vazia. A Casa Clara não apresenta anúncios nem resultados inventados quando ainda não existem dados reais. As tabelas só passam a ter registos quando introduzires dados autorizados através das ferramentas de recolha.

## O que significa cada ferramenta

- Node.js executa o código da aplicação no computador. O npm instala as bibliotecas do projeto e inicia os comandos.
- Next.js serve as páginas da aplicação no endereço local localhost:3000.
- React e TypeScript são usados para construir os ecrãs e a lógica da aplicação.
- Tailwind CSS, Radix e Lucide fornecem estilos, controlos de interface e ícones. Recharts desenha gráficos.
- SQLite guarda os dados num ficheiro local. Não é necessário instalar ou criar uma conta num servidor de bases de dados.
- Prisma Client liga o código à base de dados. O Prisma Studio permite ver as tabelas numa página do navegador.
- Playwright controla o Chromium para ler páginas públicas de portais quando a recolha estiver autorizada.
- MCP é uma forma normalizada de uma ferramenta local oferecer funções a aplicações como Claude Desktop ou Cursor. A Casa Clara consegue iniciar o seu servidor MCP local; a app e o simulador não precisam de Claude nem de Cursor.

## Servidor MCP e recolha de anúncios

O MCP é opcional para abrir e usar a Casa Clara. Só precisas de ligar um cliente MCP se quiseres chamar as ferramentas de recolha, pesquisa e avaliação através do Claude Desktop, Cursor ou do MCP Inspector. Não precisas de pagar por Claude ou Cursor para executar a Casa Clara.

Para arrancar o servidor MCP manualmente, abre outro PowerShell na pasta do projeto:

    cd "C:\Users\Pedro Vale\Desktop\SimuladorCasas"
    npm run mcp

Este comando deixa o servidor à espera de um cliente MCP; por si só não recolhe anúncios. Para experimentar as ferramentas sem Claude ou Cursor, podes usar o MCP Inspector:

    npx @modelcontextprotocol/inspector node_modules/tsx/dist/cli.mjs mcp-server/index.ts

A primeira utilização do Inspector pode precisar de descarregar essa ferramenta da Internet. O Inspector é opcional.

O servidor disponibiliza estas ferramentas:

| Ferramenta | Para que serve |
| --- | --- |
| scrape_portal | Recolhe anúncios de um portal e guarda-os localmente. |
| search_database_properties | Procura anúncios que já estão na base de dados. |
| evaluate_market_deals | Compara os preços por metro quadrado dos anúncios guardados na mesma zona. |
| run_full_sync | Tenta recolher, em sequência, os portais configurados para uma localização. |
| get_market_stats | Mostra estatísticas que já tenham sido calculadas e guardadas. |

O caminho dos dados é: portal autorizado → Playwright lê a página → a aplicação organiza os campos → Prisma grava no SQLite → a página apresenta os registos.

### A recolha é agendada?

Não. A recolha atual é manual; não existe um horário nem uma tarefa automática. O comando npm run mcp também não agenda recolhas: fica apenas à espera que o cliente lhe peça uma ferramenta.

É possível criar um comando de recolha único e depois executá-lo pelo Agendador de Tarefas do Windows. Esse comando de execução única ainda não existe neste projeto, por isso não há um horário que possas configurar agora. Até lá, a recolha tem de ser iniciada manualmente por uma ferramenta MCP.

Se a base de dados estiver vazia, não existem cartões de anúncios com botão de atualização. Nesse caso, usa uma ferramenta MCP como scrape_portal ou run_full_sync para iniciar a primeira recolha, depois de confirmares que o portal permite esse acesso.

### Ativar a recolha

Por segurança, o ficheiro .env começa com:

    SCRAPING_ENABLED=false

Mantém este valor até confirmares os termos e as permissões do portal e reveres o respetivo adaptador. A aplicação consulta robots.txt, usa um identificador explícito, espera pelo menos 3 segundos entre páginas, limita cada pedido a 5 páginas e pára perante respostas 403 ou 429. Não tenta contornar CAPTCHAs, autenticação, paywalls ou bloqueios. Se um portal bloquear o acesso, interrompe a recolha e procura uma API, um feed ou autorização do portal.

## Cálculo de impostos da compra

O simulador usa as tabelas oficiais de 2026 para calcular IMT e Imposto do Selo na compra da totalidade de um imóvel urbano habitacional, transferido numa só escritura. Compras de apenas uma quota, permutas e imóveis não habitacionais não são calculados nesta versão. Para não inventar dados, o resultado fica vazio até serem introduzidos o preço do contrato, o VPT, a região e os dados reais de todos os compradores.

O cálculo usa o maior valor entre o preço do contrato e o VPT. Para cada comprador, pede idade na escritura, residência fiscal, titularidade de imóvel habitacional nos últimos três anos, situação de dependente para IRS e quota. A aplicação não presume uma divisão de 50/50.

O benefício IMT Jovem é aplicado segundo os requisitos declarados: idade até 35 anos, habitação própria e permanente, não ter sido titular de imóvel habitacional durante o período legal e não ser dependente para IRS no ano da compra. Os dados de residência fiscal também são usados para a regra de 2026 aplicável a compradores não residentes.

Para calcular quanto dinheiro é necessário para a escritura, introduz o empréstimo aprovado e o prazo indicados pelo banco. A prestação mensal, se quiseres mostrá-la, é copiada da proposta do banco: a Casa Clara não inventa TAN nem calcula uma prestação que o banco não confirmou. O cálculo de capitais próprios soma a parte do preço não coberta pelo empréstimo, IMT, Imposto do Selo da aquisição e Imposto do Selo do crédito. Não inclui escritura, registos, seguros, avaliação ou comissões.

Os números são o resultado aritmético das regras de 2026 aplicadas aos valores e respostas que introduzires. A app não consulta a tua situação fiscal nem está ligada ao Portal das Finanças, pelo que não emite a liquidação oficial da AT. Para uma compra fora de 2026 ou uma situação especial que não esteja descrita no formulário, os valores desta versão não se aplicam.

## Problemas comuns

### O Prisma mostra erro EPERM ao gerar o cliente

O Windows pode impedir a substituição de um ficheiro do Prisma enquanto a aplicação ou o visualizador da base de dados o está a usar. Fecha primeiro as janelas que executam npm run dev, npm run mcp e Prisma Studio com Ctrl+C. Depois:

    cd "C:\Users\Pedro Vale\Desktop\SimuladorCasas"
    npm run db:generate

### O endereço local não abre

Confirma que o PowerShell onde executaste npm run dev continua aberto. A aplicação só está disponível neste computador enquanto esse processo estiver ativo.

## Principais comandos

| Comando | O que faz |
| --- | --- |
| npm run dev | Inicia a aplicação para uso local. |
| npm run db:generate | Gera a biblioteca Prisma usada pelo código. |
| npm run db:push | Cria ou atualiza as tabelas SQLite de acordo com o schema. |
| npx prisma studio --browser none | Abre o visualizador da base de dados. |
| npm run mcp | Inicia o servidor MCP à espera de um cliente. |

## Estrutura do projeto

    app/                 páginas da Casa Clara e endpoint local
    components/          ecrãs, filtros, gráficos e simulador
    lib/                 ligação à base de dados, formatos e cálculos
    mcp-server/          servidor MCP e adaptadores Playwright
    prisma/schema.prisma estrutura das tabelas
    prisma/dev.db        base de dados SQLite local
    docs/                notas de arquitetura e recolha

Mais detalhe: docs/ARCHITECTURE.md e docs/SCRAPING.md.

## Precisão dos anúncios

Os valores recolhidos de portais são preços pedidos nos anúncios, não preços oficiais de escrituras. O preço por metro quadrado e a comparação de oportunidades descrevem apenas o conjunto de anúncios guardados na base de dados; não são uma avaliação oficial ou bancária do imóvel.

## Fontes fiscais oficiais

- AT — [Compra de casa: IMT e Imposto do Selo](https://info.portaldasfinancas.gov.pt/pt/apoio_ao_contribuinte/Cidadaos/Casa_e_propriedades/Compra_da_casa/Paginas/default.aspx)
- AT — [Tabelas práticas de IMT para 2026](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/legislacao/instrucoes_administrativas/Documents/Oficio_circulado_40129_2026.pdf)
- AT — [Artigo 12.º do CIMT: valor tributável](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cimt/Pages/cimt12.aspx)
- AT — [Artigo 17.º do CIMT: taxas e regra para não residentes](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cimt/Pages/cimt17.aspx)
- AT — [Artigo 9.º do CIMT: isenção IMT Jovem](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cimt/Pages/cimt9.aspx)
- AT — [Artigo 7.º-A do Código do Imposto do Selo: aquisição por jovens](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/selo/Pages/selo7a.aspx)
- AT — [Tabela Geral do Imposto do Selo](https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/selo/Pages/ccod-selo-tabgiselo.aspx)
- Diário da República — [Decreto-Lei n.º 97/2026](https://diariodarepublica.pt/dr/detalhe/decreto-lei/97-2026-1124493227)
