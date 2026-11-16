export function stockState(stock: number, minimum: number) {
  if (stock === 0) return "Out of stock";
  if (stock <= minimum) return "Low stock";
  return "In stock";
}

export function orderTotal(lines: { quantity: number; cost: number }[], tax: number, extra: number) {
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.cost, 0);
  return subtotal + subtotal * tax / 100 + extra;
}
