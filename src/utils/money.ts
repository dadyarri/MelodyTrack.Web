export function formatMoney(value?: number | null) {
  return `${Math.round(value ?? 0).toLocaleString("ru-RU")} ₽`;
}
