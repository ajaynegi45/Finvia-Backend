export function calculateLineTotalCents(quantity: number, priceCents: number): number {
  return quantity * priceCents;
}

export function calculateSubtotalCents(
  items: Array<{ quantity: number; priceCents: number }>
): number {
  return items.reduce((sum, item) => sum + calculateLineTotalCents(item.quantity, item.priceCents), 0);
}

export function calculateTotalCents(subtotalCents: number, taxCents = 0): number {
  return subtotalCents + taxCents;
}
