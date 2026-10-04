/**
 * GST tax-invoice generation for Indian B2B SaaS.
 *
 * A restaurant paying for software needs a tax invoice carrying its own GSTIN —
 * without one it cannot claim input credit, so "just send an invoice" is not a
 * formality. This module builds that invoice as a self-contained HTML document
 * that can be printed to PDF from the browser; nothing is stored and no
 * third-party document service is required.
 *
 * Deliberately hand-rolled rather than pulled from a library: the calculation
 * rules below are small, testable, and were the part most likely to be wrong.
 *
 * Scope and limits, stated plainly:
 *  - Intra-state supply (the common case: a vendor and a customer in the same
 *    state) is CGST + SGST, split evenly. Interstate is IGST at the full rate.
 *  - This is NOT an e-invoice. E-invoicing to the IRP is only mandatory above
 *    ₹5 crore aggregate turnover (FY 2026-27), and a GSTIN supplied by a
 *    customer on a self-declared basis is explicitly NOT a GST e-invoice.
 *  - Place-of-supply is taken from the customer's GSTIN state code.
 */

/** GST rates actually used by SaaS / software services in India. */
export const GST_RATES = { EXEMPT: 0, ZERO: 0, STANDARD: 18 } as const;

/** The two-digit state code that prefixes every GSTIN. */
const STATE_CODES: Record<string, string> = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
  "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana", "07": "Delhi",
  "08": "Rajasthan", "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim",
  "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur", "15": "Mizoram",
  "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh",
  "24": "Gujarat", "26": "Dadra & Nagar Haveli and Daman & Diu", "27": "Maharashtra",
  "29": "Karnataka", "30": "Goa", "31": "Lakshadweep", "32": "Kerala",
  "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman & Nicobar Islands",
  "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh", "97": "Other Territory",
};

export interface InvoiceParty {
  name: string;
  /** GSTIN of the CUSTOMER. Required for a B2B tax invoice. */
  gstin: string;
  address?: string;
  email?: string;
}

export interface InvoiceLine {
  description: string;
  /** Amount in minor units (paise) to stay consistent with subscriptions. */
  amountInr: number;
}

export interface InvoiceInput {
  invoiceNumber: string;
  issuedOn: string;
  supplier: InvoiceParty;
  customer: InvoiceParty;
  /** State code of the SUPPLIER, taken from the supplier's own GSTIN. */
  supplierStateCode: string;
  lines: InvoiceLine[];
  /** Defaults to 18 — the standard SaaS rate. */
  ratePercent?: number;
  reverseCharge?: boolean;
}

export interface InvoiceTotals {
  taxableValueInr: number;
  ratePercent: number;
  cgstInr: number;
  sgstInr: number;
  igstInr: number;
  totalInr: number;
  intraState: boolean;
}

export interface Invoice extends InvoiceInput {
  totals: InvoiceTotals;
  stateName: string;
  reverseCharge: boolean;
}

const paiseToRupees = (paise: number) => Math.round(paise) / 100;

