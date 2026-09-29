import "server-only";

// Sends email through Postmark (https://postmarkapp.com). Without a
// POSTMARK_SERVER_TOKEN, emails are printed to the server log instead so the
// site works in development.

export type EmailKind = "forum" | "announcements" | "account";

export type OutgoingEmail = {
  to: string;
  subject: string;
  text: string;
  // Needed for forum and announcement mail so people can opt out.
  unsubscribeToken?: string;
  kind: EmailKind;
};

export function siteUrl(path = "") {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return base + path;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function toPostmark(email: OutgoingEmail) {
  const unsubscribe =
    email.unsubscribeToken && email.kind !== "account"
      ? siteUrl(`/unsubscribe?token=${email.unsubscribeToken}&type=${email.kind}`)
      : null;

  const footer = unsubscribe
    ? `\n\n—\nBand of Brothers Sisters and Friends\nStop these emails: ${unsubscribe}`
    : `\n\n—\nBand of Brothers Sisters and Friends`;

  const html =
    `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5">` +
    escapeHtml(email.text).replace(/\n/g, "<br>") +
    `<hr><p style="color:#555;font-size:13px">Band of Brothers Sisters and Friends` +
    (unsubscribe ? `<br><a href="${escapeHtml(unsubscribe)}">Stop these emails</a>` : "") +
    `</p></div>`;

  const headers = unsubscribe
    ? [
        { Name: "List-Unsubscribe", Value: `<${siteUrl(`/unsubscribe/one-click?token=${email.unsubscribeToken}&type=${email.kind}`)}>` },
        { Name: "List-Unsubscribe-Post", Value: "List-Unsubscribe=One-Click" },
      ]
    : [];

  return {
    From: process.env.EMAIL_FROM ?? "BOBSF <no-reply@example.org>",
    To: email.to,
    Subject: email.subject,
    TextBody: email.text + footer,
    HtmlBody: html,
    Headers: headers,
    // Postmark keeps bulk mail on a separate stream so it can't hurt
    // delivery of login and approval emails.
    MessageStream:
      email.kind === "account"
        ? "outbound"
        : (process.env.POSTMARK_BROADCAST_STREAM ?? "broadcast"),
  };
}

export async function sendEmails(emails: OutgoingEmail[]): Promise<number> {
  if (emails.length === 0) return 0;
  const token = process.env.POSTMARK_SERVER_TOKEN;

  if (!token) {
    for (const e of emails) {
      console.log(`[email not sent: no POSTMARK_SERVER_TOKEN] to=${e.to} subject=${e.subject}`);
    }
    return emails.length;
  }

  let sent = 0;
  // Postmark accepts up to 500 messages per batch call.
  for (let i = 0; i < emails.length; i += 500) {
    const batch = emails.slice(i, i + 500).map(toPostmark);
    const res = await fetch("https://api.postmarkapp.com/email/batch", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": token,
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      console.error("Postmark batch failed", res.status, await res.text());
      continue;
    }
    const results = (await res.json()) as { ErrorCode: number }[];
    sent += results.filter((r) => r.ErrorCode === 0).length;
  }
  return sent;
}
