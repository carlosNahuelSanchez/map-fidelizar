import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapView, HIGHLIGHT_COLORS } from "./MapView";
import { loadLocations, type Local } from "./locations";
import { loadProvinceBoundaries, type ProvinceCollection } from "./map-data";
import { distanceBetween, formatDistance, maneuverText, mapsNavigationUrl, type Destination, type MapCommand, type MapIntent, type UserPosition } from "./navigation";
import { useLocation } from "./useLocation";
import { useRouting } from "./useRouting";
import { useInstall } from "./useInstall";
import { gmailUrl, whatsappUrl } from "./contact-links";

const PROVINCES = ["Formosa", "Córdoba", "Buenos Aires"];
type LoadState = { kind: "loading" } | { kind: "ready"; data: ProvinceCollection; locals: Local[] } | { kind: "error" };
type IconName = "menu" | "close" | "location" | "pin" | "route" | "install" | "country" | "plus" | "minus" | "search" | "arrow";
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>, close: <path d="m6 6 12 12M18 6 6 18" />,
    location: <><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4" /></>,
    pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    route: <><circle cx="5" cy="18" r="2" /><path d="M7 18h8a4 4 0 0 0 0-8H9a4 4 0 0 1 0-8h10m-3 0 3 3 3-3" /></>,
    install: <><path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5" /></>,
    country: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18Z" /></>,
    plus: <path d="M12 5v14M5 12h14" />, minus: <path d="M5 12h14" />,
    search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></>,
    arrow: <path d="m9 5 7 7-7 7" />,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function LocalLogo({ local }: { local: Local }) {
  const [failed, setFailed] = useState(false);
  return <span className="list-logo">{local.logo && !failed ? <img src={local.logo} alt="" loading="lazy" onError={() => setFailed(true)} /> : local.name.split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase()}</span>;
}
const searchable = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es");
function isInsideRadius(local: Local, position: UserPosition, radiusKm: number) {
  if (local.latitude === null || local.longitude === null) return false;
  return distanceBetween(position, { lat: local.latitude, lng: local.longitude }) <= radiusKm * 1000;
}

