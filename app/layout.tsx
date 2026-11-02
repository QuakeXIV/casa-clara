import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Casa Clara — encontrar casa com confiança",
  description: "Pesquisa imobiliária e simulador de compra para Portugal.",
  applicationName: "Casa Clara",
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
};

export const viewport: Viewport = { themeColor: "#315f4c" };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="pt-PT"><body>{children}</body></html>;
}
