import { NextResponse } from "next/server";
import { getSubscriptions, getStoreById } from "@/lib/store";
import { getPayments } from "@/lib/billing-data";
import { assertAdminAuth, scopedStoreIds } from "@/lib/auth";
import { buildInvoice, renderInvoiceHtml } from "@/lib/invoice";
import { isValidGstin } from "@/lib/validation";

/**
 * Renders a GST tax invoice for a recorded subscription.
 *
 * Returns a self-contained HTML document so the operator can print it to PDF
 * from the browser. This is the artefact an Indian restaurant needs to claim
 * input credit — without it, "just pay us" stalls the sale at month one.
 *
 * Supplier identity comes from the environment, never from the request body: a
 * caller must not be able to render an invoice claiming to come from someone
 * else.
 */
export async function GET(req: Request) {
  const auth = await assertAdminAuth();
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId") || "";
    if (!storeId) {
      return NextResponse.json({ error: "storeId is required" }, { status: 400 });
    }

    const scope = scopedStoreIds(auth.user);
    if (scope !== null && !scope.includes(storeId)) {
      return NextResponse.json(
        { error: "You do not have access to this location." },
        { status: 403 }
      );
    }

    const [subscription] = await getSubscriptions([storeId]);
    if (!subscription) {
      return NextResponse.json(
        { error: "No subscription recorded for this location yet." },
        { status: 404 }
      );
    }

    const customerGstin = subscription.gstin;
    if (!customerGstin) {
      return NextResponse.json(
        {
          error:
            "This location has no GSTIN on file. Record one before generating a tax invoice.",
        },
        { status: 400 }
      );
    }

    const supplierGstin = (process.env.SUPPLIER_GSTIN || "").trim().toUpperCase();
    if (!isValidGstin(supplierGstin)) {
      return NextResponse.json(
        {
          error:
            "Supplier GSTIN is not configured. Set SUPPLIER_GSTIN to your own 15-character GSTIN before generating invoices.",
        },
        { status: 503 }
      );
    }

    const store = await getStoreById(storeId);
    const started = new Date(subscription.startedAt);
    const period =
      subscription.billingPeriod === "annual"
        ? String(started.getFullYear())
        : started.toISOString().slice(0, 7);

    /**
     * What to invoice.
     *
     * The stored subscription carries a MONTHLY recurring figure, so billing an
     * annual subscriber from it would invoice one twelfth of what they paid. The
     * last captured payment is the authoritative, pre-tax, post-discount amount,
     * so that is what the invoice line uses when one exists. Only a
     * hand-recorded subscription (no payment row) falls back to the monthly
     * figure on the subscription itself.
     */
    const lastPaid = (await getPayments(storeId)).find((p) => p.status === "paid");
    const lastPaidNet = lastPaid ? lastPaid.grossInr - lastPaid.discountInr : 0;
    const taxableInr = lastPaid ? Math.max(0, lastPaidNet) : subscription.mrrInr;
    // The tax rate that was actually charged (a plan can carry a GST percent of
    // its own), falling back to the 18% SaaS default when nothing was captured.
    const chargedRate =
      lastPaid && lastPaidNet > 0
        ? Math.round((lastPaid.taxInr / lastPaidNet) * 100 * 100) / 100
        : undefined;

    const invoice = buildInvoice({
      invoiceNumber:
        searchParams.get("invoiceNumber") || `INV-${storeId}-${period}`.slice(0, 64),
      issuedOn: new Date().toISOString().slice(0, 10),
      supplier: {
        name: process.env.SUPPLIER_NAME || "SayaLabs",
        gstin: supplierGstin,
        address: process.env.SUPPLIER_ADDRESS,
      },
      customer: {
        name: store?.name || "Customer",
        gstin: customerGstin,
        address: store?.address,
      },
      supplierStateCode: supplierGstin.slice(0, 2),
      ...(chargedRate !== undefined ? { ratePercent: chargedRate } : {}),
      lines: [
        {
          description: `Credo ${subscription.plan} plan — ${
            subscription.billingPeriod === "annual"
              ? `annual (${period})`
              : `monthly (${period})`
          }${lastPaid && lastPaid.couponCode ? ` — coupon ${lastPaid.couponCode} applied` : ""}`,
          amountInr: taxableInr,
        },
      ],
    });

    return new NextResponse(renderInvoiceHtml(invoice), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Failed to render invoice", err);
    return NextResponse.json({ error: "Failed to generate invoice" }, { status: 500 });
  }
}
