const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");
const { createClient } = require("@supabase/supabase-js");

exports.handler = async function () {
  const user = process.env.IMAP_USER;
  const pass = process.env.IMAP_PASS;

  if (!user || !pass) {
    console.log("[INBOUND] IMAP credentials not configured, skipping");
    return { statusCode: 200, body: "IMAP not configured" };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const client = new ImapFlow({
    host: process.env.IMAP_HOST || "mail.privateemail.com",
    port: Number(process.env.IMAP_PORT) || 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  let processed = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const since = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const uids = await client.search({ since: since });

      if (!uids.length) {
        console.log("[INBOUND] No emails in last 2 hours");
        lock.release();
        await client.logout();
        return { statusCode: 200, body: "No recent emails" };
      }

      console.log("[INBOUND] Found " + uids.length + " email(s) from last 2 hours");

      for (const uid of uids) {
        try {
          const raw = await client.fetchOne(uid, { source: true }, { uid: true });
          const parsed = await simpleParser(raw.source);
          const subject = parsed.subject || "";

          const match = subject.match(/\[INQ#([^\]]+)\]/);
          if (!match) {
            continue;
          }

          const from = parsed.from?.value?.[0]?.address || "";
          const infoAddr = (process.env.IMAP_USER || "info@leonidionhouses.com").toLowerCase();
          if (from.toLowerCase() === infoAddr) {
            continue;
          }

          const inquiryId = match[1];
          const replyText = extractReplyText(parsed.text || "");

          if (!replyText.trim()) {
            console.log("[INBOUND] Empty reply for inquiry " + inquiryId + ", skipping");
            continue;
          }

          const trimmedMessage = replyText.trim().slice(0, 10000);

          const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
          const { data: existing } = await supabase
            .from("inquiry_messages")
            .select("id")
            .eq("inquiry_id", inquiryId)
            .eq("sender_type", "guest")
            .eq("message", trimmedMessage)
            .gte("created_at", twoHoursAgo)
            .limit(1);

          if (existing && existing.length > 0) {
            continue;
          }

          const { data: inquiry } = await supabase
            .from("inquiries")
            .select("id, guest_email")
            .eq("id", inquiryId)
            .single();

          if (!inquiry) {
            console.warn("[INBOUND] Inquiry " + inquiryId + " not found, skipping");
            continue;
          }

          await supabase.from("inquiry_messages").insert({
            inquiry_id: inquiryId,
            sender_type: "guest",
            message: trimmedMessage,
          });

          await supabase
            .from("inquiries")
            .update({
              last_guest_message_at: new Date().toISOString(),
              status: "NEW",
            })
            .eq("id", inquiryId);

          processed++;
          console.log("[INBOUND] Processed reply for inquiry " + inquiryId);
        } catch (msgErr) {
          console.error("[INBOUND] Error processing UID " + uid + ":", msgErr?.message);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    console.error("[INBOUND] IMAP error:", err?.message);
  }

  console.log("[INBOUND] Done — processed " + processed + " replies");
  return { statusCode: 200, body: JSON.stringify({ processed }) };
};

function extractReplyText(text) {
  if (!text) return "";

  const lines = text.split("\n");
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^On .+ wrote:\s*$/i.test(trimmed)) break;
    if (/^Στις .+ έγραψε:\s*$/i.test(trimmed)) break;
    if (/^-{3,}\s*Original Message/i.test(trimmed)) break;
    if (/^-{3,}\s*Forwarded message/i.test(trimmed)) break;
    if (/^From:\s/i.test(trimmed) && result.length > 0) break;
    if (trimmed.startsWith(">")) continue;

    result.push(line);
  }

  return result.join("\n").trim();
}
