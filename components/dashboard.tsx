"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownUp, ArrowRight, Bell, Bookmark, Building2, Check, ChevronDown, ChevronRight, ExternalLink, Heart, MapPin, RefreshCw, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { PriceChart } from "@/components/price-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InstallAppButton } from "@/components/install-app-button";
import { euro, numberPt } from "@/lib/format";
import { PORTAL_NAMES, type Listing, type Portal } from "@/lib/types";

const portals: Portal[] = ["IDEALISTA", "IMOVIRTUAL", "CASASAPO", "REMAX", "ERA", "SUPERCASA"];
const typologies = ["T0", "T1", "T2", "T3", "T4+"];

function scoreInfo(score?: number, deviation?: number) {
  if (score === undefined) return { label: "Sem avaliação", className: "score-muted" };
  if (deviation !== undefined && deviation <= -8) return { label: "Boa oportunidade", className: "score-good" };
  if (deviation !== undefined && deviation >= 5) return { label: "Acima da zona", className: "score-high" };
  if (score >= 82) return { label: "Boa oportunidade", className: "score-good" };
  if (score >= 65) return { label: "Preço equilibrado", className: "score-fair" };
  return { label: "Preço equilibrado", className: "score-fair" };
}

function PropertyCard({ listing, onSave, saved, onRefresh }: { listing: Listing; onSave: () => void; saved: boolean; onRefresh: () => void }) {
  const score = scoreInfo(listing.dealScore, listing.priceDeviationPercent);
  return (
    <article className="property-card">
      <div className="property-photo" role="img" aria-label={`Fotografia do imóvel: ${listing.title}`} style={{ backgroundImage: listing.images[0] ? `linear-gradient(180deg, transparent 56%, #1a241f55), url("${listing.images[0]}")` : "linear-gradient(135deg,#d9e2db,#adbfb2)" }}>
        <span className="portal-pill">{PORTAL_NAMES[listing.portal]}</span>
        <button className={`save-button ${saved ? "is-saved" : ""}`} aria-label={saved ? "Remover dos guardados" : "Guardar imóvel"} onClick={onSave}><Heart size={17} fill={saved ? "currentColor" : "none"} /></button>
        {listing.isPromoted && <span className="promoted-pill"><Sparkles size={12} /> Destaque</span>}
      </div>
      <div className="property-info">
        <div className="property-topline"><span>{listing.distrito} <span className="dot-separator">·</span> {listing.concelho}</span><Badge variant="secondary" className={`deal-pill ${score.className}`}><span className="deal-dot" />{listing.dealScore ?? "—"} <small>/100</small></Badge></div>
        <h3>{listing.title}</h3>
        <div className="property-details"><span>{listing.typology}</span><i /> <span>{listing.usefulArea ? `${numberPt(listing.usefulArea)} m²` : "Área n/d"}</span><i /> <span>{listing.bathrooms ?? "—"} wc</span></div>
        <div className="property-bottom"><div><strong>{euro(listing.price)}</strong><span className="unit-price">{listing.usefulArea ? `${euro(listing.price / listing.usefulArea)}/m²` : "€/m² n/d"}</span></div><div className="card-actions"><button className="source-link" onClick={onRefresh} aria-label={`Recolher ${PORTAL_NAMES[listing.portal]} via MCP`} title="Atualizar via MCP"><RefreshCw size={15} /></button><a href={listing.sourceUrl} target="_blank" rel="noreferrer" className="source-link" aria-label={`Abrir anúncio de ${PORTAL_NAMES[listing.portal]}`}><ExternalLink size={16} /></a></div></div>
        {listing.priceDeviationPercent !== undefined && <div className="market-comparison"><span className={listing.priceDeviationPercent < 0 ? "below-market" : "above-market"}>{listing.priceDeviationPercent > 0 ? "+" : ""}{numberPt(listing.priceDeviationPercent, 1)}%</span><span>vs. média da zona</span></div>}
      </div>
    </article>
  );
}

