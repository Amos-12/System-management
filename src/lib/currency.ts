export const DEFAULT_USD_TO_HTG = 132;

/** Convertit un montant vers HTG selon la devise d'origine. */
export function toHTG(amount: number | string, currency: string | null | undefined, rate: number): number {
  const value = Number(amount) || 0;
  if ((currency || 'HTG').toUpperCase() === 'USD') {
    return value * (rate > 0 ? rate : DEFAULT_USD_TO_HTG);
  }
  return value;
}

export function formatHTG(amount: number): string {
  return `${(Number(amount) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HTG`;
}
