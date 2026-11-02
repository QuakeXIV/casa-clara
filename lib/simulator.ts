export type Region = "continente" | "ilhas";

export type BuyerInput = {
  ageAtDeed: number | null;
  isTaxResident: boolean | null;
  wasTaxResident: boolean | null;
  ownedHousingPropertyNowOrInLastThreeYears: boolean | null;
  isDependentForIRSInAcquisitionYear: boolean | null;
  sharePercent: number | null;
};

export type PurchaseInput = {
  contractPrice: number | null;
  vpt: number | null;
  region: Region | null;
  isPermanentHome: boolean | null;
  wholePropertyTransferredInAct: boolean | null;
  buyers: BuyerInput[];
  availableCash: number | null;
  loanPrincipal: number | null;
  loanTermMonths: number | null;
  bankMonthlyPayment: number | null;
};

export type BuyerTaxResult = {
  buyerNumber: number;
  sharePercent: number;
  youngEligible: boolean;
  imtWithoutYouth: number;
  imtWithYouth: number;
  acquisitionStampWithoutYouth: number;
  acquisitionStampWithYouth: number;
};

export type PurchaseResult = {
  taxableValue: number;
  imtWithoutYouth: number;
  imtWithYouth: number;
  acquisitionStampWithoutYouth: number;
  acquisitionStampWithYouth: number;
  taxesWithoutYouth: number;
  taxesWithYouth: number;
  taxDifference: number;
  buyers: BuyerTaxResult[];
  loanStamp: number | null;
  initialCashWithoutYouth: number | null;
  initialCashWithYouth: number | null;
  availableCashShortfall: number | null;
};

type TaxBand = { limit: number; rate: number; deduction: number; flat?: boolean };

