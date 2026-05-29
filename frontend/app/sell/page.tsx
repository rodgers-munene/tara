"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, X, Plus, Minus, ChevronUp, Loader2, LogOut,
  Tag, CheckCircle2, Share2, Delete,
} from "lucide-react";
import NavBar from "../components/NavBar";
import { useAuth } from "../components/AuthProvider";
import { useOffline } from "../components/OfflineProvider";
import { api, fmtKES, type Category, type Product, type Sale, type SaleCreate } from "../../lib/api";
import { enqueueSale } from "../../lib/offlineQueue";

interface CartItem {
  product: Product;
  qty: number;
}

type ModalStep = "method" | "cash";

// ── Skeleton tile ─────────────────────────────────────────────────────────────
function SkeletonTile() {
  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-3"
      style={{ border: "1.5px solid var(--border)", minHeight: 88, background: "var(--surface)" }}
    >
      <div className="skeleton rounded-md" style={{ height: 14, width: "65%" }} />
      <div className="skeleton rounded-md" style={{ height: 12, width: "40%", marginTop: "auto" }} />
    </div>
  );
}

// ── Product tile ─────────────────────────────────────────────────────────────
function ProductTile({
  product,
  qty,
  catColor,
  onAdd,
}: {
  product: Product;
  qty: number;
  catColor: string | null;
  onAdd: () => void;
}) {
  const outOfStock = product.stock === 0;
  const lowStock = product.stock > 0 && product.stock <= 5;

  return (
    <button
      onClick={onAdd}
      disabled={outOfStock}
      className="relative flex flex-col justify-between rounded-xl p-3 text-left transition-all active:scale-95 select-none"
      style={{
        background: "var(--surface)",
        border: qty > 0 ? "2px solid var(--brand)" : "1.5px solid var(--border)",
        opacity: outOfStock ? 0.45 : 1,
        minHeight: 88,
      }}
    >
      {/* Category color dot */}
      {catColor && (
        <span
          className="absolute top-2.5 left-2.5 h-2 w-2 rounded-full"
          style={{ background: catColor }}
        />
      )}

      {/* In-cart badge */}
      {qty > 0 && (
        <span
          className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ background: "var(--brand)" }}
        >
          {qty}
        </span>
      )}

      <span
        className="text-sm font-semibold leading-snug pr-6"
        style={{ color: "var(--text)", paddingLeft: catColor ? 12 : 0 }}
      >
        {product.name}
      </span>

      <div className="flex items-end justify-between mt-2">
        <span
          className="text-[13px] font-bold"
          style={{ color: outOfStock ? "var(--text-3)" : "var(--brand-dark)" }}
        >
          {outOfStock ? "Out of stock" : fmtKES(product.price)}
        </span>
        {!outOfStock && (
          <span
            className="text-[10px] font-semibold"
            style={{ color: lowStock ? "var(--warning)" : "var(--text-3)" }}
          >
            {lowStock ? `${product.stock} left` : `${product.stock}`}
          </span>
        )}
      </div>
    </button>
  );
}

