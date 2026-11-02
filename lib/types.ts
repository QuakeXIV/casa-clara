export type Portal =
  | "IDEALISTA"
  | "IMOVIRTUAL"
  | "CASASAPO"
  | "REMAX"
  | "ERA"
  | "SUPERCASA"
  | "OUTRO";

export type Listing = {
  id: string;
  externalId: string;
  sourceUrl: string;
  portal: Portal;
  title: string;
  description: string;
  price: number;
  typology: string;
  usefulArea: number;
  grossArea?: number;
  bathrooms?: number;
  condition: "NOVO" | "USADO" | "RECUPERADO" | "PARA_RECOMPOR";
  distrito: string;
  concelho: string;
  freguesia: string;
  address?: string;
  images: string[];
  isPromoted: boolean;
  scrapedAt: string;
  dealScore?: number;
  priceDeviationPercent?: number;
  estimatedRentalYield?: number;
};

export const PORTAL_NAMES: Record<Portal, string> = {
  IDEALISTA: "idealista",
  IMOVIRTUAL: "Imovirtual",
  CASASAPO: "Casa SAPO",
  REMAX: "RE/MAX",
  ERA: "ERA",
  SUPERCASA: "SUPERCASA",
  OUTRO: "Outro",
};
