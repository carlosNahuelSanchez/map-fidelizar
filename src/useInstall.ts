import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}
declare global { interface WindowEventMap { beforeinstallprompt: BeforeInstallPromptEvent; } }

export function useInstall() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(window.matchMedia("(display-mode: standalone)").matches);
  const [help, setHelp] = useState<string | null>(null);
  useEffect(() => {
    const capture = (event: BeforeInstallPromptEvent) => { event.preventDefault(); setPrompt(event); };
    const complete = () => { setInstalled(true); setPrompt(null); setHelp(null); };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", complete);
    return () => { window.removeEventListener("beforeinstallprompt", capture); window.removeEventListener("appinstalled", complete); };
  }, []);
  async function install() {
    if (prompt) {
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice.outcome === "accepted") setInstalled(true);
      } catch {
        setHelp("No pudimos abrir la instalación. Usá Instalar aplicación desde el menú del navegador.");
      } finally {
        setPrompt(null);
      }
      return;
    }
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setHelp(!window.isSecureContext
      ? "La instalación requiere abrir la app desde una dirección HTTPS."
      : ios ? "En Safari, tocá Compartir y luego Agregar a inicio para instalar la app."
      : "En el menú del navegador, elegí Instalar aplicación o Agregar a pantalla principal. Esta opción aparece al abrir la versión publicada con HTTPS.");
  }
  return { installed, install, help };
}
