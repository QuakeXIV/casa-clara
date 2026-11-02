export const euro = (amount: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);

export const numberPt = (amount: number, digits = 0) =>
  new Intl.NumberFormat("pt-PT", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(amount);
