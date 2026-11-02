# Recolha responsável

## Funcionamento e agendamento

A recolha não está agendada. O comando npm run mcp fica à espera de um cliente MCP e não inicia uma recolha sozinho. Uma recolha só começa quando alguém chama scrape_portal ou run_full_sync.

Atualmente não existe um comando que execute uma recolha única sem um cliente MCP. Por isso, ainda não há uma ação para configurar no Agendador de Tarefas do Windows. É possível acrescentar esse comando e depois agendá-lo no Windows, mas não configures o próprio servidor MCP como tarefa: ele ficará à espera e não fará o trabalho por si.

## Antes de recolher

1. Lê os termos de utilização e a política de automação do portal.
2. Confirma `robots.txt` para o endereço exato e verifica se existe API, feed ou autorização.
3. Ajusta URL e seletores do adaptador, começa por uma página e valida os campos normalizados.
4. Mantém a recolha desligada até teres essa confirmação (`SCRAPING_ENABLED=false`).

## Limites implementados

- Playwright com user-agent identificável `CasaClaraLocal/1.0`.
- Consulta de `robots.txt` antes da navegação.
- Intervalo configurável, nunca inferior a 3 segundos, entre páginas.
- Máximo de cinco páginas em cada chamada.
- Interrupção sem repetição em HTTP 403 ou 429.
- O crawler não resolve CAPTCHA, não inicia sessão e não tenta contornar paywall ou mecanismos de acesso.

## Dados e manutenção

Guarda apenas os campos do anúncio necessários à pesquisa: identificador externo, URL, portal, preço, tipologia, área, localização, estado, imagens públicas e data da recolha. Não recolhas contactos pessoais nem reutilizes as imagens fora da finalidade local. Sanitiza texto, valida URLs no domínio do portal e limita o tamanho de descrições e imagens.

Os portais alteram frequentemente o HTML. Se um anúncio não for interpretado, atualiza o adaptador e valida manualmente um pequeno lote. Não aumentes a frequência ou contornes um bloqueio; interrompe a tarefa e contacta o portal ou procura um feed autorizado.

Uma URL de pesquisa pode ser configurada com `PORTAL_SEARCH_URL_<PORTAL>` e o marcador `{local}`. O domínio continua limitado ao portal selecionado. Reinicia a aplicação e o MCP depois de alterar variáveis de ambiente.