// ── Qty numpad ────────────────────────────────────────────────────────────────
function QtyNumpad({
  product,
  current,
  onConfirm,
  onClose,
}: {
  product: Product;
  current: number;
  onConfirm: (qty: number) => void;
  onClose: () => void;
}) {
  const [input, setInput] = useState(String(current));
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  function press(key: string) {
    if (key === "del") {
      setInput((v) => (v.length <= 1 ? "0" : v.slice(0, -1)));
      return;
    }
    setInput((v) => {
      const next = v === "0" ? key : v + key;
      return parseInt(next) > 999 ? v : next;
    });
  }

  const qty = Math.max(0, parseInt(input) || 0);

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} style={{ zIndex: 55 }} />
      <div
        className="fixed bottom-0 left-0 right-0 z-60 rounded-t-2xl px-5 pb-8 pt-5"
        style={{ background: "var(--surface)", animation: "slideUp 0.2s cubic-bezier(0.32,0.72,0,1)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0">
            <p className="font-semibold text-base truncate" style={{ color: "var(--text)" }}>
              {product.name}
            </p>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>
              {fmtKES(product.price)} each
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ background: "var(--surface-2)" }}
          >
            <X size={16} style={{ color: "var(--text-2)" }} />
          </button>
        </div>

        {/* Display */}
        <div className="text-center mb-4">
          <span className="text-5xl font-bold" style={{ color: "var(--text)" }}>
            {input}
          </span>
          <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
            = {fmtKES(product.price * qty)}
          </p>
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-xs mx-auto mb-4">
          {keys.map((key, i) => {
            if (!key) return <div key={i} />;
            return (
              <button
                key={i}
                onClick={() => press(key)}
                className="flex items-center justify-center rounded-2xl font-semibold text-xl transition-all active:scale-90 select-none"
                style={{
                  height: 56,
                  background: key === "del" ? "var(--surface-2)" : "var(--surface)",
                  border: "1.5px solid var(--border)",
                  color: key === "del" ? "var(--text-2)" : "var(--text)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {key === "del" ? <Delete size={18} /> : key}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => { if (qty > 0) onConfirm(qty); else onClose(); }}
          disabled={qty === 0}
          className="w-full rounded-xl font-semibold text-base text-white disabled:opacity-40"
          style={{ background: "var(--brand)", height: 52 }}
        >
          {qty === 0 ? "Remove from cart" : `Set quantity to ${qty}`}
        </button>
      </div>
    </>
  );
}

// ── Cart sheet ────────────────────────────────────────────────────────────────
function CartSheet({
  cart,
  total,
  onUpdate,
  onRemove,
  onCharge,
  onClose,
}: {
  cart: CartItem[];
  total: number;
  onUpdate: (id: number, delta: number) => void;
  onRemove: (id: number) => void;
  onCharge: (discountAmount: number) => void;
  onClose: () => void;
}) {
  const [qtyPick, setQtyPick] = useState<CartItem | null>(null);
  const [showDiscount, setShowDiscount] = useState(false);
  const [discType, setDiscType] = useState<"%" | "kes">("%");
  const [discValue, setDiscValue] = useState("");

  const discAmount = (() => {
    const v = parseFloat(discValue) || 0;
    if (discType === "%") return Math.min(total, total * (v / 100));
    return Math.min(total, v);
  })();

  const netTotal = total - discAmount;

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet">
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <span className="font-semibold text-base" style={{ color: "var(--text)" }}>
            Cart ({cart.reduce((s, i) => s + i.qty, 0)})
          </span>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ background: "var(--surface-2)" }}
          >
            <X size={16} style={{ color: "var(--text-2)" }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {cart.map(({ product, qty }) => (
            <div
              key={product.id}
              className="flex items-center gap-3 py-3 border-b last:border-0"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                  {product.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-2)" }}>
                  {fmtKES(product.price)} each
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => (qty === 1 ? onRemove(product.id) : onUpdate(product.id, -1))}
                  className="flex h-7 w-7 items-center justify-center rounded-full border transition-colors active:scale-90"
                  style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
                >
                  {qty === 1 ? <X size={12} /> : <Minus size={12} />}
                </button>
                {/* Tap qty to open numpad */}
                <button
                  onClick={() => setQtyPick({ product, qty })}
                  className="flex h-7 min-w-7 items-center justify-center rounded-lg text-sm font-semibold transition-colors"
                  style={{ color: "var(--text)", background: "var(--surface-2)" }}
                >
                  {qty}
                </button>
                <button
                  onClick={() => onUpdate(product.id, 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full transition-colors active:scale-90 text-white"
                  style={{ background: "var(--brand)" }}
                >
                  <Plus size={12} />
                </button>
              </div>

              <span
                className="w-16 text-right text-sm font-semibold shrink-0"
                style={{ color: "var(--text)" }}
              >
                {fmtKES(product.price * qty)}
              </span>
            </div>
          ))}
        </div>

        {/* Discount section */}
        <div className="shrink-0 px-5 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
          {!showDiscount ? (
            <button
              onClick={() => setShowDiscount(true)}
              className="flex items-center gap-1.5 text-sm font-medium mb-3"
              style={{ color: "var(--text-3)" }}
            >
              <Tag size={13} />
              Apply discount
            </button>
          ) : (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: "var(--text-2)" }}>Discount</span>
                <button
                  onClick={() => { setShowDiscount(false); setDiscValue(""); }}
                  className="text-xs"
                  style={{ color: "var(--text-3)" }}
                >
                  Remove
                </button>
              </div>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setDiscType("%")}
                  className="flex-1 rounded-lg py-1.5 text-sm font-semibold border"
                  style={{
                    borderColor: discType === "%" ? "var(--brand)" : "var(--border)",
                    background: discType === "%" ? "var(--brand-light)" : "var(--surface-2)",
                    color: discType === "%" ? "var(--brand-dark)" : "var(--text-2)",
                  }}
                >
                  %
                </button>
                <button
                  onClick={() => setDiscType("kes")}
                  className="flex-1 rounded-lg py-1.5 text-sm font-semibold border"
                  style={{
                    borderColor: discType === "kes" ? "var(--brand)" : "var(--border)",
                    background: discType === "kes" ? "var(--brand-light)" : "var(--surface-2)",
                    color: discType === "kes" ? "var(--brand-dark)" : "var(--text-2)",
                  }}
                >
                  KES
                </button>
              </div>
              <input
                type="number"
                inputMode="decimal"
                value={discValue}
                onChange={(e) => setDiscValue(e.target.value)}
                placeholder={discType === "%" ? "e.g. 10" : "e.g. 50"}
                autoFocus
                className="w-full rounded-xl border px-4 text-sm outline-none transition-colors"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface-2)",
                  color: "var(--text)",
                  height: 44,
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
          )}

          {/* Totals */}
          {showDiscount && discAmount > 0 && (
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: "var(--text-3)" }}>
                Subtotal
              </span>
              <span className="text-xs" style={{ color: "var(--text-3)" }}>
                {fmtKES(total)}
              </span>
            </div>
          )}
          {showDiscount && discAmount > 0 && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: "var(--brand-dark)" }}>
                Discount ({discType === "%" ? `${discValue}%` : fmtKES(discAmount)})
              </span>
              <span className="text-xs font-medium" style={{ color: "var(--brand-dark)" }}>
                -{fmtKES(discAmount)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium" style={{ color: "var(--text-2)" }}>
              Total
            </span>
            <span className="text-xl font-bold" style={{ color: "var(--text)" }}>
              {fmtKES(netTotal)}
            </span>
          </div>

          <button
            onClick={() => onCharge(discAmount)}
            className="w-full rounded-xl font-semibold text-base text-white transition-all active:scale-98"
            style={{
              background: "var(--brand)",
              height: 52,
              marginBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
            }}
          >
            Charge {fmtKES(netTotal)}
          </button>
        </div>
      </div>

      {/* Qty numpad */}
      {qtyPick && (
        <QtyNumpad
          product={qtyPick.product}
          current={qtyPick.qty}
          onConfirm={(newQty) => {
            if (newQty === 0) onRemove(qtyPick.product.id);
            else {
              const delta = newQty - qtyPick.qty;
              onUpdate(qtyPick.product.id, delta);
            }
            setQtyPick(null);
          }}
          onClose={() => setQtyPick(null)}
        />
      )}
    </>
  );
}

