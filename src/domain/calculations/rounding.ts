export type DisplayUnit = "BRL" | "PERCENT" | "PERCENTAGE_POINT" | "RATIO" | "COUNT";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const oneDecimal = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const twoDecimals = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const count = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export function formatForDisplay(value: number, unit: DisplayUnit): string {
  switch (unit) {
    case "BRL":
      return brl.format(value);
    case "PERCENT":
      return `${oneDecimal.format(value * 100)}%`;
    case "PERCENTAGE_POINT":
      return `${oneDecimal.format(value)} p.p.`;
    case "RATIO":
      return twoDecimals.format(value);
    case "COUNT":
      return count.format(value);
  }
}
