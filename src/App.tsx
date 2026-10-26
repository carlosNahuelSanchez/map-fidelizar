import { useCallback, useEffect, useRef, useState } from "react";
import { MapView } from "./MapView";
import { loadProvinceBoundaries, type ProvinceCollection } from "./map-data";
import { formatDistance, maneuverText, mapsNavigationUrl, type Destination, type MapCommand, type MapIntent } from "./navigation";
import { useLocation } from "./useLocation";
import { useRouting } from "./useRouting";
import { useInstall } from "./useInstall";

type LoadState = { kind: "loading" } | { kind: "ready"; data: ProvinceCollection } | { kind: "error" };
type IconName = "menu" | "close" | "location" | "pin" | "route" | "install" | "country" | "plus" | "minus";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    location: <><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4" /></>,
    pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    route: <><circle cx="5" cy="18" r="2" /><path d="M7 18h8a4 4 0 0 0 0-8H9a4 4 0 0 1 0-8h10m-3 0 3 3 3-3" /></>,
    install: <><path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5" /></>,
    country: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a18 18 0 0 1 0 18 18 0 0 1 0-18Z" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function App() {
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobile, setMobile] = useState(window.matchMedia("(max-width: 1023px)").matches);
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

  const loadMap = useCallback(async () => {
    setLoad({ kind: "loading" });
    try { setLoad({ kind: "ready", data: await loadProvinceBoundaries() }); }
    catch { setLoad({ kind: "error" }); }
  }, []);
  useEffect(() => { void loadMap(); }, [loadMap]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => { setMobile(media.matches); if (!media.matches) setMenuOpen(false); };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  useEffect(() => {
    if (!menuOpen || !mobile) return;
    const previouslyFocused = document.activeElement;
    const panel = drawer.current;
    const controls = () => Array.from(panel?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href]') ?? []).filter(item => item.offsetParent !== null);
    controls()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMenuOpen(false); return; }
      if (event.key !== "Tab") return;
      const elements = controls();
      if (event.shiftKey && document.activeElement === elements[0]) { event.preventDefault(); elements.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === elements.at(-1)) { event.preventDefault(); elements[0]?.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus(); };
  }, [menuOpen, mobile]);

  const runCommand = useCallback((intent: MapIntent) => {
    setFollowUser(false);
    setCommand({ ...intent, serial: ++serial.current });
  }, []);
  const chooseDestination = useCallback((value: Destination) => {
    setDestination(value);
    setMarkMode(false);
    setFollowUser(false);
    setMenuOpen(true);
  }, []);
  const startGuide = () => {
    if (!destination) return;
    if (!location.position) location.enable();
    navigation.setActive(true);
    setFollowUser(true);
    setMenuOpen(false);
  };
  const stopGuide = () => { navigation.setActive(false); setFollowUser(false); };
  const progress = navigation.progress;
  const instruction = navigation.arrived ? "Llegaste al destino" : progress?.nextStep ? maneuverText(progress.nextStep) : "Seguí la ruta marcada";

  return <main className="app-shell bg-[#f4f6f3] text-[#25342f]">
    <header className="app-header">
      <button type="button" className="icon-button hamburger" onClick={() => setMenuOpen(true)} aria-label="Abrir opciones del mapa" aria-controls="map-menu" aria-expanded={menuOpen}><Icon name="menu" /></button>
      <span className="brand-mark" aria-hidden="true"><span /></span>
      <div className="header-title"><h1>Mapa</h1><span>Argentina</span></div>
      <span className="header-hint">OpenStreetMap</span>
    </header>

    {menuOpen && <button className="drawer-backdrop" type="button" aria-label="Cerrar opciones" onClick={() => setMenuOpen(false)} />}
    <aside id="map-menu" ref={drawer} className={`explore-panel${menuOpen ? " is-open" : ""}`} role={mobile && menuOpen ? "dialog" : undefined} aria-modal={mobile && menuOpen ? true : undefined} aria-label="Opciones del mapa">
      <div className="drawer-heading"><h2>Mapa</h2><button type="button" className="icon-button drawer-close" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú"><Icon name="close" /></button></div>

      {destination && <section className="destination-section" aria-label="Destino y guía">
        <div className="section-heading"><h2>Destino</h2><button type="button" className="text-button" onClick={() => { setDestination(null); stopGuide(); }}>Quitar</button></div>
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

      <section className="panel-section tools-section" aria-label="Controles del mapa">
        <h2>Controles</h2>
        <button type="button" className={`tool-button${location.position ? " active-tool" : ""}`} onClick={() => {
          if (location.enabled) { location.disable(); stopGuide(); }
          else { location.enable(); setFollowUser(true); }
        }}><Icon name="location" />{location.enabled ? "Desactivar ubicación" : "Mi ubicación"}</button>
        {location.position && <><button type="button" className="tool-button" aria-pressed={followUser} onClick={() => { setFollowUser(value => !value); setMenuOpen(false); }}><Icon name="location" />{followUser ? "Pausar seguimiento" : "Seguir ubicación"}</button><p className="helper-text">Precisión ±{Math.round(location.position.accuracy)} m.</p></>}
        {location.status.kind === "loading" && <p className="helper-text" role="status">Buscando ubicación precisa…</p>}
        {(location.status.kind === "error" || location.status.kind === "imprecise") && <><p className="inline-error" role="status">{location.status.message}</p><button type="button" className="tool-button" onClick={() => { location.enable(); setFollowUser(true); }}>Reintentar ubicación</button></>}
        <button type="button" className="tool-button" aria-pressed={markMode} onClick={() => { setMarkMode(value => !value); stopGuide(); setMenuOpen(false); }}><Icon name="pin" />{markMode ? "Cancelar destino" : "Marcar destino en el mapa"}</button>
        <button type="button" className="tool-button" onClick={() => runCommand({ kind: "country" })}><Icon name="country" />Ver Argentina</button>
        <div className="mobile-zoom"><button type="button" className="tool-button" onClick={() => runCommand({ kind: "zoom", amount: 1 })}><Icon name="plus" />Acercar</button><button type="button" className="tool-button" onClick={() => runCommand({ kind: "zoom", amount: -1 })}><Icon name="minus" />Alejar</button></div>
        <button type="button" className="tool-button" disabled={pwa.installed} onClick={() => void pwa.install()}><Icon name="install" />{pwa.installed ? "App instalada" : "Instalar app"}</button>
        {pwa.help && <p className="install-help" role="status">{pwa.help}</p>}
      </section>
    </aside>

    <section className="map-workspace" aria-label="Mapa de Argentina">
      {load.kind === "ready" && <MapView data={load.data} command={command} userPosition={location.position} followUser={followUser && location.status.kind === "ready"} destination={destination} route={navigation.route} markMode={markMode} onChooseDestination={chooseDestination} onFollowChange={setFollowUser} />}
      {load.kind === "loading" && <div className="map-state" role="status"><span className="map-loader" /><p>Cargando mapa</p></div>}
      {load.kind === "error" && <div className="map-state"><h2>No se pudo cargar el mapa</h2><p>Revisá la conexión e intentá de nuevo.</p><button type="button" className="primary-button" onClick={() => void loadMap()}>Reintentar</button></div>}
      {markMode && <div className="map-notice"><Icon name="pin" /><span>Tocá el mapa para marcar el destino.</span><button type="button" className="text-button" onClick={() => setMarkMode(false)}>Cancelar</button></div>}
      {!online && <div className="offline-notice" role="status">Sin conexión. Los límites están disponibles; las calles y rutas necesitan internet.</div>}
      {navigation.active && destination && <div className="guidance-panel" aria-live="polite">
        <div className="guidance-heading"><Icon name="route" /><div><strong>{location.status.kind === "loading" ? "Esperando tu ubicación…" : location.status.kind === "error" ? "Ubicación no disponible" : navigation.status.kind === "error" ? "Ruta no disponible" : navigation.status.kind === "loading" ? "Calculando el recorrido…" : instruction}</strong>{progress && !navigation.arrived && <span>{formatDistance(progress.toManeuver)} hasta la próxima indicación</span>}</div></div>
        <div className="guidance-footer"><span>{destination.label}</span>{progress && <strong>{Math.max(1, Math.ceil(progress.seconds / 60))} min · {formatDistance(progress.remaining)}</strong>}</div>
        {navigation.status.kind === "error" && <p>{navigation.status.message}</p>}
        {navigation.arrived && <button type="button" className="text-button" onClick={stopGuide}>Finalizar guía</button>}
      </div>}
      {(location.status.kind === "error" || location.status.kind === "imprecise") && !menuOpen && <button type="button" className="location-error-banner" onClick={() => setMenuOpen(true)}>Ubicación sin confirmar. Abrí el menú para ver el estado.</button>}
      <div className="map-boundary-credit">Límites: IGN</div>
    </section>
  </main>;
}