// ── Payment modal ─────────────────────────────────────────────────────────────
function PaymentModal({
  total,
  onClose,
  onComplete,
}: {
  total: number;
  onClose: () => void;
  onComplete: (
    method: "cash" | "mpesa",
    amountPaid: number,
    mpesaRef?: string,
    mpesaPhone?: string
  ) => void;
}) {
  const [step, setStep] = useState<ModalStep>("method");
  const [cashInput, setCashInput] = useState("");
  const cashNum = parseFloat(cashInput) || 0;
  const change = cashNum - total;

  if (step === "method") {
    return (
      <div className="modal">
        <div className="modal-content">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-3)" }}>
            Amount to charge
          </p>
          <p className="text-3xl font-bold mb-6" style={{ color: "var(--text)" }}>
            {fmtKES(total)}
          </p>
          <p className="text-sm font-medium mb-3" style={{ color: "var(--text-2)" }}>
            How is the customer paying?
          </p>
          <div className="flex flex-col gap-3 mb-6">
            <button
              onClick={() => setStep("cash")}
              className="flex items-center gap-4 w-full p-4 rounded-xl border-2 text-left transition-all active:scale-98"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--brand)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <span className="text-2xl">💵</span>
              <div>
                <p className="font-semibold" style={{ color: "var(--text)" }}>Cash</p>
                <p className="text-xs" style={{ color: "var(--text-3)" }}>Enter amount received</p>
              </div>
            </button>
            <button
              onClick={() => onComplete("mpesa", total)}
              className="flex items-center gap-4 w-full p-4 rounded-xl border-2 text-left transition-all active:scale-98"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--mpesa)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <span className="text-2xl">📱</span>
              <div>
                <p className="font-semibold" style={{ color: "var(--text)" }}>M-Pesa</p>
                <p className="text-xs" style={{ color: "var(--text-3)" }}>Tap to confirm — no ref needed</p>
              </div>
            </button>
          </div>
          <button onClick={onClose} className="w-full py-3 text-sm font-medium" style={{ color: "var(--text-3)" }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (step === "cash") {
    return (
      <div className="modal">
        <div className="modal-content">
          <button onClick={() => setStep("method")} className="flex items-center gap-1.5 text-sm font-medium mb-5" style={{ color: "var(--brand)" }}>
            ← Back
          </button>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-3)" }}>
            Cash payment
          </p>
          <p className="text-2xl font-bold mb-5" style={{ color: "var(--text)" }}>
            {fmtKES(total)}
          </p>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
            Amount received (KES)
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={cashInput}
            onChange={(e) => setCashInput(e.target.value)}
            placeholder={String(total)}
            autoFocus
            className="w-full rounded-xl border px-4 text-lg font-semibold outline-none transition-colors mb-4"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--text)", height: 52 }}
            onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
          {cashInput && (
            <div
              className="flex items-center justify-between rounded-xl px-4 py-3 mb-5"
              style={{ background: change >= 0 ? "var(--brand-light)" : "var(--danger-light)" }}
            >
              <span className="text-sm font-medium" style={{ color: change >= 0 ? "var(--brand-dark)" : "var(--danger)" }}>
                {change >= 0 ? "Change" : "Shortfall"}
              </span>
              <span className="font-bold" style={{ color: change >= 0 ? "var(--brand-dark)" : "var(--danger)" }}>
                {fmtKES(Math.abs(change))}
              </span>
            </div>
          )}
          <button
            onClick={() => onComplete("cash", cashNum)}
            disabled={cashNum < total}
            className="w-full rounded-xl font-semibold text-base text-white transition-all active:scale-98 disabled:opacity-40"
            style={{ background: "var(--brand)", height: 52 }}
          >
            Complete Sale
          </button>
        </div>
      </div>
    );
  }

}

