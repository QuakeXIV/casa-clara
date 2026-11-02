import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, Database, ShieldCheck, Terminal } from "lucide-react";
import { InstallAppButton } from "@/components/install-app-button";

const steps = [
  'cd "C:\\Users\\Pedro Vale\\Desktop\\SimuladorCasas"',
  "if (-not (Test-Path .env)) { Copy-Item .env.example .env }",
  "npm install",
  "npx playwright install chromium",
  "npm run db:generate",
  "npm run db:push",
  "npm run dev",
];

export default function DocumentationPage() {
  return (
    <main className="docs-page">
      <header className="topbar"><Link href="/" className="brand"><span className="brand-mark"><Building2 size={18} /></span><span>casa<span className="brand-light">clara</span></span></Link><div className="top-actions"><InstallAppButton /><Link href="/" className="back-link"><ArrowLeft size={15} /> Voltar à pesquisa</Link></div></header>
      <section className="docs-hero"><span className="eyebrow">GUIA DE ARRANQUE</span><h1>Uma casa local,<br />com tudo no mesmo sítio.</h1><p>Segue estes passos para arrancar o painel, preparar a base de dados e ligar o servidor MCP.</p><p>Também podes instalar a Casa Clara no computador: abre-a no Chrome ou Edge e usa o botão <strong>Instalar no computador</strong> no cabeçalho. Não precisas de conta.</p></section>
      <div className="docs-content">
        <section className="docs-card"><div className="docs-icon"><Terminal size={18} /></div><div><span className="eyebrow">01 — INSTALAÇÃO</span><h2>Preparar o projeto</h2><p>Precisas de Node.js 20+ e npm. Executa os comandos a partir da pasta do projeto:</p><pre>{steps.join("\n")}</pre><p>Depois abre <code>http://localhost:3000</code>. O simulador está disponível em <code>/simulador</code>.</p></div></section>
        <section className="docs-card"><div className="docs-icon"><Database size={18} /></div><div><span className="eyebrow">02 — BASE DE DADOS</span><h2>Base local, sem dados de exemplo</h2><p>O ficheiro <code>.env</code> usa <code>DATABASE_URL=&quot;file:./dev.db&quot;</code> e guarda a base em <code>prisma/dev.db</code>. A base começa vazia e a app não inventa anúncios.</p><p>Para ver as tabelas no navegador, abre um segundo terminal, executa <code>npx prisma studio --browser none</code> e visita <code>http://localhost:5555</code>.</p></div></section>
        <section className="docs-card"><div className="docs-icon"><ShieldCheck size={18} /></div><div><span className="eyebrow">03 — RECOLHA E MCP</span><h2>Recolher anúncios, só quando autorizado</h2><p>O botão de atualização da app chama o serviço MCP local; não precisas de Claude Desktop nem Cursor para usar a app. A ligação a um cliente MCP externo é opcional.</p><p>A recolha começa desligada. Verifica termos e <code>robots.txt</code>; o crawler limita pedidos e pára em respostas 403/429.</p></div></section>
        <section className="docs-next"><div><span className="eyebrow">PRONTO PARA CONTINUAR</span><h2>Calcula o teu cenário de compra.</h2></div><Link href="/simulador">Abrir o simulador <ArrowRight size={15} /></Link></section>
        <p className="docs-note">O guia completo, as ferramentas usadas e as referências oficiais estão no README.md. O simulador calcula os impostos com base nos dados que introduzires e nas regras publicadas de 2026; não está ligado à AT e não emite a liquidação oficial.</p>
      </div>
      <footer className="site-footer"><Link href="/" className="brand small-brand"><span className="brand-mark"><Building2 size={15} /></span><span>casa<span className="brand-light">clara</span></span></Link><span>Guia de utilização local.</span><Link href="/">Início <ArrowRight size={13} /></Link></footer>
    </main>
  );
}
