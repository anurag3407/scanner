import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY is not configured. Email notification skipped.");
    return null;
  }
  resendClient = new Resend(apiKey);
  return resendClient;
}

export interface LowRatingEmailParams {
  /** Owner inboxes that should be alerted. At least one address is required. */
  toEmails: string[];
  storeName: string;
  rating: number;
  tableNumber?: string;
  customerName?: string;
  customerContact?: string;
  message: string;
}

/**
 * Escapes text before it is interpolated into the HTML email body.
 *
 * Customer-controlled fields (name, contact, table number, free-text message)
 * reach this function verbatim from the public firewall form. Without
 * escaping, a diner could inject arbitrary HTML/CSS into the owner's inbox —
 * phishing links, tracking pixels, fake brand headers, or hidden markup used to
 * bury or rewrite the alert.
 */
function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Coerces the caller-supplied rating to a bounded integer in [1, 5].
 *
 * The star row and the "n / 5 Stars" caption must be derived from the SAME
 * normalized value. Deriving them separately is what allowed a non-numeric or
 * out-of-range rating to be interpolated into the HTML raw (`repeat` of NaN
 * yields an empty string, so the star row silently vanished while the caption
 * still echoed the attacker's text).
 */
function normalizeRating(value: unknown): number {
  const n =
    typeof value === "number"
      ? Math.trunc(value)
      : Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(n)) return 1;
  return Math.min(5, Math.max(1, n));
}

/**
 * Pure builder for the "Reputation Firewall" low-rating alert body.
 *
 * Extracted from {@link sendLowRatingAlertEmail} so the escaping guarantees can
 * be asserted directly against real attacker payloads, without dispatching
 * mail. This function performs no I/O and has no side effects.
 *
 * SECURITY CONTRACT: every value that originates from the public anonymous
 * form (storeName, tableNumber, customerName, customerContact, message) plus
 * the recipient list must pass through `escapeHtml` before interpolation.
 * `rating` is never interpolated raw — it is normalized to a bounded integer
 * first, so the numeric type in `LowRatingEmailParams` is not the only thing
 * standing between a caller and an HTML injection.
 */
export function buildLowRatingAlertHtml(
  params: LowRatingEmailParams,
  recipients: string[]
): string {
  const { storeName, tableNumber, customerName, customerContact, message } = params;

  const rating = normalizeRating(params.rating);
  const stars = "⭐".repeat(rating);
  // Escaped once here, then reused as a plain-text fragment in the body copy.
  const safeStoreName = escapeHtml(storeName);
  const safeTableNumber = escapeHtml(tableNumber);
  const safeCustomerName = escapeHtml(customerName);
  const safeCustomerContact = escapeHtml(customerContact);
  const safeMessage = escapeHtml(message);
  const safeRecipientList = escapeHtml(
    (Array.isArray(recipients) ? recipients : []).filter(Boolean).join(", ")
  );
  const tableLabel = tableNumber ? `Table #${safeTableNumber}` : "Dine-in Guest";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reputation Firewall Alert</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px; color: #18181b; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e4e4e7; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #dc2626; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-top: 8px; }
    .content { padding: 24px; }
    .card { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
    .stars { font-size: 24px; margin-bottom: 8px; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .info-table td { padding: 10px 12px; border-bottom: 1px solid #f4f4f5; font-size: 14px; }
    .info-table td.label { font-weight: 600; color: #71717a; width: 130px; }
    .info-table td.value { font-weight: 500; color: #09090b; }
    .message-box { background: #f4f4f5; border-radius: 10px; padding: 16px; font-size: 14px; line-height: 1.5; color: #27272a; margin-top: 10px; border-left: 4px solid #ef4444; }
    .footer { padding: 20px 24px; background: #fafafa; border-top: 1px solid #f4f4f5; font-size: 12px; color: #71717a; text-align: center; line-height: 1.5; }
    .cta-note { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; border-radius: 10px; padding: 12px; font-size: 13px; font-weight: 500; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Low Rating Intercepted</h1>
      <p>A customer just submitted a negative review on your table scanner</p>
      <div class="badge">Shielded from Google Maps</div>
    </div>
    <div class="content">
      <div class="card">
        <div class="stars">${stars} (${rating} / 5 Stars)</div>
        <div style="font-size: 13px; color: #991b1b; font-weight: 600;">
          This complaint was kept PRIVATE. The diner was NOT directed to Google Reviews.
        </div>
      </div>

      <table class="info-table">
        <tr>
          <td class="label">Restaurant:</td>
          <td class="value"><strong>${safeStoreName}</strong></td>
        </tr>
        <tr>
          <td class="label">Location / Table:</td>
          <td class="value">${tableLabel}</td>
        </tr>
        <tr>
          <td class="label">Customer Name:</td>
          <td class="value">${safeCustomerName || "Anonymous Diner"}</td>
        </tr>
        <tr>
          <td class="label">Customer Contact:</td>
          <td class="value"><strong>${safeCustomerContact || "Not provided"}</strong></td>
        </tr>
        <tr>
          <td class="label">Time:</td>
          <td class="value">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</td>
        </tr>
      </table>

      <div style="font-size: 13px; font-weight: 700; color: #09090b; text-transform: uppercase; letter-spacing: 0.5px;">Customer Feedback:</div>
      <div class="message-box">
        "${safeMessage || "Customer selected low rating without custom note."}"
      </div>

      <div class="cta-note">
        💡 <strong>Action Required:</strong> If the customer is still seated at ${tableLabel}, visit them immediately with a quick apology or complimentary dessert to resolve this on-site before they leave!
      </div>
    </div>
    <div class="footer">
      Powered by <strong>Credo Scanner</strong> &bull; Reputation Protection System<br>
      Automated alert sent to ${safeRecipientList}
    </div>
  </div>
</body>
</html>
  `.trim();
}

export async function sendLowRatingAlertEmail(params: LowRatingEmailParams): Promise<{ success: boolean; error?: string }> {
  const { toEmails, storeName, rating, tableNumber } = params;
  const recipients = (toEmails || []).filter(Boolean);

  if (recipients.length === 0) {
    console.warn("No owner email configured for this store. Email notification skipped.");
    return { success: false, error: "Missing recipient email" };
  }

  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: "Resend not initialized" };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || "Credo Scanner <reviews@sayalabs.in>";
  const html = buildLowRatingAlertHtml(params, recipients);

  try {
    const response = await resend.emails.send({
      from: fromEmail,
      to: recipients,
      // Header-injection safe: Resend takes a plain string, and a subject is
      // never rendered as markup, so the raw store name is fine here.
      subject: `🚨 [Urgent] ${rating}★ Alert at ${storeName} (${tableNumber ? `Table #${tableNumber}` : "Dine-in Guest"})`,
      html,
    });

    if (response.error) {
      console.error("Resend error sending email:", response.error);
      return { success: false, error: response.error.message };
    }

    console.log(`Alert email sent successfully to ${recipients.join(", ")} (ID: ${response.data?.id})`);
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Exception while sending alert email via Resend:", errorMsg);
    return { success: false, error: errorMsg };
  }
}
