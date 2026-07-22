import { fmtKES, type Sale, type ShopBrief } from "./api";

export function buildReceiptText(sale: Sale, shop: ShopBrief | null): string {
  const dateStr = new Date(sale.created_at).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const items = sale.items
    .map((i) => `${i.product_name} ×${i.quantity}  ${fmtKES(i.subtotal)}`)
    .join("\n");
  const method =
    sale.payment_method === "split"
      ? `Cash ${fmtKES(sale.cash_amount ?? 0)} + M-Pesa ${fmtKES(sale.mpesa_amount ?? 0)}`
      : sale.payment_method === "mpesa"
      ? "M-Pesa"
      : "Cash";
  const changeNote = sale.change_given > 0 ? `\nChange: ${fmtKES(sale.change_given)}` : "";
  const refNote = sale.mpesa_ref ? `\nM-Pesa ref: ${sale.mpesa_ref}` : "";
  const discNote = sale.discount > 0 ? `\nDiscount: -${fmtKES(sale.discount)}` : "";
  const shopLine = shop?.name ?? "Tara POS";
  const phoneLine = shop?.phone ? `\n${shop.phone}` : "";

  return (
    `*${shopLine}*${phoneLine}\nReceipt: ${sale.receipt_number}\n${dateStr}\n\n` +
    `${items}${discNote}\n` +
    `────────────────\n` +
    `*Total: ${fmtKES(sale.total)}*\n` +
    `Payment: ${method}${refNote}${changeNote}\n\n` +
    `Thank you for shopping with us!`
  );
}

export function shareReceipt(sale: Sale, shop: ShopBrief | null) {
  const text = buildReceiptText(sale, shop);
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}