export default function App() {
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [menuOpen, setMenuOpen] = useState(false);
  const [province, setProvince] = useState<string | null>(null);
  const [locality, setLocality] = useState("");
  const [mobile, setMobile] = useState(window.matchMedia("(max-width: 1023px)").matches);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [radiusKm, setRadiusKm] = useState(5);
  const [limit, setLimit] = useState(30);
  const [command, setCommand] = useState<MapCommand | null>(null);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [markMode, setMarkMode] = useState(false);
  const [followUser, setFollowUser] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const serial = useRef(0);
  const drawer = useRef<HTMLElement>(null);
  const location = useLocation();
  const navigation = useRouting(destination, location.position);
  const pwa = useInstall();
  const loadData = useCallback(async () => {
    setLoad({ kind: "loading" });
    try {
      const [data, locals] = await Promise.all([loadProvinceBoundaries(), loadLocations()]);
      setLoad({ kind: "ready", data, locals });
    } catch { setLoad({ kind: "error" }); }
  }, []);
  useEffect(() => { void loadData(); }, [loadData]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => { setMobile(media.matches); if (!media.matches) setMenuOpen(false); };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  useEffect(() => { setLimit(30); }, [province, search, category, locality]);
  useEffect(() => {
    if (!menuOpen || !mobile) return;
    const previouslyFocused = document.activeElement;
    const panel = drawer.current;
    const controls = () => Array.from(panel?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input,select') ?? []).filter(element => element.offsetParent !== null);
    controls()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMenuOpen(false); return; }
      if (event.key !== "Tab") return;
      const elements = controls(); const first = elements[0]; const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus(); };
  }, [menuOpen, mobile]);
  const runCommand = useCallback((intent: MapIntent) => {
    setFollowUser(false); setCommand({ ...intent, serial: ++serial.current });
  }, []);
  const chooseDestination = useCallback((value: Destination) => {
    setDestination(value); setMarkMode(false); setFollowUser(false); setMenuOpen(true);
    window.requestAnimationFrame(() => drawer.current?.scrollTo({ top: 0 }));
  }, []);
  const locals = load.kind === "ready" ? load.locals : [];
  const results = useMemo(() => {
    if (load.kind !== "ready") return [];
    const query = searchable(search.trim());
    return load.locals.filter(local => (!province || local.province === province) && (!locality || local.jurisdiction === locality) && (category === "all" || (category === "HAIR" ? local.niche === "BAR" || local.niche === "PEL" : local.niche === category)) && (!query || searchable(`${local.name} ${local.province} ${local.jurisdiction} ${local.address ?? ""}`).includes(query)) && (!nearbyOnly || !location.position || isInsideRadius(local, location.position, radiusKm)));
  }, [load, search, province, category, locality, nearbyOnly, radiusKm, location.position]);
  const geolocated = results.filter(local => local.latitude !== null && local.longitude !== null).length;
  const startGuide = () => {
    if (!destination) return;
    if (!location.position) location.enable();
    navigation.setActive(true); setFollowUser(true); setMenuOpen(false);
  };
  const stopGuide = () => { navigation.setActive(false); setFollowUser(false); };
  const selectProvince = (value: string | null) => {
    setProvince(value); setLocality(""); setSearch(""); setMenuOpen(false);
    runCommand(value ? { kind: "province", province: value } : { kind: "country" });
  };
  const progress = navigation.progress;
  const instruction = navigation.arrived ? "Llegaste al destino" : progress?.nextStep ? maneuverText(progress.nextStep) : "Seguí la ruta marcada";

  return <main className="app-shell bg-[#f4f6f3] text-[#25342f]">
    <header className="app-header">
      <button type="button" className="icon-button hamburger" onClick={() => setMenuOpen(true)} aria-label="Abrir opciones del mapa" aria-controls="map-menu" aria-expanded={menuOpen}><Icon name="menu" /></button>
      <span className="brand-mark" aria-hidden="true"><span /></span>
      <div className="header-title"><h1>Relevamiento</h1><span>{province ?? "Argentina"} · {geolocated} locales</span></div>
      <span className="header-hint">Comercios de cercanía</span>
    </header>

    {menuOpen && <button className="drawer-backdrop" type="button" aria-label="Cerrar opciones" onClick={() => setMenuOpen(false)} />}
    <aside id="map-menu" ref={drawer} className={`explore-panel${menuOpen ? " is-open" : ""}`} role={mobile && menuOpen ? "dialog" : undefined} aria-modal={mobile && menuOpen ? true : undefined} aria-label="Opciones y búsqueda de locales">
      <div className="drawer-heading"><h2>Explorar el mapa</h2><button type="button" className="icon-button drawer-close" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú"><Icon name="close" /></button></div>

      {destination && <section className="destination-section" aria-label="Destino y guía">
        <div className="section-heading"><h2>Tu destino</h2><button type="button" className="text-button" onClick={() => { setDestination(null); stopGuide(); }}>Quitar</button></div>
        <p className="destination-name">{destination.label}</p>
        <p className="helper-text">{destination.point.lat.toFixed(5)}, {destination.point.lng.toFixed(5)}</p>
        {navigation.route && <div className="route-summary"><strong>{Math.max(1, Math.ceil(navigation.route.duration / 60))} min</strong><span>{formatDistance(navigation.route.distance)} · En auto</span></div>}
        {navigation.status.kind === "loading" && <p className="helper-text" role="status">Calculando ruta por calles…</p>}
        {navigation.status.kind === "error" && <div className="inline-error" role="alert"><p>{navigation.status.message}</p><button type="button" className="text-button" onClick={navigation.retry}>Reintentar ruta</button></div>}
        {!location.position && <p className="helper-text">Habilitá tu ubicación para calcular el recorrido.</p>}
        <button type="button" className="primary-button" onClick={navigation.active ? stopGuide : startGuide}><Icon name="route" />{navigation.active ? "Detener guía" : "Iniciar guía"}</button>
        {navigation.route && <button type="button" className="tool-button" onClick={() => { runCommand({ kind: "route" }); setMenuOpen(false); }}><Icon name="route" />Ver recorrido completo</button>}
        <a className="external-navigation" href={mapsNavigationUrl(destination)} target="_blank" rel="noreferrer">Abrir navegación en Google Maps</a>
        {navigation.route && <details className="route-directions"><summary>Indicaciones del recorrido</summary><ol>{navigation.route.legs.flatMap(leg => leg.steps).map((step, index) => <li key={`${index}-${step.name}`}><span>{maneuverText(step)}</span><small>{formatDistance(step.distance)}</small></li>)}</ol></details>}
      </section>}

      <section className="panel-section tools-section" aria-label="Herramientas del mapa">
        <h2>Herramientas</h2>
        <button type="button" className={`tool-button${location.position ? " active-tool" : ""}`} onClick={() => {
          if (location.enabled) { location.disable(); setNearbyOnly(false); stopGuide(); }
          else { location.enable(); setFollowUser(true); }
        }} ><Icon name="location" />{location.enabled ? "Desactivar ubicación" : "Habilitar mi ubicación"}</button>
        {location.enabled && <fieldset className="nearby-filter" aria-label="Filtro por distancia">
          <label className="nearby-toggle"><input type="checkbox" checked={nearbyOnly} disabled={!location.position} onChange={event => setNearbyOnly(event.target.checked)} />Mostrar solo locales cercanos</label>
          {nearbyOnly && <label className="locality-filter">Radio desde mi ubicación<select value={radiusKm} disabled={!location.position} onChange={event => setRadiusKm(Number(event.target.value))}><option value={1}>1 km</option><option value={5}>5 km</option><option value={10}>10 km</option><option value={25}>25 km</option></select></label>}
          {!location.position && <p className="helper-text">Esperando una ubicación precisa para activar este filtro.</p>}
          {nearbyOnly && location.position && <p className="helper-text">Distancia en línea recta; se recalcula al actualizar el GPS.</p>}
        </fieldset>}
        {location.position && <><button type="button" className="tool-button" aria-pressed={followUser} onClick={() => { setFollowUser(value => !value); setMenuOpen(false); }}><Icon name="location" />{followUser ? "Pausar seguimiento GPS" : "Seguir mi ubicación"}</button><p className="helper-text">Precisión ±{Math.round(location.position.accuracy)} m. Al mover el mapa se pausa el seguimiento.</p></>}
        {location.status.kind === "loading" && <p className="helper-text" role="status">Buscando una ubicación precisa…</p>}
        {(location.status.kind === "error" || location.status.kind === "imprecise") && <><p className="inline-error" role="status">{location.status.message}</p><button type="button" className="tool-button" onClick={() => { location.enable(); setFollowUser(true); }}>Volver a detectar mi ubicación</button></>}
        <button type="button" className="tool-button" aria-pressed={markMode} onClick={() => { setMarkMode(value => !value); stopGuide(); setMenuOpen(false); }}><Icon name="pin" />{markMode ? "Cancelar punto" : "Marcar un punto en el mapa"}</button>
        <button type="button" className="tool-button" onClick={() => selectProvince(null)}><Icon name="country" />Ver Argentina</button>
        <div className="mobile-zoom"><button type="button" className="tool-button" onClick={() => runCommand({ kind: "zoom", amount: 1 })}><Icon name="plus" />Acercar</button><button type="button" className="tool-button" onClick={() => runCommand({ kind: "zoom", amount: -1 })}><Icon name="minus" />Alejar</button></div>
        <button type="button" className="tool-button" disabled={pwa.installed} onClick={() => void pwa.install()}><Icon name="install" />{pwa.installed ? "App instalada" : "Instalar en el teléfono"}</button>
        {pwa.help && <p className="install-help" role="status">{pwa.help}</p>}
      </section>

      <section className="panel-section" aria-label="Filtros de locales">
        <h2>Buscar locales</h2>
        <label className="search-field"><Icon name="search" /><input type="search" aria-label="Buscar por nombre, dirección o localidad" placeholder="Nombre, dirección o localidad" value={search} onChange={event => setSearch(event.target.value)} /></label>
        <div className="category-filter" aria-label="Rubro">{[{ value: "all", label: "Todos" }, { value: "PAN", label: "Panaderías" }, { value: "HEL", label: "Heladerías" }, { value: "HAIR", label: "Barberías y peluquerías" }].map(item => <button key={item.value} type="button" aria-pressed={category === item.value} onClick={() => setCategory(item.value)}>{item.label}</button>)}</div>
        <div className="province-filter">{PROVINCES.map(name => <button type="button" key={name} aria-pressed={province === name} onClick={() => selectProvince(province === name ? null : name)}><span className="province-dot" style={{ backgroundColor: HIGHLIGHT_COLORS[name] }} /><span>{name}</span><small>{locals.filter(local => local.province === name && local.latitude !== null).length}</small></button>)}</div>
        {province === "Formosa" && <label className="locality-filter">Localidad<select value={locality} onChange={event => { setLocality(event.target.value); runCommand({ kind: "province", province: "Formosa" }); }}><option value="">Toda Formosa</option>{[...new Set(locals.filter(local => local.province === "Formosa").map(local => local.jurisdiction))].sort().map(city => <option key={city} value={city}>{city}</option>)}</select></label>}
        {province && <button type="button" className="text-button" onClick={() => { setProvince(null); setLocality(""); }}>Mostrar todas las provincias</button>}
      </section>

      <section className="panel-section results-section" aria-label="Resultados de locales">
        <div className="section-heading"><h2>{province ?? "Locales"}</h2><span className="result-count">{results.length}</span></div>
        {load.kind === "loading" && <p className="helper-text" role="status">Cargando locales…</p>}
        {load.kind === "ready" && !results.length && <p className="empty-results">No encontramos locales. Probá otra búsqueda o quitá los filtros.</p>}
        <ul className="local-list">{results.slice(0, limit).map(local => <li key={local.id}>{local.latitude !== null && local.longitude !== null ? <button type="button" className="local-list-button" onClick={() => { runCommand({ kind: "local", localId: local.id }); setMenuOpen(false); }}><LocalLogo local={local} /><span><strong>{local.name}</strong><small>{local.address ?? local.jurisdiction}</small><small className="local-type">{local.type} · {local.jurisdiction}</small></span><Icon name="arrow" /></button> : <article className="pending-local"><div className="pending-heading"><LocalLogo local={local} /><strong>{local.name}</strong></div><p>{local.address ?? local.jurisdiction}</p><small>Ubicación pendiente de verificar</small><div className="pending-links">{local.phone ? <a href={whatsappUrl(local.phone)} target="_blank" rel="noreferrer">WhatsApp · {local.phone}</a> : !local.email && !local.whatsapp && <span>Sin contacto directo</span>}{local.whatsapp && local.whatsapp !== local.phone && <a href={whatsappUrl(local.whatsapp)} target="_blank" rel="noreferrer">WhatsApp · {local.whatsapp}</a>}{local.email && <a href={gmailUrl(local.email)} target="_blank" rel="noreferrer">{local.email}</a>}{local.website && <a href={local.website} target="_blank" rel="noreferrer">Sitio web</a>}{local.instagram && <a href={local.instagram} target="_blank" rel="noreferrer">Instagram</a>}{local.sources[0] && <a href={local.sources[0]} target="_blank" rel="noreferrer">Fuente</a>}</div></article>}</li>)}</ul>
        {results.length > limit && <button type="button" className="load-more" onClick={() => setLimit(value => value + 30)}>Mostrar más locales ({results.length - limit})</button>}
      </section>
    </aside>

    <section className="map-workspace" aria-label="Mapa de locales">
      {load.kind === "ready" && <MapView data={load.data} locals={results} command={command} userPosition={location.position} followUser={followUser && location.status.kind === "ready"} destination={destination} route={navigation.route} markMode={markMode} onChooseDestination={chooseDestination} onFollowChange={setFollowUser} />}
      {load.kind === "loading" && <div className="map-state" role="status"><span className="map-loader" /><p>Cargando mapa y locales</p></div>}
      {load.kind === "error" && <div className="map-state"><h2>No se pudo cargar el mapa</h2><p>Revisá la conexión e intentá de nuevo.</p><button type="button" className="primary-button" onClick={() => void loadData()}>Reintentar</button></div>}
      {markMode && <div className="map-notice"><Icon name="pin" /><span>Tocá el mapa para marcar tu destino.</span><button type="button" className="text-button" onClick={() => setMarkMode(false)}>Cancelar</button></div>}
      {!online && <div className="offline-notice" role="status">Sin conexión. Los locales guardados siguen disponibles; las calles y rutas requieren internet.</div>}
      {navigation.active && destination && <div className="guidance-panel" aria-live="polite">
        <div className="guidance-heading"><Icon name="route" /><div><strong>{location.status.kind === "loading" ? "Esperando tu ubicación…" : location.status.kind === "error" ? "Ubicación no disponible" : navigation.status.kind === "error" ? "Ruta no disponible" : navigation.status.kind === "loading" ? "Calculando el recorrido…" : instruction}</strong>{progress && !navigation.arrived && <span>{formatDistance(progress.toManeuver)} hasta la próxima indicación</span>}</div></div>
        <div className="guidance-footer"><span>{destination.label}</span>{progress && <strong>{Math.max(1, Math.ceil(progress.seconds / 60))} min · {formatDistance(progress.remaining)}</strong>}</div>
        {navigation.status.kind === "error" && <p>{navigation.status.message}</p>}
        {navigation.arrived && <button type="button" className="text-button" onClick={stopGuide}>Finalizar guía</button>}
      </div>}
      {(location.status.kind === "error" || location.status.kind === "imprecise") && !menuOpen && <button type="button" className="location-error-banner" onClick={() => setMenuOpen(true)}>Ubicación sin confirmar. Abrí el menú para ver la precisión.</button>}
      <div className="map-boundary-credit">Límites: IGN{navigation.route ? " · Rutas: OSRM" : ""}</div>
    </section>
  </main>;
}
