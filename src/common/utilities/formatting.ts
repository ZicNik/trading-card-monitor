export function formatEuroCents(cents: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' })
    .format(cents / 100)
}
