import test from "node:test";
import assert from "node:assert/strict";
import {
  buildInvoice,
  computeInvoiceTotals,
  renderInvoiceHtml,
  formatInr,
  GST_RATES,
  InvoiceInput,
} from "../lib/invoice";

const base: InvoiceInput = {
  invoiceNumber: "INV-001",
  issuedOn: "2026-10-04",
  supplier: { name: "SayaLabs", gstin: "29ABCDE1234F1Z5", address: "Bengaluru" },
  customer: { name: "Third Wave Coffee", gstin: "29XYZUV9876H1Z2" },
  supplierStateCode: "29",
  lines: [{ description: "Credo Pro — monthly", amountInr: 99900 }],
};

test("intra-state supply splits GST evenly into CGST and SGST", () => {
  const t = computeInvoiceTotals(base);
  assert.equal(t.intraState, true);
  assert.equal(t.taxableValueInr, 999);
  assert.equal(t.cgstInr, 89.91);
  assert.equal(t.sgstInr, 89.91);
  assert.equal(t.igstInr, 0);
  assert.equal(t.totalInr, 1178.82);
  assert.equal(t.cgstInr + t.sgstInr, 179.82, "the split re-sums to the tax");
});

test("inter-state supply charges a single IGST at the full rate", () => {
  const t = computeInvoiceTotals({
    ...base,
    // Customer GSTIN state code 07 = Delhi, supplier is 29 (Karnataka)
    customer: { ...base.customer, gstin: "07XYZUV9876H1Z2" },
  });
  assert.equal(t.intraState, false);
  assert.equal(t.cgstInr, 0);
  assert.equal(t.sgstInr, 0);
  assert.equal(t.igstInr, 179.82);
  assert.equal(t.totalInr, 1178.82, "total is identical either way — only the split differs");
});

test("CGST + SGST always re-sums to the exact tax, even on an odd paisa", () => {
  // 999.99 at 18% = 179.9982 -> 180 paise... in rupees terms, force an odd split.
  for (const amountInr of [1, 7, 99, 999, 99999, 123457]) {
    const t = computeInvoiceTotals({ ...base, lines: [{ description: "x", amountInr }] });
    // Compare in paise: the tax is rounded once, then split, so the two halves
    // must re-sum to exactly that rounded figure.
    const taxPaise = Math.round((amountInr * 18) / 100);
    const splitPaise = Math.round((t.cgstInr + t.sgstInr) * 100);
    if (t.intraState) {
      assert.equal(splitPaise, taxPaise, `split must re-sum for ${amountInr} paise`);
    } else {
      assert.equal(Math.round(t.igstInr * 100), taxPaise);
    }
    assert.equal(Math.round(t.totalInr * 100), amountInr + taxPaise, `total for ${amountInr}`);
  }
});

test("taxable value and total never carry floating-point drift", () => {
  const t = computeInvoiceTotals({
    ...base,
    lines: [
      { description: "Solo", amountInr: 99900 },
      { description: "Add-on", amountInr: 10000 },
      { description: "Adjustment", amountInr: 1 },
    ],
  });
  // 999.00 + 100.00 + 0.01 = 1099.01
  assert.equal(t.taxableValueInr, 1099.01);
  // 1099.01 at 18% = 197.8218 -> 197.82 to the paisa
  assert.equal(t.cgstInr + t.sgstInr, 197.82);
  assert.equal(t.totalInr, 1296.83);
  assert.equal(Number.isInteger(t.totalInr * 100), true, "total must land on whole paise");
});

test("an annual invoice bills one line, not twelve", () => {
  const annual = computeInvoiceTotals({
    ...base,
    lines: [{ description: "Credo Pro — annual", amountInr: 99900 * 10 }],
  });
  assert.equal(annual.taxableValueInr, 9990);
  assert.equal(annual.cgstInr + annual.sgstInr, 1798.2);
  assert.equal(annual.totalInr, 11788.2);
});

test("buildInvoice rejects input that cannot produce a valid tax invoice", () => {
  assert.throws(() => buildInvoice({ ...base, invoiceNumber: "" }), /Invoice number/);
  assert.throws(
    () => buildInvoice({ ...base, supplier: { ...base.supplier, gstin: "" } }),
    /Supplier GSTIN/
  );
  assert.throws(
    () => buildInvoice({ ...base, customer: { ...base.customer, gstin: "" } }),
    /Customer GSTIN/
  );
  assert.throws(() => buildInvoice({ ...base, lines: [] }), /at least one line/);
  assert.throws(() => buildInvoice({ ...base, supplierStateCode: "" }), /state code/);
});

test("the place of supply comes from the customer's GSTIN state code", () => {
  const delhi = buildInvoice({
    ...base,
    customer: { ...base.customer, gstin: "07XYZUV9876H1Z2" },
  });
  assert.equal(delhi.stateName, "Delhi");

  const karnataka = buildInvoice(base);
  assert.equal(karnataka.stateName, "Karnataka");
});

test("customer-supplied text cannot inject markup into the invoice", () => {
  const hostile = buildInvoice({
    ...base,
    customer: {
      name: "<script>alert('xss')</script>",
      gstin: "29XYZUV9876H1Z2",
      address: '"><img src=x onerror=alert(1)>',
    },
  });
  const html = renderInvoiceHtml(hostile);

  // What matters is that no LIVE tag reaches the document. The payload may
  // still appear as inert escaped text (the literal substring "onerror="
  // survives inside `&lt;img ... &gt;`), which is correct and harmless.
  assert.equal(/<script/i.test(html), false, "no live script tag");
  assert.equal(/<img/i.test(html), false, "no live img tag");
  assert.ok(html.includes("&lt;script&gt;"), "payload survives as inert text");
  // The document itself must still be a valid single invoice page.
  assert.ok(html.startsWith("<!DOCTYPE html>"));
  assert.equal((html.match(/<html/g) || []).length, 1, "no injected second document");
});

test("a GSTIN containing markup is escaped in the rendered invoice", () => {
  const hostile = buildInvoice({
    ...base,
    supplier: { ...base.supplier, gstin: "<b>29BAD</b>" },
  });
  const html = renderInvoiceHtml(hostile);
  assert.ok(html.includes("&lt;b&gt;29BAD&lt;/b&gt;"));
  assert.equal(html.includes("<b>29BAD</b>"), false);
});

test("reverse charge is surfaced on the invoice", () => {
  const rc = buildInvoice({ ...base, reverseCharge: true });
  assert.equal(rc.reverseCharge, true);
  assert.ok(renderInvoiceHtml(rc).includes("Reverse charge applies"));
});

test("the GST rate defaults to the standard SaaS rate and is overridable", () => {
  assert.equal(GST_RATES.STANDARD, 18);
  assert.equal(computeInvoiceTotals(base).ratePercent, 18);

  const exempt = computeInvoiceTotals({ ...base, ratePercent: 0 });
  assert.equal(exempt.totalInr, 999, "an exempt supply adds no tax");
  assert.equal(exempt.cgstInr, 0);
  assert.equal(exempt.sgstInr, 0);
});

test("rupee formatting uses the Indian digit grouping", () => {
  assert.equal(formatInr(1178.82), "₹1,178.82");
  assert.equal(formatInr(100000), "₹1,00,000.00");
});

test("the invoice states plainly that it is not a GST e-invoice", () => {
  // A self-declared GSTIN is explicitly not an e-invoice; saying so on the
  // document is what keeps it honest.
  assert.ok(renderInvoiceHtml(buildInvoice(base)).includes("not</b> a GST e-invoice"));
});
