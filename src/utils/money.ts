export function calculateLineTotalPaise(quantity: number, unitPricePaise: number): number {
  return quantity * unitPricePaise;
}

export function calculateSubtotalPaise(
  items: Array<{ quantity: number; unitPricePaise: number }>
): number {
  return items.reduce((sum, item) => sum + calculateLineTotalPaise(item.quantity, item.unitPricePaise), 0);
}

export function calculateTotalPaise(subtotalPaise: number, taxPaise = 0): number {
  return subtotalPaise + taxPaise;
}