export function formatInr(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Computes GST on a set of lines.
 *
 * CGST and SGST are each half the tax for an intra-state supply; interstate is
 * a single IGST line at the full rate. Money is rounded to whole paise at each
 * step so the invoice total always equals the sum of its parts.
 */
export function computeInvoiceTotals(input: InvoiceInput): InvoiceTotals {
  // EVERYTHING below is computed in paise (integers) and converted to rupees
  // only at the very end. Doing the split in floating rupees loses paise:
  // Math.floor(89.91 / 2) is 44, not 44.955, so CGST and SGST stop re-summing
  // to the tax actually charged.
  const taxablePaise = Math.round(
    input.lines.reduce((sum, l) => sum + (Number(l.amountInr) || 0), 0)
  );

  const customerState = (input.customer.gstin || "").slice(0, 2).toUpperCase();
  const supplierState = (input.supplierStateCode || "").padStart(2, "0").toUpperCase();
  const intraState = customerState === supplierState;

  const ratePercent = input.ratePercent ?? GST_RATES.STANDARD;
  // The rate is a percentage of the taxable value, so paise * percent / 100.
  // Rs 999 at 18% is exactly Rs 179.82 — never Rs 180, and never Rs 17,982.
  const taxPaise = Math.round((taxablePaise * ratePercent) / 100);

  // Half of an odd paise goes to CGST, the remainder to SGST, so the two always
  // re-sum to the exact tax charged.
  const cgstPaise = Math.floor(taxPaise / 2);
  const sgstPaise = taxPaise - cgstPaise;

  const toRupees = (paise: number) => paise / 100;

  return {
    taxableValueInr: toRupees(taxablePaise),
    ratePercent,
    cgstInr: intraState ? toRupees(cgstPaise) : 0,
    sgstInr: intraState ? toRupees(sgstPaise) : 0,
    igstInr: intraState ? 0 : toRupees(taxPaise),
    totalInr: toRupees(taxablePaise + taxPaise),
    intraState,
  };
}

/** Builds a complete, printable invoice. Throws only on obviously unusable input. */
export function buildInvoice(input: InvoiceInput): Invoice {
  if (!input.invoiceNumber?.trim()) throw new Error("Invoice number is required");
  if (!input.supplier?.gstin) throw new Error("Supplier GSTIN is required");
  if (!input.customer?.gstin) throw new Error("Customer GSTIN is required");
  if (!input.lines?.length) throw new Error("Invoice needs at least one line");
  if (!input.supplierStateCode) throw new Error("Supplier state code is required");

  const totals = computeInvoiceTotals(input);
  const customerState = input.customer.gstin.slice(0, 2).toUpperCase();

  return {
    ...input,
    ratePercent: totals.ratePercent,
    reverseCharge: input.reverseCharge ?? false,
    totals,
    stateName: STATE_CODES[customerState] || `State code ${customerState}`,
  };
}

/**
 * Renders the invoice as a standalone HTML document.
 *
 * Every interpolated value passes through `escapeHtml`. Customer name, address
 * and GSTIN are operator-supplied free text, so they must never reach markup
 * unescaped.
 */
export function renderInvoiceHtml(invoice: Invoice): string {
  const esc = (v: unknown) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const t = invoice.totals;
  const taxRows = t.intraState
    ? [
        ["CGST", `${t.ratePercent / 2}%`, formatInr(t.cgstInr)],
        ["SGST", `${t.ratePercent / 2}%`, formatInr(t.sgstInr)],
      ]
    : [["IGST", `${t.ratePercent}%`, formatInr(t.igstInr)]];

  const lineRows = invoice.lines
    .map(
      (l, i) => `<tr>
        <td>${i + 1}</td>
        <td>${esc(l.description)}</td>
        <td class="num">${formatInr(paiseToRupees(Number(l.amountInr) || 0))}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>Tax Invoice ${esc(invoice.invoiceNumber)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color:#18181b; margin:0; padding:32px; background:#fff; }
  .wrap { max-width:760px; margin:0 auto; }
  h1 { font-size:22px; margin:0 0 4px; letter-spacing:-0.5px; }
  .muted { color:#71717a; font-size:13px; }
  .head { display:flex; justify-content:space-between; gap:24px; border-bottom:2px solid #18181b; padding-bottom:16px; margin-bottom:20px; }
  .box { border:1px solid #e4e4e7; border-radius:10px; padding:14px; }
  .box h2 { font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:#71717a; margin:0 0 6px; }
  table { width:100%; border-collapse:collapse; margin:16px 0; font-size:14px; }
  th, td { padding:9px 8px; border-bottom:1px solid #f4f4f5; text-align:left; }
  th { font-size:11px; text-transform:uppercase; letter-spacing:0.06em; color:#71717a; }
  td.num, th.num { text-align:right; font-variant-numeric:tabular-nums; }
  .totals { margin-left:auto; width:280px; font-size:14px; }
  .totals div { display:flex; justify-content:space-between; padding:5px 0; }
  .grand { border-top:2px solid #18181b; margin-top:6px; padding-top:9px; font-weight:700; font-size:16px; }
  .note { margin-top:22px; padding:12px; background:#fafafa; border:1px solid #e4e4e7; border-radius:10px; font-size:12px; color:#52525b; line-height:1.6; }
  @media print { body { padding:0; } .noprint { display:none; } }
</style></head>
<body><div class="wrap">
  <div class="head">
    <div>
      <h1>Tax Invoice</h1>
      <div class="muted">${esc(invoice.invoiceNumber)} &middot; ${esc(invoice.issuedOn)}</div>
    </div>
    <div style="text-align:right">
      <div class="muted">Amount charged</div>
      <div style="font-size:18px;font-weight:700">${formatInr(t.totalInr)}</div>
    </div>
  </div>

  <div style="display:flex;gap:16px;flex-wrap:wrap">
    <div class="box" style="flex:1;min-width:260px">
      <h2>Supplier</h2>
      <div style="font-weight:600">${esc(invoice.supplier.name)}</div>
      <div>GSTIN: ${esc(invoice.supplier.gstin)}</div>
      ${invoice.supplier.address ? `<div class="muted">${esc(invoice.supplier.address)}</div>` : ""}
    </div>
    <div class="box" style="flex:1;min-width:260px">
      <h2>Bill to</h2>
      <div style="font-weight:600">${esc(invoice.customer.name)}</div>
      <div>GSTIN: ${esc(invoice.customer.gstin)}</div>
      ${invoice.customer.address ? `<div class="muted">${esc(invoice.customer.address)}</div>` : ""}
      <div class="muted">Place of supply: ${esc(invoice.stateName)} (${esc(invoice.customer.gstin.slice(0, 2))})</div>
    </div>
  </div>

  <table>
    <thead><tr><th style="width:34px">#</th><th>Description</th><th class="num">Amount</th></tr></thead>
    <tbody>${lineRows}</tbody>
  </table>

  <div class="totals">
    <div><span>Taxable value</span><span>${formatInr(t.taxableValueInr)}</span></div>
    ${taxRows.map(([label, rate, amt]) => `<div><span>${label} @ ${rate}</span><span>${amt}</span></div>`).join("")}
    ${invoice.reverseCharge ? `<div><span>Reverse charge</span><span>Yes</span></div>` : ""}
    <div class="grand"><span>Total</span><span>${formatInr(t.totalInr)}</span></div>
  </div>

  <div class="note">
    ${invoice.reverseCharge ? "<b>Reverse charge applies.</b> " : ""}
    ${t.intraState
      ? "Intra-state supply: CGST and SGST charged at half the GST rate each."
      : "Inter-state supply: IGST charged at the full GST rate."}
    GST rate ${t.ratePercent}%.
    This is a self-generated tax invoice and <b>not</b> a GST e-invoice. E-invoicing
    to the IRP is mandatory only above &#8377;5 crore aggregate turnover.
  </div>
</div></body></html>`;
}
