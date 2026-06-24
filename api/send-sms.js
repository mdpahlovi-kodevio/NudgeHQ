// Vercel serverless function — Voodoo SMS integration.
// Each NudgeHQ customer provides their own Voodoo SMS API key via the app Settings tab.

export default async function handler(req, res) {
    if (req.method !== "POST") {
        console.warn("[send-sms] 405 — method not allowed:", req.method);
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { apiKey, senderName, toNumber, body } = req.body;

    if (!apiKey || !senderName || !toNumber || body == null) {
        console.warn("[send-sms] 400 — missing fields:", { apiKey: !!apiKey, senderName: !!senderName, toNumber: !!toNumber, body: body != null });
        return res.status(400).json({
            error: "Missing required fields: apiKey, senderName, toNumber, body",
        });
    }

    // Normalise the destination number to international format (44…)
    let dest = String(toNumber).replace(/\D/g, "");
    if (dest.startsWith("0044")) dest = "44" + dest.slice(4);
    else if (dest.startsWith("00")) dest = dest.slice(2);
    if (dest.startsWith("44")) {
    } else if (dest.startsWith("7")) {
        dest = "44" + dest;
    } else if (dest.startsWith("07")) {
        dest = "44" + dest.slice(1);
    }
    if (!/^44\d{10}$/.test(dest)) {
        console.warn(`[send-sms] 400 — invalid UK mobile: "${toNumber}" → ${dest}`);
        return res.status(400).json({
            error: `Invalid UK mobile number. Got "${toNumber}" → ${dest}. Expected 07xxxxxxxxx or +44 7xxx xxxxxx.`,
        });
    }

    // Sanitise sender name (alphanumeric + spaces, max 11 chars)
    const from = String(senderName)
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .slice(0, 11)
        .trim();
    if (!from) {
        console.warn("[send-sms] 400 — invalid sender name (empty after clean-up):", senderName);
        return res.status(400).json({ error: "Invalid sender name (empty after clean-up)." });
    }

    // Normalise line breaks and force GSM-7 encoding to avoid UCS-2 credit inflation
    const GSM7 = "A-Za-z0-9@£$¥èéùìòÇØøÅåΔΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./:;<=>?¡§¿ÄÖÑÜ§äöñüà|^€{}\\\][~\n";
    const messageBody = String(body)
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\\n/g, "\n")
        .replace(/[\u2013\u2014]/g, "-")
        .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
        .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
        .replace(/\u2026/g, "...")
        .replace(/[\u2022\u00B7]/g, "*")
        .replace(/\u00A0/g, " ")
        .replace(/\u20AC/g, "EUR")
        .replace(/\u00A3/g, "£")
        .replace(new RegExp(`[^${GSM7}]`, "g"), "")
        .slice(0, 1600);

    try {
        // Voodoo SMS expects application/x-www-form-urlencoded, NOT JSON.
        const form = new URLSearchParams();
        form.append("to", dest);
        form.append("from", from);
        form.append("msg", messageBody);

        console.info(`[send-sms] sending to ${dest} from "${from}" (${messageBody.length} chars)`);

        const voodooRes = await fetch("https://api.voodoosms.com/sendsms", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: form.toString(),
        });

        let data = null;
        const rawText = await voodooRes.text();
        console.info(`[send-sms] Voodoo responded HTTP ${voodooRes.status}:`, rawText);
        try {
            data = rawText ? JSON.parse(rawText) : null;
        } catch {
            console.error(`[send-sms] 502 — non-JSON response (HTTP ${voodooRes.status})`);
            return res.status(502).json({
                error: `Voodoo SMS returned a non-JSON response (HTTP ${voodooRes.status}).`,
            });
        }

        if (!voodooRes.ok || data?.error) {
            const errMsg =
                data?.error?.msg ||
                data?.error ||
                data?.message ||
                data?.msg ||
                `Voodoo SMS error (HTTP ${voodooRes.status})`;
            const errCode = data?.error?.code;
            console.error(`[send-sms] Voodoo error — code=${errCode} msg="${errMsg}" to=${dest}`);
            return res.status(voodooRes.status >= 400 && voodooRes.status < 600 ? voodooRes.status : 400).json({
                error: errCode != null ? `[${errCode}] ${errMsg}` : errMsg,
                code: errCode,
                detail: data,
            });
        }

        const msg = Array.isArray(data?.messages) ? data.messages[0] : null;
        if (msg && /reject|fail|invalid|error/i.test(msg.status || "")) {
            console.error(`[send-sms] Voodoo rejected message — status=${msg.status} to=${dest}`);
            return res.status(400).json({
                error: `Voodoo SMS rejected the message: ${msg.status}`,
                detail: data,
            });
        }

        console.info(`[send-sms] ✓ sent — id=${msg?.id} status=${msg?.status} to=${dest} credits=${data?.credits} balance=${data?.balance}`);
        return res.status(200).json({
            success: true,
            messageId: msg?.id || data?.id || data?.reference,
            status: msg?.status || data?.status,
            balance: data?.balance,
            credits: data?.credits,
        });
    } catch (err) {
        console.error("[send-sms] 500 — fetch threw:", err?.message || err);
        return res.status(500).json({ error: "Could not reach Voodoo SMS: " + (err?.message || "unknown error") });
    }
}