export function Dashboard({ initialListings }: { initialListings: Listing[] }) {
  const [listings, setListings] = useState(initialListings);
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("");
  const [concelho, setConcelho] = useState("");
  const [freguesia, setFreguesia] = useState("");
  const [chosenPortals, setChosenPortals] = useState<Portal[]>(portals);
  const [chosenTypes, setChosenTypes] = useState<string[]>([]);
  const [condition, setCondition] = useState("Todos os estados");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(700000);
  const [minArea, setMinArea] = useState(0);
  const [maxM2, setMaxM2] = useState(8000);
  const [sort, setSort] = useState("score");
  const [saved, setSaved] = useState<string[]>([]);
  const [scrapeMessage, setScrapeMessage] = useState("");
  const [locationOpen, setLocationOpen] = useState(false);

  const districtOptions = useMemo(() => [...new Set(listings.map((item) => item.distrito).filter(Boolean))].sort(), [listings]);
  const concelhoOptions = useMemo(() => [...new Set(listings.filter((item) => !district || item.distrito.toLocaleLowerCase("pt-PT") === district.toLocaleLowerCase("pt-PT")).map((item) => item.concelho).filter(Boolean))].sort(), [listings, district]);
  const freguesiaOptions = useMemo(() => [...new Set(listings.filter((item) => (!district || item.distrito.toLocaleLowerCase("pt-PT") === district.toLocaleLowerCase("pt-PT")) && (!concelho || item.concelho.toLocaleLowerCase("pt-PT") === concelho.toLocaleLowerCase("pt-PT"))).map((item) => item.freguesia).filter(Boolean))].sort(), [listings, district, concelho]);
  const locationLabel = freguesia || concelho || district || "Todas as localizações";

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-PT");
    const found = listings.filter((item) => {
      const text = `${item.title} ${item.distrito} ${item.concelho} ${item.freguesia}`.toLocaleLowerCase("pt-PT");
      return (!normalized || text.includes(normalized))
        && (!district || item.distrito.toLocaleLowerCase("pt-PT") === district.toLocaleLowerCase("pt-PT"))
        && (!concelho || item.concelho.toLocaleLowerCase("pt-PT") === concelho.toLocaleLowerCase("pt-PT"))
        && (!freguesia || item.freguesia.toLocaleLowerCase("pt-PT") === freguesia.toLocaleLowerCase("pt-PT"))
        && chosenPortals.includes(item.portal)
        && (!chosenTypes.length || chosenTypes.includes(item.typology) || (chosenTypes.includes("T4+") && /^T[4-9]/.test(item.typology)))
        && item.price >= minPrice && item.price <= maxPrice && item.usefulArea >= minArea
        && (maxM2 === 8000 || (item.usefulArea > 0 && item.price / item.usefulArea <= maxM2))
        && (condition === "Todos os estados" || item.condition === condition);
    });
    return found.sort((a, b) => sort === "price" ? a.price - b.price : sort === "area" ? b.usefulArea - a.usefulArea : (b.dealScore ?? 0) - (a.dealScore ?? 0));
  }, [listings, query, district, concelho, freguesia, chosenPortals, chosenTypes, minPrice, maxPrice, minArea, maxM2, condition, sort]);

  const togglePortal = (portal: Portal) => setChosenPortals((current) => current.includes(portal) ? current.filter((item) => item !== portal) : [...current, portal]);
  const toggleType = (type: string) => setChosenTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]);
  const refreshPortal = async (portal: Portal) => {
    setScrapeMessage(`A preparar atualização de ${PORTAL_NAMES[portal]}…`);
    try {
      const response = await fetch("/api/scrape", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ portal, distrito: district || undefined, concelho: concelho || district || "Porto", freguesia: freguesia || undefined, maxPages: 1 }) });
      const payload = await response.json();
      setScrapeMessage(payload.message ?? payload.error ?? "Pedido concluído.");
      if (response.ok && payload.saved > 0) window.setTimeout(() => window.location.reload(), 900);
    } catch {
      setScrapeMessage("Não foi possível contactar o serviço local de recolha.");
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <Link href="/" className="brand"><span className="brand-mark"><Building2 size={18} strokeWidth={2.3} /></span><span>casa<span className="brand-light">clara</span></span></Link>
        <nav className="main-nav"><a className="nav-active" href="#explorar">Explorar casas</a><Link href="/simulador">Simulador jovem <span className="nav-new">2026</span></Link><a href="#mercado">Mercado</a></nav>
        <div className="top-actions"><InstallAppButton /><button className="icon-button" aria-label="Notificações"><Bell size={18} /><span className="notification-dot" /></button><button className="avatar-button" aria-label="Conta">PV</button></div>
      </header>

      <section className="welcome-band" id="explorar">
        <div><div className="eyebrow light-eyebrow">A tua próxima casa começa aqui</div><h1>Encontra espaço para<br className="desktop-break" /> o que vem a seguir.</h1><p>Compara anúncios, percebe o mercado e decide com mais confiança.</p></div>
        <div className="welcome-stat"><span>Anúncios guardados nesta app</span><strong>{numberPt(listings.length)} <small>imóveis</small></strong><small>{listings.length ? "Dados guardados localmente." : "Ainda não há anúncios guardados."}</small></div>
      </section>

      <div className="page-content">
        <div className="search-bar">
          <div className="search-location"><MapPin size={18} /><div className="location-picker"><button onClick={() => setLocationOpen(!locationOpen)}>{locationLabel}<ChevronDown size={15} /></button>{locationOpen && <div className="location-menu location-hierarchy"><label>Distrito<input list="district-options" value={district} placeholder="Todos" onChange={(event) => { setDistrict(event.target.value); setConcelho(""); setFreguesia(""); }} /><datalist id="district-options">{districtOptions.map((item) => <option key={item} value={item} />)}</datalist></label><label>Concelho<input list="concelho-options" value={concelho} placeholder="Todos" onChange={(event) => { setConcelho(event.target.value); setFreguesia(""); }} /><datalist id="concelho-options">{concelhoOptions.map((item) => <option key={item} value={item} />)}</datalist></label><label>Freguesia<input list="freguesia-options" value={freguesia} placeholder="Todas" onChange={(event) => setFreguesia(event.target.value)} /><datalist id="freguesia-options">{freguesiaOptions.map((item) => <option key={item} value={item} />)}</datalist></label><div className="location-actions"><button onClick={() => { setDistrict(""); setConcelho(""); setFreguesia(""); }}>Limpar</button><button onClick={() => setLocationOpen(false)}>Aplicar</button></div></div>}</div></div>
          <span className="search-divider" /><Search size={18} className="search-icon" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisa por zona, freguesia ou palavra-chave" aria-label="Pesquisar imóveis" /><Button className="search-submit" size="lg" aria-label="Pesquisar"><Search size={17} /><span>Pesquisar</span></Button>
        </div>

        <div className="dashboard-layout">
          <aside className="filters-panel">
            <div className="filter-heading"><div><SlidersHorizontal size={17} /><h2>Filtros</h2></div><button onClick={() => { setChosenPortals(portals); setChosenTypes([]); setCondition("Todos os estados"); setMinPrice(0); setMaxPrice(700000); setMinArea(0); setMaxM2(8000); setQuery(""); setDistrict(""); setConcelho(""); setFreguesia(""); }}>Limpar</button></div>
            <div className="filter-group"><h3>Faixa de preço <strong>até {euro(maxPrice)}</strong></h3><input type="range" min="0" max="900000" step="10000" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} className="range-control" /><div className="range-labels"><span>0 €</span><span>900 mil €</span></div><div className="price-bounds"><label>De <input type="number" min="0" value={minPrice || ""} placeholder="0 €" onChange={(event) => setMinPrice(Number(event.target.value) || 0)} /></label><label>Até <input type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value) || 0)} /></label></div></div>
            <div className="filter-group"><h3>Tipologia</h3><div className="type-options">{typologies.map((type) => <button key={type} className={chosenTypes.includes(type) ? "type-selected" : ""} onClick={() => toggleType(type)}>{type}</button>)}</div></div>
            <div className="filter-group two-inputs"><label><span>Área útil mínima</span><div><input type="number" min="0" value={minArea || ""} placeholder="—" onChange={(event) => setMinArea(Number(event.target.value) || 0)} /><small>m²</small></div></label><label><span>Máx. preço / m²</span><div><input type="number" min="0" value={maxM2 === 8000 ? "" : maxM2} placeholder="—" onChange={(event) => setMaxM2(Number(event.target.value) || 8000)} /><small>€</small></div></label></div>
            <div className="filter-group"><h3>Estado do imóvel</h3><div className="select-wrap"><select value={condition} onChange={(event) => setCondition(event.target.value)}><option>Todos os estados</option><option value="NOVO">Novo</option><option value="USADO">Usado</option><option value="RECUPERADO">Recuperado</option><option value="PARA_RECOMPOR">Para recuperar</option></select><ChevronDown size={15} /></div></div>
            <div className="filter-group portal-group"><h3>Portais <span>Seleciona fontes</span></h3>{portals.map((portal) => <label className="check-row" key={portal}><input type="checkbox" checked={chosenPortals.includes(portal)} onChange={() => togglePortal(portal)} /><span className="custom-check"><Check size={12} /></span><span>{PORTAL_NAMES[portal]}</span><span className="portal-count">{listings.filter((item) => item.portal === portal).length}</span></label>)}</div>
            <div className="filter-footnote"><Bookmark size={14} /><span>Os filtros ficam ativos enquanto exploras.</span></div>
          </aside>

          <section className="results-column">
            <div className="results-top"><div><div className="eyebrow">A seleção Casa Clara</div><h2>Casas que merecem uma visita<span>.</span></h2><p>{filtered.length} imóveis encontrados <span>·</span> ordenados pela melhor relação preço/zona</p></div><label className="sort-select"><ArrowDownUp size={15} /><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="score">Melhor oportunidade</option><option value="price">Preço mais baixo</option><option value="area">Maior área</option></select><ChevronDown size={13} /></label></div>
            {scrapeMessage && <div className="scrape-status"><RefreshCw size={15} />{scrapeMessage}<button onClick={() => setScrapeMessage("")}>Fechar</button></div>}
            <div className="listings-grid">{filtered.map((listing) => <PropertyCard key={listing.id} listing={listing} saved={saved.includes(listing.id)} onSave={() => setSaved((current) => current.includes(listing.id) ? current.filter((id) => id !== listing.id) : [...current, listing.id])} onRefresh={() => refreshPortal(listing.portal)} />)}</div>
            {filtered.length === 0 && <div className="empty-state"><Search size={24} /><h3>{listings.length === 0 ? "Ainda não há anúncios guardados." : "Não encontrámos imóveis com estes filtros."}</h3><p>{listings.length === 0 ? "A lista só será preenchida quando houver anúncios recolhidos de fontes autorizadas." : "Experimenta aumentar o limite de preço ou escolher outra zona."}</p></div>}
            <section className="market-section" id="mercado"><div className="market-copy"><span className="eyebrow">Decide com contexto</span><h2>O preço certo<br />tem uma zona.</h2><p>{listings.length ? "Compara os anúncios guardados com os valores por metro quadrado observados por concelho." : "Ainda não há anúncios guardados para calcular médias por concelho."}</p>{listings.length > 0 && <a href="#explorar">Explorar análise de mercado <ArrowRight size={15} /></a>}</div><div className="market-chart-card"><PriceChart listings={listings} /></div></section>
            <div className="simulator-callout"><div className="callout-icon"><Sparkles size={19} /></div><div><span className="eyebrow">Primeira casa?</span><h3>Percebe quanto precisas para comprar.</h3><p>Compara impostos, entrada e prestação com as regras jovens de 2026.</p></div><Button asChild variant="link" size="sm"><Link href="/simulador">Abrir simulador <ArrowRight size={15} /></Link></Button></div>
          </section>
        </div>
      </div>
      <footer className="site-footer"><Link href="/" className="brand small-brand"><span className="brand-mark"><Building2 size={15} /></span><span>casa<span className="brand-light">clara</span></span></Link><span>Anúncios guardados localmente. Valores fiscais estimativos, a confirmar junto da AT.</span><Link href="/documentacao">Documentação <ChevronRight size={13} /></Link></footer>
    </main>
  );
}
