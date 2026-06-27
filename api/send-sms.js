// Vercel serverless function — Twilio SMS integration (using the `twilio` SDK).
// Each NudgeHQ customer provides their own Twilio credentials via the app
// Settings tab (Account SID, Auth Token and a "From" number/sender ID).

import Twilio from "twilio";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        console.warn("[send-sms] 405 — method not allowed:", req.method);
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { accountSid, authToken, from, toNumber, body } = req.body;

    if (!accountSid || !authToken || !from || toNumber == null || body == null) {
        console.warn("[send-sms] 400 — missing fields:", {
            accountSid: !!accountSid,
            authToken: !!authToken,
            from: !!from,
            toNumber: !!toNumber,
            body: body != null,
        });
        return res.status(400).json({
            error: "Missing required fields: accountSid, authToken, from, toNumber, body",
        });
    }

    // Normalise the destination number to a full E.164 format (e.g. +447…).
    let dest = String(toNumber).replace(/[^\d+]/g, "");
    if (dest.startsWith("00")) dest = "+" + dest.slice(2);
    if (dest.startsWith("+")) {
        // already E.164
    } else if (dest.startsWith("44")) {
        dest = "+" + dest;
    } else if (dest.startsWith("07")) {
        dest = "+44" + dest.slice(1);
    } else if (dest.startsWith("7")) {
        dest = "+44" + dest;
    } else {
        // Default to UK if no country code given.
        dest = "+44" + dest.replace(/^0/, "");
    }
    if (!/^\+\d{7,15}$/.test(dest)) {
        console.warn(`[send-sms] 400 — invalid number: "${toNumber}" → ${dest}`);
        return res.status(400).json({
            error: `Invalid phone number. Got "${toNumber}" → ${dest}. Expected E.164 (e.g. +44 7xxx xxxxxx).`,
        });
    }

    // Normalise the "From" sender. Can be either:
    //  - a Twilio phone number (E.164, e.g. +447xxxxxxxxxx), or
    //  - an alphanumeric sender ID (letters/digits/spaces, max 11 chars).
    let sender = String(from).trim();
    const isNumeric = /^\+?\d+$/.test(sender);
    if (!isNumeric) {
        // Alphanumeric sender ID: sanitize to letters/digits/spaces, max 11 chars.
        sender = sender
            .replace(/[^a-zA-Z0-9 ]/g, "")
            .slice(0, 11)
            .trim();
        if (!sender) {
            console.warn("[send-sms] 400 — invalid sender (empty after clean-up):", from);
            return res.status(400).json({ error: "Invalid sender (empty after clean-up)." });
        }
    }

    // Normalise line breaks and sanitise body. Twilio supports up to 1600 chars
    // per message (longer messages are concatenated as segments).
    const messageBody = String(body)
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\\n/g, "\n")
        .replace(/[\u2013\u2014]/g, "-")
        .replace(/[\u2018\u2019\u2032]/g, "'")
        .replace(/[\u201C\u201D\u2033]/g, '"')
        .replace(/\u2026/g, "...")
        .slice(0, 1600);

    try {
        const client = new Twilio(accountSid, authToken);

        console.info(`[send-sms] sending to ${dest} from "${sender}" (${messageBody.length} chars)`);

        // SDK validates that accountSid matches the credentials and throws on
        // auth/errors, so we just need a try/catch around create().
        const message = await client.messages.create({
            to: dest,
            from: sender,
            body: messageBody,
        });

        // message.sid starts with "SM", message.status is "queued" on success.
        if (message.status === "undelivered" || message.status === "failed") {
            console.error(`[send-sms] Twilio rejected message — status=${message.status} to=${dest} code=${message.errorCode}`);
            return res.status(400).json({
                error: message.errorMessage || `Twilio rejected the message: ${message.status}`,
                code: message.errorCode,
            });
        }

        console.info(`[send-sms] ✓ sent — sid=${message.sid} status=${message.status} to=${dest}`);
        return res.status(200).json({
            success: true,
            messageId: message.sid,
            status: message.status,
        });
    } catch (err) {
        // Twilio SDK throws a RestException with { status, code, message, moreInfo, details }.
        const status = err?.status || 500;
        const code = err?.code;
        const msg = err?.message || `Twilio error (HTTP ${status})`;
        console.error("[send-sms] error —", err?.status, err?.code, msg, "to=", dest);
        if (status >= 400 && status < 600) {
            return res.status(status).json({
                error: code != null ? `[${code}] ${msg}` : msg,
                code: code,
                detail: err?.details || err?.moreInfo,
            });
        }
        // Network / unknown errors.
        return res.status(500).json({ error: "Could not reach Twilio: " + (msg || "unknown error") });
    }
}
