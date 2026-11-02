import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Casa Clara — Imobiliário",
    short_name: "Casa Clara",
    description: "Pesquisa de casas e simulador de compra para Portugal.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8f8f4",
    theme_color: "#315f4c",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  };
}
