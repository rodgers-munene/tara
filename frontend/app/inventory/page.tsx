"use client";

import { useState } from "react";
import { Plus, Search, X, Package, PackagePlus, Loader2, Pencil, Trash2, AlertTriangle, Upload, Tag, ScanLine } from "lucide-react";
import NavBar from "../components/NavBar";
import { useAuth } from "../components/AuthProvider";
import BarcodeScanModal from "../components/BarcodeScanModal";
import { api, useApi, invalidateApi, fmtKES, type Category, type Product, type BulkImportResult } from "../../lib/api";

// Skeleton row 
function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <div className="skeleton h-10 w-10 shrink-0 rounded-xl" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="skeleton rounded-md h-3.5 w-40" />
        <div className="skeleton rounded-md h-3 w-24" />
      </div>
      <div className="skeleton rounded-md h-4 w-16" />
    </div>
  );
}

// Shared form fields 
function ProductFormContent({
  initial,
  categories,
  products,
  onSave,
  onClose,
}: {
  initial?: Product;
  categories: Category[];
  products: Product[];
  onSave: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [buyingPrice, setBuyingPrice] = useState(initial?.buying_price ? String(initial.buying_price) : "");
  const [stock, setStock] = useState(initial ? String(initial.stock) : "0");
  const [minStock, setMinStock] = useState(initial ? String(initial.min_stock) : "5");
  const [barcode, setBarcode] = useState(initial?.barcode ?? "");
  const [categoryId, setCategoryId] = useState<string>(
    initial?.category_id ? String(initial.category_id) : ""
  );
  const [pricingMode, setPricingMode] = useState<"unit" | "weight">(initial?.pricing_mode ?? "unit");
  const [unitLabel, setUnitLabel] = useState(initial?.unit_label ?? "");
  const [trackStock, setTrackStock] = useState(initial ? initial.track_stock : false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [scanOpen, setScanOpen] = useState(false);

  const isEdit = !!initial;
  const isWeight = pricingMode === "weight";
  const showStockFields = !isWeight || trackStock;
  const trimmedBarcode = barcode.trim();
  const duplicateProduct = trimmedBarcode
    ? products.find((p) => p.barcode === trimmedBarcode && p.id !== initial?.id)
    : undefined;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price) { setError("Name and selling price are required."); return; }
    if (duplicateProduct) { setError(`Barcode already used by "${duplicateProduct.name}" — edit that product instead of adding a duplicate.`); return; }
    setSaving(true);
    setError("");
    try {
      const body = {
        name: name.trim(),
        price: parseFloat(price),
        buying_price: buyingPrice ? parseFloat(buyingPrice) : 0,
        stock: showStockFields ? (parseFloat(stock) || 0) : 0,
        min_stock: showStockFields ? (parseFloat(minStock) || 0) : 0,
        pricing_mode: pricingMode,
        unit_label: !isWeight && unitLabel.trim() ? unitLabel.trim() : null,
        track_stock: isWeight ? trackStock : true,
        barcode: barcode.trim() || null,
        category_id: categoryId ? parseInt(categoryId) : null,
      };
      if (isEdit) {
        await api.patch(`/products/${initial!.id}`, body);
      } else {
        await api.post("/products/", body);
      }
      onSave();
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to save product.");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    borderColor: "var(--border)",
    background: "var(--surface-2)",
    color: "var(--text)",
    height: 48,
  };

  return (
    <>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="font-semibold text-base" style={{ color: "var(--text)" }}>
          {isEdit ? "Edit product" : "Add product"}
        </span>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: "var(--surface-2)" }}
        >
          <X size={16} style={{ color: "var(--text-2)" }} />
        </button>
      </div>

      {/* Fields */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
            Product name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Unga wa Ngano 2kg"
            autoFocus
            className="w-full rounded-xl border px-4 text-sm outline-none transition-colors"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
            How is it sold?
          </label>
          <div
            className="flex rounded-xl p-1 gap-1"
            style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)" }}
          >
            {(["unit", "weight"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPricingMode(mode)}
                className="flex-1 rounded-lg py-2 text-sm font-semibold transition-colors"
                style={{
                  background: pricingMode === mode ? "var(--brand)" : "transparent",
                  color: pricingMode === mode ? "#fff" : "var(--text-2)",
                }}
              >
                {mode === "unit" ? "Unit" : "Weight (per kg)"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
              {isWeight ? "Price per kg (KES) *" : "Selling price (KES) *"}
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              className="w-full rounded-xl border px-4 text-sm outline-none transition-colors"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
              Buying price (KES)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={buyingPrice}
              onChange={(e) => setBuyingPrice(e.target.value)}
              placeholder="0"
              className="w-full rounded-xl border px-4 text-sm outline-none transition-colors"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
        </div>

        {/* Margin hint */}
        {price && buyingPrice && parseFloat(price) > 0 && parseFloat(buyingPrice) > 0 && (
          (() => {
            const sell = parseFloat(price);
            const buy = parseFloat(buyingPrice);
            const profit = sell - buy;
            const margin = Math.round((profit / sell) * 100);
            return (
              <div
                className="flex items-center justify-between rounded-xl px-4 py-2.5 -mt-1"
                style={{ background: profit >= 0 ? "var(--brand-light)" : "var(--danger-light)" }}
              >
                <span className="text-xs font-medium" style={{ color: profit >= 0 ? "var(--brand-dark)" : "var(--danger)" }}>
                  Profit per unit
                </span>
                <span className="text-xs font-bold" style={{ color: profit >= 0 ? "var(--brand-dark)" : "var(--danger)" }}>
                  KES {profit.toFixed(0)} · {margin}% margin
                </span>
              </div>
            );
          })()
        )}

        {!isWeight && (
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
              Unit label{" "}
              <span style={{ color: "var(--text-3)", fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="text"
              value={unitLabel}
              onChange={(e) => setUnitLabel(e.target.value)}
              placeholder="e.g. bundle of 3, piece"
              className="w-full rounded-xl border px-4 text-sm outline-none transition-colors"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
        )}

        {isWeight && (
          <button
            type="button"
            onClick={() => setTrackStock((v) => !v)}
            className="flex items-center justify-between rounded-xl px-4 py-3 border"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
          >
            <span className="text-sm font-medium text-left" style={{ color: "var(--text)" }}>
              Track stock for this product
            </span>
            <span
              className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
              style={{ background: trackStock ? "var(--brand)" : "var(--border-strong)" }}
            >
              <span
                className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                style={{ transform: trackStock ? "translateX(22px)" : "translateX(4px)" }}
              />
            </span>
          </button>
        )}

        {showStockFields && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
                Stock {isWeight ? "(kg)" : "(units)"}
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border px-4 text-sm outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
                Low stock alert at
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                placeholder="5"
                className="w-full rounded-xl border px-4 text-sm outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
            Category
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-xl border px-4 text-sm outline-none transition-colors appearance-none"
            style={{ ...inputStyle, color: categoryId ? "var(--text)" : "var(--text-3)" }}
            onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
            Barcode{" "}
            <span style={{ color: "var(--text-3)", fontWeight: 400 }}>(optional)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Scan or type barcode"
              className="flex-1 min-w-0 rounded-xl border px-4 text-sm outline-none transition-colors font-mono"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              aria-label="Scan barcode"
              className="shrink-0 flex items-center justify-center rounded-xl"
              style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", width: 48, height: 48 }}
            >
              <ScanLine size={18} style={{ color: "var(--text-2)" }} />
            </button>
          </div>
          {duplicateProduct && (
            <p className="text-xs mt-1.5" style={{ color: "var(--danger)" }}>
              Already used by &quot;{duplicateProduct.name}&quot; — edit that product instead of adding a duplicate.
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm rounded-xl px-4 py-3" style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
            {error}
          </p>
        )}
      </form>

      {/* Footer */}
      <div
        className="shrink-0 px-5 pt-3 pb-6 border-t"
        style={{
          borderColor: "var(--border)",
          paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
        }}
      >
        <button
          onClick={handleSubmit as unknown as React.MouseEventHandler}
          disabled={saving || !!duplicateProduct}
          className="w-full rounded-xl font-semibold text-base text-white transition-all active:scale-98 disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: "var(--brand)", height: 52 }}
        >
          {saving && <Loader2 size={18} className="animate-spin" />}
          {isEdit ? "Save changes" : "Add product"}
        </button>
      </div>

      {scanOpen && (
        <BarcodeScanModal
          feedback={null}
          onDetect={(code) => { setBarcode(code); setScanOpen(false); }}
          onClose={() => setScanOpen(false)}
        />
      )}
    </>
  );
}

// Mobile: bottom sheet wrapper
function ProductFormSheet(props: React.ComponentProps<typeof ProductFormContent>) {
  return (
    <>
      <div className="sheet-backdrop" onClick={props.onClose} />
      <div className="sheet">
        <ProductFormContent {...props} />
      </div>
    </>
  );
}

// Stock adjust sheet
function StockAdjustSheet({
  product,
  onSave,
  onClose,
}: {
  product: Product;
  onSave: () => void;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const unit = product.pricing_mode === "weight" ? " kg" : "";
  const delta = parseFloat(amount) || 0;
  const newStock = Math.max(0, product.stock + delta);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || delta === 0) return;
    setSaving(true);
    setError("");
    try {
      await api.post(`/products/${product.id}/adjust-stock`, { delta });
      onSave();
    } catch (err: unknown) {
      setError((err as Error).message ?? "Failed to update stock.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl px-5 pb-10 pt-5"
        style={{ background: "var(--surface)" }}
      >
        <p className="font-semibold text-base mb-1 truncate" style={{ color: "var(--text)" }}>
          Adjust stock — {product.name}
        </p>
        <p className="text-xs mb-4" style={{ color: "var(--text-3)" }}>
          Current stock: {product.stock}{unit}
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 20 (use -5 to remove)"
            autoFocus
            className="w-full rounded-xl border px-4 text-lg font-semibold outline-none transition-colors text-center"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--text)", height: 52 }}
            onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
          {amount && (
            <p className="text-sm text-center" style={{ color: "var(--text-2)" }}>
              New stock:{" "}
              <span className="font-bold" style={{ color: "var(--text)" }}>
                {newStock}{unit}
              </span>
            </p>
          )}
          {error && (
            <p className="text-sm rounded-xl px-4 py-3" style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={saving || !amount || delta === 0}
            className="w-full rounded-xl font-semibold text-sm text-white disabled:opacity-50 flex items-center justify-center gap-1.5"
            style={{ background: "var(--brand)", height: 48 }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            Update stock
          </button>
        </form>
        <button onClick={onClose} className="mt-3 w-full py-2 text-sm" style={{ color: "var(--text-3)" }}>
          Cancel
        </button>
      </div>
    </>
  );
}

// Category form
function CategoryForm({ onSave, onClose }: { onSave: () => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#16a34a");
  const [saving, setSaving] = useState(false);

  const presetColors = [
    "#16a34a", "#2563eb", "#d97706", "#dc2626",
    "#7c3aed", "#0891b2", "#db2777", "#4b5563",
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post("/categories/", { name: name.trim(), color });
      onSave();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl px-5 pb-10 pt-5"
        style={{ background: "var(--surface)" }}
      >
        <p className="font-semibold text-base mb-4" style={{ color: "var(--text)" }}>
          New category
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Category name"
            autoFocus
            className="w-full rounded-xl border px-4 text-sm outline-none transition-colors"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--text)", height: 48 }}
            onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--text-2)" }}>Color</p>
            <div className="flex gap-2 flex-wrap">
              {presetColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-8 w-8 rounded-full transition-transform active:scale-90"
                  style={{ background: c, outline: color === c ? `3px solid ${c}` : "none", outlineOffset: 2 }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 rounded-xl font-semibold text-sm text-white disabled:opacity-50 flex items-center justify-center gap-1.5"
              style={{ background: "var(--brand)", height: 48 }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              Add category
            </button>
          </div>
        </form>
        <button onClick={onClose} className="mt-3 w-full py-2 text-sm" style={{ color: "var(--text-3)" }}>
          Cancel
        </button>
      </div>
    </>
  );
}

// CSV import
const IMPORT_FIELDS: { key: string; label: string; required: boolean }[] = [
  { key: "name", label: "Product name", required: true },
  { key: "price", label: "Selling price", required: true },
  { key: "buying_price", label: "Buying price", required: false },
  { key: "stock", label: "Stock", required: false },
  { key: "min_stock", label: "Minimum stock", required: false },
  { key: "pricing_mode", label: "Pricing mode (unit/weight)", required: false },
  { key: "unit_label", label: "Unit label (e.g. kg)", required: false },
  { key: "track_stock", label: "Track stock (true/false)", required: false },
  { key: "barcode", label: "Barcode", required: false },
  { key: "category", label: "Category", required: false },
];

function ImportSheet({ onSave, onClose }: { onSave: () => void; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [error, setError] = useState("");
  const [mappingHeaders, setMappingHeaders] = useState<string[] | null>(null);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});

  function downloadTemplate() {
    const csv =
      "name,price,buying_price,stock,min_stock,pricing_mode,unit_label,track_stock,barcode,category\n" +
      "Rice 2kg,250,200,10,2,unit,,true,1234567890123,Grains\n" +
      "Loose Beans,,180,20,5,weight,kg,true,,Grains\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tara-product-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetFile(f: File | null) {
    setFile(f);
    setResult(null);
    setError("");
    setMappingHeaders(null);
    setColumnMap({});
  }

  async function submitImport(mapping?: Record<string, string>) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (mapping) formData.append("column_map", JSON.stringify(mapping));
      const res = await api.upload<BulkImportResult>("/products/bulk-import", formData);
      if (res.needs_mapping) {
        const initial: Record<string, string> = {};
        for (const f of IMPORT_FIELDS) {
          const suggested = res.suggested_map?.[f.key];
          if (suggested) initial[f.key] = suggested;
        }
        setColumnMap(initial);
        setMappingHeaders(res.headers ?? []);
      } else {
        setResult(res);
        if (res.created > 0) onSave();
      }
    } catch (err) {
      setError((err as Error).message ?? "Import failed.");
    } finally {
      setUploading(false);
    }
  }

  const canConfirmMapping = !!columnMap.name && !!columnMap.price;

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl px-5 pb-10 pt-5 max-h-[80vh] overflow-y-auto"
        style={{ background: "var(--surface)" }}
      >
        <p className="font-semibold text-base mb-1" style={{ color: "var(--text)" }}>
          Import products
        </p>

        {mappingHeaders ? (
          <>
            <p className="text-xs mb-4" style={{ color: "var(--text-3)" }}>
              We couldn&apos;t automatically match all your columns — tell us which column in your file is which.
            </p>
            <div className="flex flex-col gap-2 mb-4">
              {IMPORT_FIELDS.map((f) => (
                <div key={f.key} className="flex items-center justify-between gap-3">
                  <label className="text-sm" style={{ color: "var(--text-2)" }}>
                    {f.label}
                    {f.required && <span style={{ color: "var(--danger)" }}> *</span>}
                  </label>
                  <select
                    value={columnMap[f.key] ?? ""}
                    onChange={(e) =>
                      setColumnMap((m) => {
                        const next = { ...m };
                        if (e.target.value) next[f.key] = e.target.value;
                        else delete next[f.key];
                        return next;
                      })
                    }
                    className="rounded-lg border px-2 h-9 text-sm outline-none"
                    style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--text)" }}
                  >
                    <option value="">— not in file —</option>
                    {mappingHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {error && (
              <p className="text-sm rounded-xl px-4 py-3 mb-3" style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => submitImport(columnMap)}
                disabled={!canConfirmMapping || uploading}
                className="flex-1 rounded-xl font-semibold text-sm text-white disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ background: "var(--brand)", height: 48 }}
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : null}
                Continue import
              </button>
            </div>
            <button onClick={() => resetFile(null)} className="mt-3 w-full py-2 text-sm" style={{ color: "var(--text-3)" }}>
              Choose a different file
            </button>
          </>
        ) : (
          <>
            <p className="text-xs mb-4" style={{ color: "var(--text-3)" }}>
              Upload a CSV or Excel (.xlsx) file to add many products at once.
            </p>

            <button
              type="button"
              onClick={downloadTemplate}
              className="text-xs font-semibold mb-4"
              style={{ color: "var(--brand)" }}
            >
              Download CSV template
            </button>

            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => resetFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-xl border px-3 py-3 text-sm outline-none mb-4"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--text)" }}
            />

            {error && (
              <p className="text-sm rounded-xl px-4 py-3 mb-3" style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
                {error}
              </p>
            )}

            {result && (
              <div className="mb-4 rounded-xl p-3 text-xs" style={{ background: "var(--surface-2)" }}>
                <p className="font-semibold mb-1" style={{ color: "var(--text)" }}>
                  {result.created} added, {result.skipped} skipped
                </p>
                {result.errors.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1 max-h-40 overflow-y-auto" style={{ color: "var(--text-3)" }}>
                    {result.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => submitImport()}
                disabled={!file || uploading}
                className="flex-1 rounded-xl font-semibold text-sm text-white disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ background: "var(--brand)", height: 48 }}
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : null}
                Upload
              </button>
            </div>
            <button onClick={onClose} className="mt-3 w-full py-2 text-sm" style={{ color: "var(--text-3)" }}>
              {result ? "Done" : "Cancel"}
            </button>
          </>
        )}
      </div>
    </>
  );
}

// Main page 
export default function InventoryPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "owner";
  const { data: categories = [] } = useApi<Category[]>("/categories/");
  const { data: products = [], isLoading: loading } = useApi<Product[]>("/products/?active_only=false");
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [adjustingStock, setAdjustingStock] = useState<Product | null>(null);

  const formOpen = showAdd || !!editing;

  function reload() {
    return Promise.all([invalidateApi("/categories"), invalidateApi("/products")]);
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Remove "${product.name}" from inventory?`)) return;
    await api.delete(`/products/${product.id}`);
    reload();
  }

  const filtered = products.filter((p) => {
    if (activeCat !== null && p.category_id !== activeCat) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const catMap: Record<number, Category> = {};
  for (const c of categories) catMap[c.id] = c;

  const lowStockCount = products.filter((p) => p.active && p.track_stock && p.stock <= p.min_stock).length;

  const formProps = {
    initial: editing ?? undefined,
    categories,
    products,
    onSave: () => { setShowAdd(false); setEditing(null); reload(); },
    onClose: () => { setShowAdd(false); setEditing(null); },
  };

  return (
    <div className="flex min-h-svh flex-col lg:pl-56 pt-12 lg:pt-0" style={{ background: "var(--bg)" }}>
      <NavBar />

      {/* Header */}
      <header
        className="sticky top-12 lg:top-0 z-20 flex items-center gap-1.5 sm:gap-3 px-4 h-14 border-b"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <span className="font-semibold text-base flex-1 min-w-0 truncate" style={{ color: "var(--text)" }}>
          Inventory
        </span>
        {lowStockCount > 0 && (
          <span
            className="flex items-center gap-1 shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: "var(--warning-light)", color: "var(--warning)" }}
          >
            <AlertTriangle size={11} />
            {lowStockCount}
            <span className="hidden sm:inline"> low</span>
          </span>
        )}
        {canEdit && (
          <>
            <button
              onClick={() => setShowAddCat(true)}
              aria-label="Add category"
              className="flex items-center justify-center gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap text-[11px] sm:text-xs font-medium h-8 px-2 sm:px-3 rounded-lg border"
              style={{ borderColor: "var(--border)", color: "var(--text-2)", background: "var(--surface-2)" }}
            >
              <Tag size={14} className="shrink-0" />
              Category
            </button>
            <button
              onClick={() => setShowImport(true)}
              aria-label="Import products"
              className="flex items-center justify-center gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap text-[11px] sm:text-xs font-medium h-8 px-2 sm:px-3 rounded-lg border"
              style={{ borderColor: "var(--border)", color: "var(--text-2)", background: "var(--surface-2)" }}
            >
              <Upload size={13} className="shrink-0" />
              Import
            </button>
            <button
              onClick={() => { setEditing(null); setShowAdd(true); }}
              aria-label="Add product"
              className="flex items-center justify-center gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap text-[11px] sm:text-sm font-semibold h-8 px-2 sm:px-3 rounded-lg text-white"
              style={{ background: "var(--brand)" }}
            >
              <Plus size={15} className="shrink-0" />
              Product
            </button>
          </>
        )}
      </header>

      {/* Search */}
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div
          className="flex items-center gap-2 rounded-xl px-3 h-9"
          style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)" }}
        >
          <Search size={15} style={{ color: "var(--text-3)" }} className="shrink-0" />
          <input
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
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div
          className="flex gap-2 px-4 py-2.5 no-scrollbar overflow-x-auto border-b"
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
      )}

      {/* ── Content area: list + optional desktop side panel ── */}
      <div className="flex flex-1 overflow-hidden pb-24 lg:pb-6">

        {/* Product list */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {loading ? (
            <div style={{ background: "var(--surface)" }}>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3">
              <Package size={36} strokeWidth={1} style={{ color: "var(--text-3)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-3)" }}>
                {search ? `No products matching "${search}"` : "No products yet"}
              </p>
              {!search && canEdit && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="text-sm font-semibold px-4 py-2 rounded-xl text-white"
                  style={{ background: "var(--brand)" }}
                >
                  Add first product
                </button>
              )}
            </div>
          ) : (
            <div style={{ background: "var(--surface)" }}>
              {filtered.map((p) => {
                const cat = p.category_id ? catMap[p.category_id] : null;
                const isLow = p.active && p.track_stock && p.stock > 0 && p.stock <= p.min_stock;
                const isOut = p.active && p.track_stock && p.stock === 0;
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-4 px-4 py-3.5 border-b last:border-0"
                    style={{ borderColor: "var(--border)", opacity: p.active ? 1 : 0.5 }}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                      style={{
                        background: cat?.color ? `${cat.color}18` : "var(--brand-light)",
                        color: cat?.color ?? "var(--brand-dark)",
                      }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                        {p.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {cat && (
                          <span
                            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                            style={{ background: "var(--surface-2)", color: "var(--text-2)" }}
                          >
                            {cat.color && (
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: cat.color }} />
                            )}
                            {cat.name}
                          </span>
                        )}
                        {p.pricing_mode === "unit" && p.unit_label && (
                          <span className="text-xs" style={{ color: "var(--text-3)" }}>
                            {p.unit_label}
                          </span>
                        )}
                        {p.track_stock ? (
                          <span
                            className="flex items-center gap-1 text-xs"
                            style={{ color: isOut ? "var(--danger)" : isLow ? "var(--warning)" : "var(--text-3)" }}
                          >
                            {isOut && <AlertTriangle size={11} />}
                            {isOut
                              ? "Out of stock"
                              : isLow
                              ? `${p.stock} left (low)`
                              : `${p.stock}${p.pricing_mode === "weight" ? " kg" : ""} in stock`}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--text-3)" }}>
                            Stock not tracked
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
                        {fmtKES(p.price)}{p.pricing_mode === "weight" ? "/kg" : ""}
                      </p>
                      {p.buying_price > 0 && (() => {
                        const margin = Math.round(((p.price - p.buying_price) / p.price) * 100);
                        return (
                          <p className="text-[11px] font-medium mt-0.5" style={{ color: margin >= 0 ? "var(--brand-dark)" : "var(--danger)" }}>
                            {margin}% margin
                          </p>
                        );
                      })()}
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        {p.track_stock && (
                          <button
                            onClick={() => setAdjustingStock(p)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                            style={{ color: "var(--text-3)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--brand)")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
                            title="Adjust stock"
                          >
                            <PackagePlus size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => setEditing(p)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                          style={{ color: "var(--text-3)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--brand)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                          style={{ color: "var(--text-3)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Desktop: inline right panel — no overlay, no backdrop */}
        {formOpen && (
          <aside
            className="hidden lg:flex flex-col w-80 shrink-0 border-l overflow-y-auto"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <ProductFormContent {...formProps} />
          </aside>
        )}
      </div>

      {/* Mobile: bottom sheet — only on small screens */}
      {formOpen && (
        <div className="lg:hidden">
          <ProductFormSheet {...formProps} />
        </div>
      )}

      {adjustingStock && (
        <StockAdjustSheet
          product={adjustingStock}
          onSave={() => { setAdjustingStock(null); reload(); }}
          onClose={() => setAdjustingStock(null)}
        />
      )}

      {showAddCat && (
        <CategoryForm
          onSave={() => { setShowAddCat(false); reload(); }}
          onClose={() => setShowAddCat(false)}
        />
      )}

      {showImport && (
        <ImportSheet
          onSave={reload}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
