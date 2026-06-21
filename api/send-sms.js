// api/send-sms.js
// Vercel serverless function — Voodoo SMS integration
// Each NudgeHQ customer provides their own Voodoo SMS API key via the app Settings tab.

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { apiKey, senderName, toNumber, body } = req.body;

    if (!apiKey || !senderName || !toNumber || !body) {
        return res.status(400).json({
            error: "Missing required fields: apiKey, senderName, toNumber, body",
        });
    }

    // Normalise UK number to international format (44xxxxxxxxxx)
    let dest = toNumber.replace(/[\s\-()]/g, "");
    if (dest.startsWith("+")) dest = dest.slice(1);
    if (dest.startsWith("07")) dest = "44" + dest.slice(1);
    if (!/^\d{11,13}$/.test(dest)) {
        return res.status(400).json({ error: "Invalid phone number format" });
    }

    const from = senderName
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .slice(0, 11)
        .trim();
    if (!from) {
        return res.status(400).json({ error: "Invalid sender name" });
    }

    // Voodoo SMS has a 160 char limit per SMS segment; long messages are sent as concatenated SMS
    const messageBody = body.slice(0, 1600);

    try {
        const voodooRes = await fetch("https://api.voodoosms.com/sendsms", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                to: parseInt(dest, 10),
                from: from,
                msg: messageBody,
            }),
        });

        const data = await voodooRes.json();

        if (!voodooRes.ok) {
            console.error("Voodoo SMS error:", data);
            return res.status(400).json({
                error: data.message || data.error || "Voodoo SMS error",
                detail: data,
            });
        }

        return res.status(200).json({
            success: true,
            messageId: data.id || data.reference,
            status: data.status,
        });
    } catch (err) {
        console.error("Server error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}
