export function money(n: number, currency = 'NPR') {
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Number(n) || 0);
}