// ── Receipt preview ───────────────────────────────────────────────────────────
function ReceiptPreview({
  sale,
  onNewSale,
}: {
  sale: Sale;
  onNewSale: () => void;
}) {
  const isMpesa = sale.payment_method === "mpesa";
  const dateStr = new Date(sale.created_at).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  function shareWhatsApp() {
    const items = sale.items
      .map((i) => `${i.product_name} ×${i.quantity}  ${fmtKES(i.subtotal)}`)
      .join("\n");
    const method = isMpesa ? "M-Pesa" : "Cash";
    const changeNote = sale.change_given > 0 ? `\nChange: ${fmtKES(sale.change_given)}` : "";
    const refNote = sale.mpesa_ref ? `\nM-Pesa ref: ${sale.mpesa_ref}` : "";
    const discNote = sale.discount > 0 ? `\nDiscount: -${fmtKES(sale.discount)}` : "";
    const text =
      `*Tara POS Receipt*\n${sale.receipt_number}\n${dateStr}\n\n` +
      `${items}${discNote}\n` +
      `────────────────\n` +
      `*Total: ${fmtKES(sale.total)}*\n` +
      `Payment: ${method}${refNote}${changeNote}\n\n` +
      `Thank you!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div
      className="fixed inset-0 z-70 flex flex-col"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="sticky top-0 flex items-center justify-between px-5 py-4 border-b"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 size={20} style={{ color: "var(--brand)" }} />
          <span className="font-semibold text-base" style={{ color: "var(--text)" }}>
            Sale complete
          </span>
        </div>
        <span className="text-xs font-mono font-semibold" style={{ color: "var(--text-3)" }}>
          {sale.receipt_number}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Items */}
        <div
          className="rounded-2xl overflow-hidden mb-4"
          style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
        >
          {sale.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-4 py-2.5 border-b last:border-0 text-sm"
              style={{ borderColor: "var(--border)" }}
            >
              <span style={{ color: "var(--text)" }}>{item.product_name}</span>
              <div className="flex items-center gap-4">
                <span style={{ color: "var(--text-3)" }}>×{item.quantity}</span>
                <span className="font-semibold" style={{ color: "var(--text)" }}>
                  {fmtKES(item.subtotal)}
                </span>
              </div>
            </div>
          ))}
          {sale.discount > 0 && (
            <div
              className="flex items-center justify-between px-4 py-2.5 border-b last:border-0 text-sm"
              style={{ borderColor: "var(--border)" }}
            >
              <span style={{ color: "var(--brand-dark)" }}>Discount</span>
              <span className="font-semibold" style={{ color: "var(--brand-dark)" }}>
                -{fmtKES(sale.discount)}
              </span>
            </div>
          )}
        </div>

        {/* Summary */}
        <div
          className="rounded-2xl p-4 mb-4"
          style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
        >
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: "var(--text-2)" }}>Total</span>
            <span className="text-base font-bold" style={{ color: "var(--text)" }}>{fmtKES(sale.total)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-sm" style={{ color: "var(--text-2)" }}>Payment</span>
            <span
              className="text-sm font-semibold"
              style={{ color: isMpesa ? "var(--mpesa)" : "var(--text)" }}
            >
              {isMpesa ? "M-Pesa" : "Cash"}
              {sale.mpesa_ref && (
                <span className="font-mono ml-1.5" style={{ color: "var(--text-3)", fontWeight: 400 }}>
                  {sale.mpesa_ref}
                </span>
              )}
            </span>
          </div>
          {sale.change_given > 0 && (
            <div className="flex justify-between">
              <span className="text-sm" style={{ color: "var(--text-2)" }}>Change</span>
              <span className="text-sm font-semibold" style={{ color: "var(--brand-dark)" }}>
                {fmtKES(sale.change_given)}
              </span>
            </div>
          )}
        </div>

        <p className="text-xs text-center" style={{ color: "var(--text-3)" }}>
          {dateStr} · {sale.cashier_name}
        </p>
      </div>

      <div
        className="shrink-0 px-4 pb-6 pt-4 flex flex-col gap-3 border-t"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface)",
          paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
        }}
      >
        <button
          onClick={shareWhatsApp}
          className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold text-sm border-2"
          style={{
            height: 48,
            borderColor: "#25D366",
            color: "#25D366",
            background: "transparent",
          }}
        >
          <Share2 size={16} />
          Share via WhatsApp
        </button>
        <button
          onClick={onNewSale}
          className="w-full rounded-xl font-semibold text-base text-white"
          style={{ background: "var(--brand)", height: 52 }}
        >
          New Sale
        </button>
      </div>
    </div>
  );
}

// ── Offline queued confirmation ───────────────────────────────────────────────
function QueuedOverlay({ onNewSale }: { onNewSale: () => void }) {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center gap-4 px-6"
      style={{ background: "var(--warning)", zIndex: 70 }}
    >
      <div className="pop-in flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}>
          <CheckCircle2 size={40} className="text-white" strokeWidth={1.5} />
        </div>
        <p className="text-2xl font-bold text-white">Sale queued</p>
        <p className="text-white/80 text-sm text-center">
          You&apos;re offline. This sale will sync automatically when the connection is restored.
        </p>
        <button
          onClick={onNewSale}
          className="mt-4 rounded-xl font-semibold text-base px-8 text-white border-2 border-white/30"
          style={{ height: 52, background: "rgba(255,255,255,0.15)" }}
        >
          New Sale
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SellPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [offlineQueued, setOfflineQueued] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [pendingPayload, setPendingPayload] = useState<SaleCreate | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { user, logout } = useAuth();
  const { isOnline, refreshQueue } = useOffline();

  const catColorMap: Record<number, string> = {};
  for (const c of categories) {
    if (c.id && c.color) catColorMap[c.id] = c.color;
  }

  useEffect(() => {
    Promise.all([
      api.get<Category[]>("/categories/"),
      api.get<Product[]>("/products/"),
    ])
      .then(([cats, prods]) => {
        setCategories(cats);
        setProducts(prods);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const netTotal = cartTotal - discountAmount;

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      if (product.stock === 0) return prev;
      return [...prev, { product, qty: 1 }];
    });
  }, []);

  const updateCart = useCallback((id: number, delta: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.product.id === id
          ? { ...i, qty: Math.min(i.product.stock, Math.max(1, i.qty + delta)) }
          : i
      )
    );
  }, []);

  const removeFromCart = useCallback((id: number) => {
    setCart((prev) => prev.filter((i) => i.product.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCartOpen(false);
    setPayOpen(false);
    setDiscountAmount(0);
    setCompletedSale(null);
    setOfflineQueued(false);
  }, []);

  const handleCharge = useCallback((disc: number) => {
    setDiscountAmount(disc);
    setCartOpen(false);
    setPayOpen(true);
  }, []);

  const submitSale = useCallback(async (payload: SaleCreate) => {
    setSubmitting(true);
    setSaleError(null);
    try {
      const sale = await api.post<Sale>("/sales/", payload);
      setPayOpen(false);
      setPendingPayload(null);
      setCompletedSale(sale);
      api.get<Product[]>("/products/").then(setProducts);
    } catch (e: unknown) {
      const msg = (e as Error).message ?? "";
      const isNetwork = !msg || msg.includes("fetch") || msg.includes("network") || msg.includes("Failed to fetch");
      setSaleError(isNetwork
        ? "Could not reach the server. Check your connection and try again."
        : msg
      );
      setPendingPayload(payload);
    } finally {
      setSubmitting(false);
    }
  }, [setProducts]);

  const handlePaymentComplete = useCallback(async (
    method: "cash" | "mpesa",
    amountPaid: number,
    mpesaRef?: string,
    mpesaPhone?: string
  ) => {
    const payload: SaleCreate = {
      items: cart.map((i) => ({ product_id: i.product.id, quantity: i.qty })),
      payment_method: method,
      amount_paid: amountPaid,
      discount: discountAmount,
      mpesa_ref: mpesaRef,
      mpesa_phone: mpesaPhone,
    };

    if (!isOnline) {
      enqueueSale(payload, user?.name ?? "");
      refreshQueue();
      setPayOpen(false);
      setOfflineQueued(true);
      return;
    }

    await submitSale(payload);
  }, [cart, discountAmount, isOnline, user, refreshQueue, submitSale]);

  const filtered = products.filter((p) => {
    if (activeCat !== null && p.category_id !== activeCat) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const qtyInCart = (id: number) => cart.find((i) => i.product.id === id)?.qty ?? 0;

  return (
    <div className="flex min-h-svh flex-col lg:pl-56 pt-12 lg:pt-0" style={{ background: "var(--bg)" }}>
      <NavBar />

      {/* Header */}
      <header
        className="sticky top-12 lg:top-0 z-20 flex items-center gap-3 px-4 h-14 border-b"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div
          className="flex flex-1 items-center gap-2 rounded-xl px-3 h-9"
          style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)" }}
        >
          <Search size={15} style={{ color: "var(--text-3)" }} className="shrink-0" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-3"
            style={{ color: "var(--text)" }}
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X size={14} style={{ color: "var(--text-3)" }} />
            </button>
          )}
        </div>
        {user && (
          <div className="flex items-center gap-1.5 shrink-0 lg:hidden">
            <span className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
              {user.name.split(" ")[0]}
            </span>
            <button
              onClick={logout}
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ color: "var(--text-3)" }}
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </header>

      {/* Category tabs */}
      <div
        className="sticky top-[104px] lg:top-14 z-10 flex gap-2 px-4 py-2.5 no-scrollbar overflow-x-auto border-b"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <button
          onClick={() => setActiveCat(null)}
          className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
          style={{
            background: activeCat === null ? "var(--brand)" : "var(--surface-2)",
            color: activeCat === null ? "#fff" : "var(--text-2)",
          }}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCat(activeCat === c.id ? null : c.id)}
            className="shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: activeCat === c.id ? "var(--brand)" : "var(--surface-2)",
              color: activeCat === c.id ? "#fff" : "var(--text-2)",
            }}
          >
            {c.color && (
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: c.color, opacity: activeCat === c.id ? 0.7 : 1 }}
              />
            )}
            {c.name}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <main className="flex-1 p-3 pb-36 lg:pb-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonTile key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2">
            <p className="text-sm font-medium" style={{ color: "var(--text-3)" }}>
              {search ? `No products matching "${search}"` : "No products yet — add some in Items"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((p) => (
              <ProductTile
                key={p.id}
                product={p}
                qty={qtyInCart(p.id)}
                catColor={p.category_id ? (catColorMap[p.category_id] ?? null) : null}
                onAdd={() => addToCart(p)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Cart bar — sticky bottom */}
      {cartCount > 0 && !payOpen && !completedSale && !offlineQueued && (
        <div
          className="fixed left-0 right-0 lg:left-56 z-20 px-4 flex flex-col gap-2"
          style={{ bottom: "calc(60px + env(safe-area-inset-bottom))" }}
        >
          <button
            onClick={() => setCartOpen(true)}
            className="flex items-center justify-between w-full rounded-xl px-4 text-white shadow-lg transition-all active:scale-98"
            style={{ background: "var(--text)", height: 48 }}
          >
            <span className="text-sm font-medium opacity-80">
              {cartCount} {cartCount === 1 ? "item" : "items"}
            </span>
            <span className="font-bold">{fmtKES(cartTotal)}</span>
            <ChevronUp size={18} className="opacity-70" />
          </button>
          <button
            onClick={() => handleCharge(0)}
            className="w-full rounded-xl font-semibold text-base text-white shadow-lg transition-all active:scale-98"
            style={{ background: "var(--brand)", height: 52 }}
          >
            Charge {fmtKES(cartTotal)}
          </button>
        </div>
      )}

      {/* Cart sheet */}
      {cartOpen && (
        <CartSheet
          cart={cart}
          total={cartTotal}
          onUpdate={updateCart}
          onRemove={removeFromCart}
          onCharge={handleCharge}
          onClose={() => setCartOpen(false)}
        />
      )}

      {/* Payment modal */}
      {payOpen && (
        <PaymentModal
          total={netTotal}
          onClose={() => { setPayOpen(false); setCartOpen(true); }}
          onComplete={handlePaymentComplete}
        />
      )}

      {/* Receipt preview */}
      {completedSale && (
        <ReceiptPreview sale={completedSale} onNewSale={clearCart} />
      )}

      {/* Offline queued overlay */}
      {offlineQueued && <QueuedOverlay onNewSale={clearCart} />}

      {/* Sale error overlay */}
      {saleError && pendingPayload && (
        <div
          className="fixed inset-0 flex items-center justify-center p-6"
          style={{ background: "rgb(0 0 0 / 0.5)", zIndex: 80 }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 flex flex-col gap-4"
            style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: "var(--danger-light)" }}
            >
              <span className="text-2xl">⚠️</span>
            </div>
            <div>
              <p className="font-bold" style={{ color: "var(--text)" }}>Sale not recorded</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>{saleError}</p>
            </div>
            <button
              onClick={() => submitSale(pendingPayload)}
              className="w-full rounded-xl py-3 font-semibold text-sm text-white"
              style={{ background: "var(--brand)" }}
            >
              Try again
            </button>
            <button
              onClick={() => { setSaleError(null); setPendingPayload(null); setPayOpen(true); }}
              className="w-full rounded-xl py-3 text-sm font-medium"
              style={{ background: "var(--surface-2)", color: "var(--text-2)" }}
            >
              Change payment method
            </button>
          </div>
        </div>
      )}

      {/* Submitting overlay */}
      {submitting && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: "rgb(0 0 0 / 0.3)", zIndex: 80 }}
        >
          <div className="rounded-2xl p-6 flex flex-col items-center gap-3 shadow-lg" style={{ background: "var(--surface)" }}>
            <Loader2 size={28} className="animate-spin" style={{ color: "var(--brand)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-2)" }}>Recording sale…</p>
          </div>
        </div>
      )}
    </div>
  );
}
