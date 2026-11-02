"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      setMessage("Casa Clara foi instalada neste computador.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const install = async () => {
    setMessage("");

    if (!installPrompt) {
      setMessage("No Chrome ou Edge, abre o menu ⋯ e escolhe “Instalar Casa Clara”. Se a opção não aparecer, confirma que estás a abrir a app em http://localhost:3000.");
      return;
    }

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);

      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setMessage("Casa Clara foi instalada neste computador.");
      } else {
        setMessage("A instalação foi cancelada. Podes voltar a tentar pelo menu do Chrome ou Edge.");
      }
    } catch {
      setInstallPrompt(null);
      setMessage("Não foi possível abrir a instalação. Tenta pelo menu do Chrome ou Edge.");
    }
  };

  return (
    <div className="install-action">
      <button
        type="button"
        className="install-app-button"
        onClick={() => void install()}
        aria-label={isInstalled ? "Casa Clara instalada" : "Instalar Casa Clara no computador"}
        aria-describedby={message ? "install-app-message" : undefined}
      >
        <Download size={15} aria-hidden="true" />
        <span className="install-app-label">{isInstalled ? "Instalada" : "Instalar no computador"}</span>
      </button>
      {message && (
        <div className="install-app-message" id="install-app-message" role="status">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage("")} aria-label="Fechar mensagem">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
