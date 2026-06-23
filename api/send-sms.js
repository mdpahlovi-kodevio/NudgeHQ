// api/send-sms.js
// Vercel serverless function — Voodoo SMS integration.
// Each NudgeHQ customer provides their own Voodoo SMS API key via the app Settings tab.
//
// Voodoo SMS API response shapes we handle:
//   success (200): { count, originator, body, balance, credits,
//                    messages: [{ id, recipient, reference, status }] }
//   error (4xx):   { error: { code: <number>, msg: <string> } }
//
// Older/legacy variants we also tolerate:
//   success:       { result: "success", ... } / { status: "ok" }
//   error:         { message: "..." } / { error: "string" }

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { apiKey, senderName, toNumber, body } = req.body;

    if (!apiKey || !senderName || !toNumber || body == null) {
        return res.status(400).json({
            error: "Missing required fields: apiKey, senderName, toNumber, body",
        });
    }

    // ── Normalise the destination number to international format (44…) ──
    // Strip everything that isn't a digit, then map common UK prefixes to 44.
    let dest = String(toNumber).replace(/\D/g, "");
    if (dest.startsWith("0044")) dest = "44" + dest.slice(4);
    else if (dest.startsWith("00")) dest = dest.slice(2); // generic intl prefix
    if (dest.startsWith("44")) {
        // already international — keep as is
    } else if (dest.startsWith("7")) {
        // mobile without leading 0 (e.g. 7700900000)
        dest = "44" + dest;
    } else if (dest.startsWith("07")) {
        dest = "44" + dest.slice(1);
    }
    // UK mobile numbers in international format are 44 + 10 digits = 12 digits.
    if (!/^44\d{10}$/.test(dest)) {
        return res.status(400).json({
            error: `Invalid UK mobile number. Got "${toNumber}" → ${dest}. Expected 07xxxxxxxxx or +44 7xxx xxxxxx.`,
        });
    }

    // ── Sanitise sender name ──
    // Voodoo: alphanumeric (letters/digits/spaces), max 11 chars. A purely numeric
    // sender is rejected as "Invalid Sender ID", so require at least one letter.
    const from = String(senderName)
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .slice(0, 11)
        .trim();
    if (!from) {
        return res.status(400).json({ error: "Invalid sender name (empty after clean-up)." });
    }

    // Voodoo concatenates long messages; 1600 chars is a safe ceiling.
    const messageBody = String(body).slice(0, 1600);

    try {
        const voodooRes = await fetch("https://api.voodoosms.com/sendsms", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                to: dest, // accepted as string or int
                from: from,
                msg: messageBody,
            }),
        });

        // Parse JSON defensively — Voodoo occasionally returns a non-JSON body
        // (e.g. 502 HTML from their gateway), which would otherwise throw.
        let data = null;
        const rawText = await voodooRes.text();
        try {
            data = rawText ? JSON.parse(rawText) : null;
        } catch {
            return res.status(502).json({
                error: `Voodoo SMS returned a non-JSON response (HTTP ${voodooRes.status}).`,
            });
        }

        // ── Error path ──
        // Extract a human-readable message from any of the known error shapes.
        if (!voodooRes.ok || data?.error) {
            const errMsg =
                data?.error?.msg || // standard: { error: { code, msg } }
                data?.error || // legacy string
                data?.message ||
                data?.msg ||
                `Voodoo SMS error (HTTP ${voodooRes.status})`;
            const errCode = data?.error?.code;
            console.error("Voodoo SMS error:", rawText);
            return res.status(voodooRes.status >= 400 && voodooRes.status < 600 ? voodooRes.status : 400).json({
                error: errCode != null ? `[${errCode}] ${errMsg}` : errMsg,
                code: errCode,
                detail: data,
            });
        }

        // ── Success path ──
        const msg = Array.isArray(data?.messages) ? data.messages[0] : null;
        // Treat an explicit failure status inside a 200 as an error.
        if (msg && /reject|fail|invalid|error/i.test(msg.status || "")) {
            console.error("Voodoo SMS rejected message:", rawText);
            return res.status(400).json({
                error: `Voodoo SMS rejected the message: ${msg.status}`,
                detail: data,
            });
        }

        return res.status(200).json({
            success: true,
            messageId: msg?.id || data?.id || data?.reference,
            status: msg?.status || data?.status,
            balance: data?.balance,
            credits: data?.credits,
        });
    } catch (err) {
        console.error("Server error:", err);
        return res.status(500).json({ error: "Could not reach Voodoo SMS: " + (err?.message || "unknown error") });
    }
}
