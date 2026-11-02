"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, CircleHelp, Info, Plus, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { InstallAppButton } from "@/components/install-app-button";
import { calculatePurchase, getFinanceInputIssue, validateTaxInputs, type BuyerInput, type PurchaseInput, type Region } from "@/lib/simulator";
import { numberPt } from "@/lib/format";

const emptyBuyer = (): BuyerInput => ({
  ageAtDeed: null,
  isTaxResident: null,
  wasTaxResident: null,
  ownedHousingPropertyNowOrInLastThreeYears: null,
  isDependentForIRSInAcquisitionYear: null,
  sharePercent: null,
});

const initial: PurchaseInput = {
  contractPrice: null,
  vpt: null,
  region: null,
  isPermanentHome: null,
  wholePropertyTransferredInAct: null,
  buyers: [emptyBuyer()],
  availableCash: null,
  loanPrincipal: null,
  loanTermMonths: null,
  bankMonthlyPayment: null,
};

const money = (amount: number | null | undefined) => amount === null || amount === undefined
  ? "—"
  : new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="sim-field"><span className="sim-label">{label}{hint && <span className="field-hint" title={hint}><CircleHelp size={13} /></span>}</span>{children}</label>;
}

function BooleanSelect({ value, onChange }: { value: boolean | null; onChange: (value: boolean | null) => void }) {
  return <div className="sim-select-wrap"><select value={value === null ? "" : value ? "true" : "false"} onChange={(event) => onChange(event.target.value === "" ? null : event.target.value === "true")}><option value="">Escolhe uma opção</option><option value="true">Sim</option><option value="false">Não</option></select></div>;
}

function NumberInput({ value, onChange, min = 0, max, step = 1, suffix }: {
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return <div className="input-with-suffix"><input type="number" min={min} max={max} step={step} value={value ?? ""} onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))} /><span>{suffix}</span></div>;
}