const YOUTH_LIMIT: Record<Region, number> = {
  continente: 330539,
  ilhas: 413174,
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

const bands = (region: Region, youth: boolean, hpp: boolean): TaxBand[] => {
  if (region === "ilhas") {
    const youthLimit = 413174;
    const nextYouthLimit = 826228;
    const top = 1438566;
    if (youth) return [
      { limit: youthLimit, rate: 0, deduction: 0 },
      { limit: nextYouthLimit, rate: 0.08, deduction: 33053.92 },
      { limit: top, rate: 0.06, deduction: 0, flat: true },
      { limit: Number.POSITIVE_INFINITY, rate: 0.075, deduction: 0, flat: true },
    ];
    if (!hpp) return [
      { limit: 132933, rate: 0.01, deduction: 0 },
      { limit: 181838, rate: 0.02, deduction: 1329.33 },
      { limit: 247934, rate: 0.05, deduction: 6784.47 },
      { limit: youthLimit, rate: 0.07, deduction: 11743.15 },
      { limit: 792414, rate: 0.08, deduction: 15874.89 },
      { limit: top, rate: 0.06, deduction: 0, flat: true },
      { limit: Number.POSITIVE_INFINITY, rate: 0.075, deduction: 0, flat: true },
    ];
    return [
      { limit: 132933, rate: 0, deduction: 0 },
      { limit: 181838, rate: 0.02, deduction: 2658.66 },
      { limit: 247934, rate: 0.05, deduction: 8113.8 },
      { limit: youthLimit, rate: 0.07, deduction: 13072.48 },
      { limit: nextYouthLimit, rate: 0.08, deduction: 17204.22 },
      { limit: top, rate: 0.06, deduction: 0, flat: true },
      { limit: Number.POSITIVE_INFINITY, rate: 0.075, deduction: 0, flat: true },
    ];
  }
  if (youth) return [
    { limit: 330539, rate: 0, deduction: 0 },
    { limit: 660982, rate: 0.08, deduction: 26443.12 },
    { limit: 1150853, rate: 0.06, deduction: 0, flat: true },
    { limit: Number.POSITIVE_INFINITY, rate: 0.075, deduction: 0, flat: true },
  ];
  if (!hpp) return [
    { limit: 106346, rate: 0.01, deduction: 0 },
    { limit: 145470, rate: 0.02, deduction: 1063.46 },
    { limit: 198347, rate: 0.05, deduction: 5427.56 },
    { limit: 330539, rate: 0.07, deduction: 9394.5 },
    { limit: 633931, rate: 0.08, deduction: 12699.89 },
    { limit: 1150853, rate: 0.06, deduction: 0, flat: true },
    { limit: Number.POSITIVE_INFINITY, rate: 0.075, deduction: 0, flat: true },
  ];
  return [
    { limit: 106346, rate: 0, deduction: 0 },
    { limit: 145470, rate: 0.02, deduction: 2126.92 },
    { limit: 198347, rate: 0.05, deduction: 6491.02 },
    { limit: 330539, rate: 0.07, deduction: 10457.96 },
    { limit: 660982, rate: 0.08, deduction: 13763.35 },
    { limit: 1150853, rate: 0.06, deduction: 0, flat: true },
    { limit: Number.POSITIVE_INFINITY, rate: 0.075, deduction: 0, flat: true },
  ];
};

function imtFor(value: number, region: Region, youth: boolean, hpp: boolean) {
  if (value <= 0) return 0;
  const band = bands(region, youth, hpp).find((item) => value <= item.limit)!;
  return Math.max(0, band.flat ? value * band.rate : value * band.rate - band.deduction);
}

function loanStampRate(termMonths: number) {
  if (termMonths < 12) return 0.0004 * termMonths;
  if (termMonths < 60) return 0.005;
  return 0.006;
}

export function validateTaxInputs(input: PurchaseInput): string[] {
  const missing: string[] = [];
  if (input.contractPrice === null || !Number.isFinite(input.contractPrice) || input.contractPrice <= 0) {
    missing.push("Introduz o preço que consta no contrato.");
  }
  if (input.vpt === null || !Number.isFinite(input.vpt) || input.vpt <= 0) {
    missing.push("Introduz o VPT que consta na caderneta predial.");
  }
  if (input.region === null) missing.push("Escolhe a região do imóvel.");
  if (input.isPermanentHome === null) missing.push("Indica se será habitação própria e permanente.");
  if (input.wholePropertyTransferredInAct === null) {
    missing.push("Indica se a escritura transfere o imóvel inteiro ou apenas uma quota.");
  } else if (input.wholePropertyTransferredInAct === false) {
    missing.push("Este cálculo cobre a compra da totalidade de um imóvel habitacional numa só escritura. Não calcula compras de quotas separadas.");
  }
  if (input.buyers.length === 0) missing.push("Adiciona pelo menos um comprador.");

  input.buyers.forEach((buyer, index) => {
    const number = index + 1;
    if (buyer.ageAtDeed === null || !Number.isInteger(buyer.ageAtDeed) || buyer.ageAtDeed < 0 || buyer.ageAtDeed > 120) {
      missing.push("Indica a idade do comprador " + number + " na data da escritura.");
    }
    if (buyer.isTaxResident === null) missing.push("Indica a residência fiscal atual do comprador " + number + ".");
    if (buyer.wasTaxResident === null) missing.push("Indica se o comprador " + number + " já foi residente fiscal em Portugal.");
    if (buyer.ownedHousingPropertyNowOrInLastThreeYears === null) {
      missing.push("Indica se o comprador " + number + " teve imóvel habitacional nos últimos 3 anos.");
    }
    if (buyer.isDependentForIRSInAcquisitionYear === null) {
      missing.push("Indica se o comprador " + number + " será dependente para IRS no ano da compra.");
    }
    if (buyer.sharePercent === null || !Number.isFinite(buyer.sharePercent) || buyer.sharePercent <= 0 || buyer.sharePercent > 100) {
      missing.push("Indica a percentagem da propriedade do comprador " + number + ".");
    }
  });

  if (input.buyers.length > 0 && input.buyers.every((buyer) => buyer.sharePercent !== null && buyer.sharePercent > 0)) {
    const totalShares = input.buyers.reduce((sum, buyer) => sum + (buyer.sharePercent ?? 0), 0);
    if (Math.abs(totalShares - 100) > 0.01) {
      missing.push("As percentagens dos compradores têm de somar 100%.");
    }
  }

  return missing;
}

export function getFinanceInputIssue(input: PurchaseInput) {
  if (input.loanPrincipal === null || !Number.isFinite(input.loanPrincipal) || input.loanPrincipal < 0) {
    return "Indica o valor do empréstimo aprovado pelo banco. Se não houver empréstimo, introduz 0.";
  }
  if (input.contractPrice !== null && input.loanPrincipal > input.contractPrice) {
    return "O valor do empréstimo não pode exceder o preço indicado no contrato.";
  }
  if (input.loanPrincipal > 0 && (input.loanTermMonths === null || !Number.isInteger(input.loanTermMonths) || input.loanTermMonths <= 0)) {
    return "Indica o prazo do empréstimo em meses, tal como consta na proposta do banco.";
  }
  if (input.availableCash !== null && (!Number.isFinite(input.availableCash) || input.availableCash < 0)) {
    return "O dinheiro disponível tem de ser zero ou um valor positivo.";
  }
  if (input.bankMonthlyPayment !== null && (!Number.isFinite(input.bankMonthlyPayment) || input.bankMonthlyPayment < 0)) {
    return "A prestação indicada pelo banco tem de ser zero ou um valor positivo.";
  }
  return null;
}

export function calculatePurchase(input: PurchaseInput): PurchaseResult | null {
  if (validateTaxInputs(input).length > 0 || input.contractPrice === null || input.vpt === null || input.region === null || input.isPermanentHome === null || input.wholePropertyTransferredInAct === null) {
    return null;
  }

  const taxableValue = Math.max(input.contractPrice, input.vpt);
  const youthLimit = YOUTH_LIMIT[input.region];
  const buyers = input.buyers.map((buyer, index) => {
    const share = (buyer.sharePercent ?? 0) / 100;
    const youngEligible = (buyer.ageAtDeed ?? 36) <= 35
      && input.isPermanentHome === true
      && buyer.ownedHousingPropertyNowOrInLastThreeYears === false
      && buyer.isDependentForIRSInAcquisitionYear === false;
    const nonResidentFlatRate = buyer.isTaxResident === false && buyer.wasTaxResident === false;
    const standardImt = nonResidentFlatRate
      ? taxableValue * 0.075
      : imtFor(taxableValue, input.region!, false, input.isPermanentHome!);
    const youthImt = nonResidentFlatRate
      ? taxableValue * 0.075
      : imtFor(taxableValue, input.region!, youngEligible, input.isPermanentHome!);
    const shareStamp = taxableValue * share * 0.008;
    const youthStampLimit = 0.008 * youthLimit * (input.wholePropertyTransferredInAct ? 1 : share);
    return {
      buyerNumber: index + 1,
      sharePercent: buyer.sharePercent ?? 0,
      youngEligible: youngEligible && !nonResidentFlatRate,
      imtWithoutYouth: roundMoney(standardImt * share),
      imtWithYouth: roundMoney(youthImt * share),
      acquisitionStampWithoutYouth: roundMoney(shareStamp),
      acquisitionStampWithYouth: roundMoney(youngEligible && !nonResidentFlatRate ? Math.max(0, shareStamp - youthStampLimit) : shareStamp),
    };
  });

  const imtWithoutYouth = roundMoney(buyers.reduce((sum, buyer) => sum + buyer.imtWithoutYouth, 0));
  const imtWithYouth = roundMoney(buyers.reduce((sum, buyer) => sum + buyer.imtWithYouth, 0));
  const acquisitionStampWithoutYouth = roundMoney(buyers.reduce((sum, buyer) => sum + buyer.acquisitionStampWithoutYouth, 0));
  const acquisitionStampWithYouth = roundMoney(buyers.reduce((sum, buyer) => sum + buyer.acquisitionStampWithYouth, 0));
  const taxesWithoutYouth = roundMoney(imtWithoutYouth + acquisitionStampWithoutYouth);
  const taxesWithYouth = roundMoney(imtWithYouth + acquisitionStampWithYouth);

  const financeIssue = getFinanceInputIssue(input);
  const hasFinanceCalculation = financeIssue === null && input.loanPrincipal !== null;
  let loanStamp: number | null = null;
  let initialCashWithoutYouth: number | null = null;
  let initialCashWithYouth: number | null = null;
  let availableCashShortfall: number | null = null;

  if (hasFinanceCalculation) {
    const principal = input.loanPrincipal!;
    loanStamp = roundMoney(principal === 0 ? 0 : principal * loanStampRate(input.loanTermMonths!));
    const downPayment = roundMoney(input.contractPrice - principal);
    initialCashWithoutYouth = roundMoney(downPayment + taxesWithoutYouth + loanStamp);
    initialCashWithYouth = roundMoney(downPayment + taxesWithYouth + loanStamp);
    if (input.availableCash !== null) {
      availableCashShortfall = roundMoney(Math.max(0, initialCashWithYouth - input.availableCash));
    }
  }

  return {
    taxableValue,
    imtWithoutYouth,
    imtWithYouth,
    acquisitionStampWithoutYouth,
    acquisitionStampWithYouth,
    taxesWithoutYouth,
    taxesWithYouth,
    taxDifference: roundMoney(taxesWithoutYouth - taxesWithYouth),
    buyers,
    loanStamp,
    initialCashWithoutYouth,
    initialCashWithYouth,
    availableCashShortfall,
  };
}
