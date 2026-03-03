const BRAND_NAME = "Evently";

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

type EmailTemplateInput = {
    title: string;
    subtitle?: string;
    preheader?: string;
    highlight?: string;
    contentLines?: string[];
    footerNote?: string;
    ctaLabel?: string;
    ctaUrl?: string;
};

export function renderEmailTemplate(input: EmailTemplateInput) {
    const title = escapeHtml(input.title);
    const subtitle = input.subtitle ? escapeHtml(input.subtitle) : "";
    const preheader = input.preheader ? escapeHtml(input.preheader) : "";
    const highlight = input.highlight ? escapeHtml(input.highlight) : "";
    const footerNote = input.footerNote
        ? escapeHtml(input.footerNote)
        : "This email was sent by Evently.";

    const contentLines = (input.contentLines ?? []).map((line) => escapeHtml(line));
    const ctaLabel = input.ctaLabel ? escapeHtml(input.ctaLabel) : "";
    const ctaUrl = input.ctaUrl ? escapeHtml(input.ctaUrl) : "";

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      body { margin: 0; padding: 0; background-color: #f5f7fb; font-family: "Segoe UI", Arial, sans-serif; }
      .wrapper { width: 100%; padding: 24px 12px; background-color: #f5f7fb; }
      .container { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08); }
      .header { background: linear-gradient(120deg, #3b82f6, #0ea5e9); color: #ffffff; padding: 28px 32px; }
      .brand { font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
      .header-title { margin: 12px 0 4px; font-size: 24px; font-weight: 700; }
      .header-subtitle { margin: 0; font-size: 14px; opacity: 0.85; }
      .content { padding: 28px 32px 20px; color: #0f172a; }
      .highlight { margin: 20px 0; padding: 16px; border-radius: 12px; background: #f1f5f9; text-align: center; font-size: 24px; letter-spacing: 4px; font-weight: 700; color: #0f172a; }
      .line { margin: 0 0 12px; font-size: 15px; color: #334155; }
      .cta { margin: 20px 0 10px; }
      .cta a { display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 600; }
      .footer { padding: 16px 32px 28px; color: #64748b; font-size: 12px; }
      .preheader { display: none; max-height: 0; overflow: hidden; color: transparent; opacity: 0; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="preheader">${preheader}</div>
      <div class="container">
        <div class="header">
          <div class="brand">${BRAND_NAME}</div>
          <div class="header-title">${title}</div>
          ${subtitle ? `<div class="header-subtitle">${subtitle}</div>` : ""}
        </div>
        <div class="content">
          ${highlight ? `<div class="highlight">${highlight}</div>` : ""}
          ${contentLines.map((line) => `<p class="line">${line}</p>`).join("")}
          ${
              ctaLabel && ctaUrl
                  ? `<div class="cta"><a href="${ctaUrl}" target="_blank" rel="noopener">${ctaLabel}</a></div>`
                  : ""
          }
        </div>
        <div class="footer">${footerNote}</div>
      </div>
    </div>
  </body>
</html>`;
}

export function buildOtpEmail(input: { otp: string; expiresMinutes: number }) {
    const subject = "Verify your Evently account";
    const text = `Your Evently verification code is ${input.otp}. It expires in ${input.expiresMinutes} minutes.`;
    const html = renderEmailTemplate({
        title: "Verify your account",
        subtitle: "Secure your Evently account in minutes.",
        preheader: `Your verification code is ${input.otp}`,
        highlight: input.otp,
        contentLines: [
            `Use this one-time code to verify your email address.`,
            `This code expires in ${input.expiresMinutes} minutes.`,
        ],
        footerNote: "If you did not request this code, you can ignore this email.",
    });
    return { subject, text, html };
}

export function buildQuoteApprovedEmail(input: {
    recipientName?: string;
    counterpartName?: string;
    eventTitle?: string;
    eventDate?: string;
    amount?: number;
    inclusions?: string[];
    roleLabel: "Customer" | "Vendor";
}) {
    const subject = "Quote approved on Evently";
    const lines: string[] = [];
    if (input.recipientName) {
        lines.push(`Hi ${input.recipientName},`);
    }
    lines.push(`Great news! The quote has been fully approved and your booking is now confirmed.`);
    if (input.eventTitle || input.eventDate) {
        lines.push(
            `Event: ${input.eventTitle ?? "Event"}${input.eventDate ? ` • ${input.eventDate}` : ""}`,
        );
    }
    if (input.counterpartName) {
        lines.push(`${input.roleLabel} contact: ${input.counterpartName}`);
    }
    if (typeof input.amount === "number") {
        lines.push(`Approved total: NPR ${input.amount.toLocaleString()}`);
    }
    if (input.inclusions && input.inclusions.length) {
        lines.push(`Included items: ${input.inclusions.join(", ")}`);
    }

    const html = renderEmailTemplate({
        title: "Quote approved",
        subtitle: "Both parties accepted the final pricing and inclusions.",
        preheader: "Your Evently booking is confirmed",
        contentLines: lines,
        footerNote: "You can continue the conversation in Evently if you need adjustments.",
    });

    return { subject, text: lines.join("\n"), html };
}