export function Simulator() {
  const [form, setForm] = useState(initial);
  const update = <K extends keyof PurchaseInput>(key: K, value: PurchaseInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const updateBuyer = <K extends keyof BuyerInput>(index: number, key: K, value: BuyerInput[K]) => {
    setForm((current) => ({
      ...current,
      buyers: current.buyers.map((buyer, buyerIndex) => buyerIndex === index ? { ...buyer, [key]: value } : buyer),
    }));
  };
  const taxIssues = useMemo(() => validateTaxInputs(form), [form]);
  const financeIssue = useMemo(() => getFinanceInputIssue(form), [form]);
  const result = useMemo(() => taxIssues.length === 0 ? calculatePurchase(form) : null, [form, taxIssues]);

  return (
    <main className="sim-page">
      <header className="topbar sim-topbar"><Link href="/" className="brand"><span className="brand-mark"><Building2 size={18} strokeWidth={2.3} /></span><span>casa<span className="brand-light">clara</span></span></Link><nav className="main-nav"><Link href="/">Explorar casas</Link><Link className="nav-active" href="/simulador">Cálculo de compra <span className="nav-new">2026</span></Link><a href="/#mercado">Mercado</a></nav><div className="top-actions"><InstallAppButton /><Link href="/" className="back-link"><ArrowLeft size={15} /> Voltar à pesquisa</Link></div></header>

      <section className="sim-intro">
        <div className="eyebrow"><Sparkles size={13} /> CÁLCULO DE COMPRA DE CASA</div>
        <h1>Quanto tens de pagar<br />na compra da casa?</h1>
        <p>O cálculo usa o preço do contrato, o VPT e a situação real de cada comprador. Não preenchemos valores por ti.</p>
        <div className="sim-intro-meta"><span><ShieldCheck size={15} /> Tabelas fiscais oficiais de 2026</span><i /><span>IMT, Imposto do Selo e capitais próprios</span></div>
      </section>

      <div className="sim-content">
        <section className="sim-form-card">
          <div className="sim-card-title"><div><span className="step-label">01 — IMÓVEL E COMPRADORES</span><h2>Dados que constam da compra</h2></div><span className="step-number">1</span></div>
          <div className="sim-form-grid">
            <Field label="Preço total no contrato"><NumberInput value={form.contractPrice} min={0} step={1000} suffix="€" onChange={(value) => update("contractPrice", value)} /></Field>
            <Field label="Valor Patrimonial Tributário (VPT)" hint="Encontra o VPT na caderneta predial do imóvel. A base de IMT e do Imposto do Selo é o maior entre o preço do contrato e o VPT."><NumberInput value={form.vpt} min={0} step={1000} suffix="€" onChange={(value) => update("vpt", value)} /></Field>
            <Field label="Região do imóvel"><div className="sim-select-wrap"><select value={form.region ?? ""} onChange={(event) => update("region", event.target.value ? event.target.value as Region : null)}><option value="">Escolhe uma região</option><option value="continente">Continente</option><option value="ilhas">Açores ou Madeira</option></select></div></Field>
            <Field label="O imóvel será HPP?" hint="HPP significa habitação própria e permanente. Responde Sim apenas se o imóvel for destinado a ser a tua residência permanente."><BooleanSelect value={form.isPermanentHome} onChange={(value) => update("isPermanentHome", value)} /></Field>
            <Field label="A escritura transfere o imóvel inteiro?" hint="Escolhe Não se estiveres a comprar apenas uma parte de um imóvel, sem os restantes proprietários venderem as suas quotas no mesmo ato."><BooleanSelect value={form.wholePropertyTransferredInAct} onChange={(value) => update("wholePropertyTransferredInAct", value)} /></Field>
          </div>

          <div className="sim-separator" />
          <div className="sim-card-title"><div><span className="step-label">DADOS INDIVIDUAIS</span><h2>Cada comprador</h2></div><button type="button" className="add-buyer-button" onClick={() => update("buyers", [...form.buyers, emptyBuyer()])}><Plus size={14} /> Adicionar comprador</button></div>
          <p className="form-explainer">Indica as percentagens que constarão da escritura. O total tem de ser 100%. A app não assume uma divisão igual.</p>
          <div className="buyer-list">
            {form.buyers.map((buyer, index) => (
              <section className="buyer-panel" key={index}>
                <div className="buyer-panel-title"><h3>Comprador {index + 1}</h3>{form.buyers.length > 1 && <button type="button" className="remove-buyer-button" onClick={() => update("buyers", form.buyers.filter((_, buyerIndex) => buyerIndex !== index))} aria-label={"Remover comprador " + (index + 1)}><Trash2 size={14} /> Remover</button>}</div>
                <div className="sim-form-grid">
                  <Field label="Idade na data da escritura"><NumberInput value={buyer.ageAtDeed} min={0} max={120} suffix="anos" onChange={(value) => updateBuyer(index, "ageAtDeed", value)} /></Field>
                  <Field label="Quota que vai adquirir"><NumberInput value={buyer.sharePercent} min={0} max={100} step={0.01} suffix="%" onChange={(value) => updateBuyer(index, "sharePercent", value)} /></Field>
                  <Field label="É residente fiscal em Portugal?"><BooleanSelect value={buyer.isTaxResident} onChange={(value) => updateBuyer(index, "isTaxResident", value)} /></Field>
                  <Field label="Já foi residente fiscal em Portugal?"><BooleanSelect value={buyer.wasTaxResident} onChange={(value) => updateBuyer(index, "wasTaxResident", value)} /></Field>
                  <Field label="Teve imóvel habitacional nos últimos 3 anos?"><BooleanSelect value={buyer.ownedHousingPropertyNowOrInLastThreeYears} onChange={(value) => updateBuyer(index, "ownedHousingPropertyNowOrInLastThreeYears", value)} /></Field>
                  <Field label="Será dependente para IRS no ano da compra?"><BooleanSelect value={buyer.isDependentForIRSInAcquisitionYear} onChange={(value) => updateBuyer(index, "isDependentForIRSInAcquisitionYear", value)} /></Field>
                </div>
              </section>
            ))}
          </div>

          <div className="sim-separator" />
          <div className="sim-card-title finance-title"><div><span className="step-label">02 — EMPRÉSTIMO E DINHEIRO DISPONÍVEL</span><h2>Valores da proposta do banco</h2></div><span className="step-number">2</span></div>
          <p className="form-explainer">Para calcular os custos de entrada, copia o montante e o prazo da proposta do banco. Para uma compra sem empréstimo, introduz 0 no montante.</p>
          <div className="sim-form-grid">
            <Field label="Montante do empréstimo"><NumberInput value={form.loanPrincipal} min={0} step={1000} suffix="€" onChange={(value) => update("loanPrincipal", value)} /></Field>
            <Field label="Prazo do empréstimo"><NumberInput value={form.loanTermMonths} min={1} max={600} suffix="meses" onChange={(value) => update("loanTermMonths", value)} /></Field>
            <Field label="Prestação mensal indicada pelo banco"><NumberInput value={form.bankMonthlyPayment} min={0} step={0.01} suffix="€/mês" onChange={(value) => update("bankMonthlyPayment", value)} /></Field>
            <Field label="Dinheiro disponível para a compra"><NumberInput value={form.availableCash} min={0} step={1000} suffix="€" onChange={(value) => update("availableCash", value)} /></Field>
          </div>
          <div className="guarantee-note"><Info size={15} /><span>A Garantia Pública pode influenciar o empréstimo aprovado, mas não altera os impostos. Introduz aqui os valores efetivamente indicados pelo banco; a Casa Clara não presume que a garantia foi aprovada.</span></div>
        </section>

        <aside className="sim-results">
          <div className="result-hero">
            <div className="eyebrow light-eyebrow">IMT + IMPOSTO DO SELO DA COMPRA</div>
            <h2>{money(result?.taxesWithYouth)}</h2>
            <p>{result ? "Total calculado com os benefícios jovens aplicáveis aos dados preenchidos." : "Preenche os dados do imóvel e de todos os compradores para ver o cálculo."}</p>
            <div className="result-saving"><span><Sparkles size={15} /> Diferença fiscal com IMT Jovem</span><strong>{money(result?.taxDifference)}</strong></div>
          </div>

          <div className="result-comparison">
            <div className="comparison-heading"><h3>Valores calculados</h3><span>regras de 2026</span></div>
            {!result && <div className="calculation-pending"><strong>{form.wholePropertyTransferredInAct === false ? "Esta situação não é calculada nesta versão." : "Faltam dados para calcular."}</strong><ul>{taxIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div>}
            {result && <>
              <div className="tax-lines">
                <div><span>Base tributável (maior entre preço e VPT)</span><strong>{money(result.taxableValue)}</strong></div>
                <div><span>IMT sem benefício jovem</span><strong>{money(result.imtWithoutYouth)}</strong></div>
                <div><span>IMT com benefício jovem</span><strong>{money(result.imtWithYouth)}</strong></div>
                <div><span>IS da compra sem benefício jovem</span><strong>{money(result.acquisitionStampWithoutYouth)}</strong></div>
                <div><span>IS da compra com benefício jovem</span><strong>{money(result.acquisitionStampWithYouth)}</strong></div>
                <div className="tax-savings-row"><span>Total de impostos poupados</span><strong>{money(result.taxDifference)}</strong></div>
              </div>
              <div className="buyer-tax-list"><strong>Resultado por comprador</strong>{result.buyers.map((buyer) => <div key={buyer.buyerNumber}><span>Comprador {buyer.buyerNumber} · {numberPt(buyer.sharePercent, 2)}%{buyer.youngEligible ? " · elegível nos dados indicados" : ""}</span><strong>IMT: {money(buyer.imtWithYouth)} · IS: {money(buyer.acquisitionStampWithYouth)}</strong></div>)}</div>
              {result.initialCashWithYouth !== null && <div className="exact-result-grid">
                <h3>Dinheiro necessário para a escritura</h3>
                <div><span>Sem benefício jovem</span><strong>{money(result.initialCashWithoutYouth)}</strong></div>
                <div><span>Com benefício jovem</span><strong>{money(result.initialCashWithYouth)}</strong></div>
                <div><span>IS sobre o empréstimo</span><strong>{money(result.loanStamp)}</strong></div>
                <div><span>Prestação indicada pelo banco</span><strong>{money(form.bankMonthlyPayment)}{form.bankMonthlyPayment !== null ? "/mês" : ""}</strong></div>
                {result.availableCashShortfall !== null && <div className="shortfall-row"><span>Valor que falta com benefício jovem</span><strong>{money(result.availableCashShortfall)}</strong></div>}
              </div>}
            </>}
            {!result && <div className="result-footnote"><Info size={14} /><span>Os resultados fiscais aparecem apenas depois de preencher os dados obrigatórios. O valor do empréstimo e o prazo são necessários para calcular o IS do crédito e o dinheiro para a escritura.</span></div>}
          </div>
          {result && financeIssue && <div className="finance-pending"><Info size={15} /><span>{financeIssue}</span></div>}
          {result && <div className="result-footnote"><Info size={14} /><span>O dinheiro para a escritura soma a parte do preço não coberta pelo empréstimo, IMT, IS da compra e IS do crédito. Não inclui escritura, registos, seguros nem comissões.</span></div>}
        </aside>
      </div>

      <section className="legal-reference">
        <h2>Como se chega a estes valores?</h2>
        <p>A base dos impostos é o maior entre o preço no contrato e o VPT. O cálculo cobre a compra da totalidade de um imóvel urbano habitacional, transferido numa só escritura, e usa as taxas oficiais de 2026 e a quota declarada de cada comprador. Compras de apenas uma quota, permutas e imóveis não habitacionais não são calculados nesta versão. O IMT Jovem exige idade até 35 anos na escritura, HPP, ausência de imóvel habitacional no período legal e não ser dependente para IRS no ano da compra. Em 2026, um adquirente não residente que nunca tenha sido residente em Portugal fica sujeito à taxa de 7,5% no ato; a lei prevê pedidos de anulação parcial posteriores em situações específicas, que não são antecipados neste cálculo. A prestação mensal é copiada da proposta do banco, não calculada pela Casa Clara.</p>
        <div><span>Fontes oficiais:</span><a href="https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/legislacao/instrucoes_administrativas/Documents/Oficio_circulado_40129_2026.pdf" target="_blank" rel="noreferrer">Tabelas de IMT 2026 <ArrowRight size={13} /></a><a href="https://info.portaldasfinancas.gov.pt/pt/apoio_ao_contribuinte/Cidadaos/Casa_e_propriedades/Compra_da_casa/Paginas/default.aspx" target="_blank" rel="noreferrer">Compra de casa — AT <ArrowRight size={13} /></a><a href="https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cimt/Pages/cimt17.aspx" target="_blank" rel="noreferrer">Artigo 17.º do CIMT <ArrowRight size={13} /></a></div>
      </section>
      <footer className="site-footer"><Link href="/" className="brand small-brand"><span className="brand-mark"><Building2 size={15} /></span><span>casa<span className="brand-light">clara</span></span></Link><span>O cálculo aplica regras publicadas; a aplicação não está ligada ao Portal das Finanças.</span><a href="https://info.portaldasfinancas.gov.pt/" target="_blank" rel="noreferrer">Portal das Finanças <ArrowRight size={13} /></a></footer>
    </main>
  );
}
