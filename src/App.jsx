import { useState, useEffect, useRef } from "react";

// ══════════════════════════════════════════════════════
// DEFAULT SETTINGS — blank template
// Each customer fills in their own details
// ══════════════════════════════════════════════════════
const DEFAULT_SETTINGS = {
    businessName: "",
    bankName: "",
    generalPhone: "",
    jotformsLink: "",
    regFee: 30,
    packages: [
        { id: "p1", hours: 2, monthly: 100 },
        { id: "p2", hours: 4, monthly: 140 },
        { id: "p3", hours: 6, monthly: 180 },
        { id: "p4", hours: 8, monthly: 220 },
    ],
    branches: [
        {
            id: "b1",
            name: "",
            phone: "",
            email: "",
            sumupLink: "",
            calendlyLink: "",
            bankSort: "",
            bankAcct: "",
            slots: [
                { id: "s1", day: "Monday", time: "" },
                { id: "s2", day: "Saturday", time: "" },
            ],
        },
    ],
    voodoo: { apiKey: "", senderName: "" },
    pin: "",
};

// ══════════════════════════════════════════════════════
// WORKFLOWS + STEPS
// ══════════════════════════════════════════════════════
const WF = [
    { id: "enquiry", icon: "👋", label: "New Enquiry", desc: "Full onboarding — 4 messages" },
    { id: "trial", icon: "📅", label: "Trial Session", desc: "1-hour free trial — 2 messages" },
    { id: "pricing", icon: "💷", label: "Pricing & Timetable", desc: "Info pack — 1 message" },
    { id: "info", icon: "ℹ️", label: "General Information", desc: "About us — 2 messages" },
    { id: "followup", icon: "🔔", label: "Follow-up", desc: "Chase no-response — 3 messages" },
    { id: "nudge", icon: "💭", label: "Nudge (Thinking About It)", desc: "Soft follow-up — 3 messages" },
];

const STEPS = {
    enquiry: [
        { key: "e1", label: "Welcome, Sessions & Payment", timing: "Send immediately after call" },
        { key: "e2", label: "Enrolment Form", timing: "After payment confirmed" },
        { key: "e3", label: "Welcome & Confirmation", timing: "After enrolment form completed" },
        { key: "e4", label: "24hr Follow-up", timing: "If no response after 24 hours" },
    ],
    trial: [
        { key: "t1", label: "Trial Invitation", timing: "Send immediately" },
        { key: "t2", label: "Day-Before Reminder", timing: "Evening before their trial" },
    ],
    pricing: [{ key: "p1", label: "Pricing & Timetable", timing: "Send immediately" }],
    info: [
        { key: "g1", label: "About Us", timing: "Send immediately" },
        { key: "g2", label: "What We Provide", timing: "Send immediately after first message" },
    ],
    followup: [
        { key: "f1", label: "24hr Follow-up", timing: "After 24 hours of no response" },
        { key: "f2", label: "48hr Follow-up", timing: "After 48 hours" },
        { key: "f3", label: "72hr Final Message", timing: "After 72 hours — last contact" },
    ],
    nudge: [
        { key: "n1", label: "Initial Message — Thinking About It", timing: "Send immediately after call, or within 24hrs" },
        { key: "n2", label: "Follow-up — No Response", timing: "24 hours after n1 if no response" },
        { key: "n3", label: "Final Message", timing: "48-72 hours after n2 — last contact" },
    ],
};

const VARS = [
    { v: "[PARENT_NAME]", d: "Parent/guardian name" },
    { v: "[BRANCH]", d: "Branch name" },
    { v: "[BRANCH_PHONE]", d: "Branch direct mobile" },
    { v: "[GENERAL_PHONE]", d: "Main/general phone number" },
    { v: "[BUSINESS_NAME]", d: "Business name" },
    { v: "[STUDENT_NAMES]", d: "All student names e.g. Zaynab & Ibrahim" },
    { v: "[STUDENT_POSSESSIVE]", d: "Possessive: Zaynab's or your children's" },
    { v: "[SESSION_LINES]", d: "Confirmed slots per student (Step 1)" },
    { v: "[SESSION_SUMMARY]", d: "Class details — no name for single student" },
    { v: "[CALENDLY_LINE]", d: "Full Calendly line — only appears if Calendly is set up for that branch" },
    { v: "[CALENDLY_SHORT_LINE]", d: "Short Calendly append — only appears if Calendly set up" },
    { v: "[PACKAGE_DISCUSSED_LINE]", d: "Package discussed on call — blank if nothing selected" },
    { v: "[WEEKLY_SESSIONS]", d: "Weekly sessions per student" },
    { v: "[PACKAGE_LINES]", d: "Package per student" },
    { v: "[FIRST_PAYMENT]", d: "Total first payment" },
    { v: "[MONTHLY_TOTAL]", d: "Total ongoing monthly amount" },
    { v: "[PAYMENT_LINE]", d: "Card link OR bank details — based on Step 2 selection" },
    { v: "[BANK_NAME]", d: "Bank account name" },
    { v: "[BANK_SORT]", d: "Sort code" },
    { v: "[BANK_ACCT]", d: "Account number" },
    { v: "[BANK_REF]", d: "Payment reference instruction" },
    { v: "[JOTFORMS_LINK]", d: "Enrolment form link" },
    { v: "[CALENDLY_LINK]", d: "Trial booking link" },
    { v: "[SLOT_LIST]", d: "Available session times (pricing)" },
    { v: "[REG_FEE]", d: "Registration fee amount" },
    { v: "[SUMUP_LINK]", d: "Branch SumUp card payment link" },
    { v: "[SURNAME]", d: "Student surname in capitals" },
];

// ══════════════════════════════════════════════════════
// FIXED TEMPLATES
// ══════════════════════════════════════════════════════
const DEFAULT_TPL = {
    e1: `Hi [PARENT_NAME], thanks for calling [BUSINESS_NAME] [BRANCH]!

Confirmed session(s):
[SESSION_LINES]

[PACKAGE_LINES] + £[REG_FEE] registration fee (one-off)

To enrol [STUDENT_NAMES] please make a payment of [FIRST_PAYMENT]:
[PAYMENT_LINE]

Please save our number: [GENERAL_PHONE]
[BUSINESS_NAME] [BRANCH] 📚`,

    e2: `Hi [PARENT_NAME], payment received — thank you!

To complete [STUDENT_NAMES]'s enrolment please fill in the registration form. This is essential — we cannot confirm your child's place without it:
[JOTFORMS_LINK]

Any questions call us on [GENERAL_PHONE]
[BUSINESS_NAME] [BRANCH]`,

    e3: `Welcome to [BUSINESS_NAME] [BRANCH]! 🎉

Here are [STUDENT_POSSESSIVE] class details:
[SESSION_SUMMARY]

Monthly fees [MONTHLY_TOTAL] by bank transfer on the 1st of each month. Please note a late payment charge may apply to payments received after this date.
[BANK_NAME] | Sort: [BANK_SORT] | Acc: [BANK_ACCT]
Ref: [BANK_REF]

Any questions: [BRANCH_PHONE] | [GENERAL_PHONE]
[BUSINESS_NAME] [BRANCH] 📚`,

    e4: `Hi [PARENT_NAME], we'd love to confirm [STUDENT_NAMES]'s place at [BUSINESS_NAME] [BRANCH]. Spaces are limited this month — please call [GENERAL_PHONE] or reply to this message to go ahead. [BUSINESS_NAME] [BRANCH]`,

    t1: `Hi [PARENT_NAME], book [STUDENT_NAMES]'s FREE 1-hr trial at [BUSINESS_NAME] [BRANCH] (trial times differ from regular classes):
[CALENDLY_LINK]
Qs: [GENERAL_PHONE] | [BRANCH_PHONE] (opening hrs)
[BUSINESS_NAME] [BRANCH] 📚`,

    t2: `Hi [PARENT_NAME], reminder: [STUDENT_NAMES]'s trial is tomorrow at [BUSINESS_NAME] [BRANCH].
Any questions: [BRANCH_PHONE] | [GENERAL_PHONE]
See you tomorrow! [BUSINESS_NAME] [BRANCH] 📚`,

    p1: `Hi [PARENT_NAME], [BUSINESS_NAME] [BRANCH] packages:
• 2hrs/wk — £100/mo
• 4hrs/wk — £140/mo
• 6hrs/wk — £180/mo
• 8hrs/wk — £220/mo
+£[REG_FEE] reg fee per student (one-off)

[BRANCH] times:
[SLOT_LIST]

Timetable subject to change — call [GENERAL_PHONE] for latest availability.
Free trial: [CALENDLY_LINK]
[GENERAL_PHONE] | [BRANCH_PHONE] (opening hrs)
[BUSINESS_NAME] [BRANCH] 📚`,

    g1: `Hi [PARENT_NAME], [BUSINESS_NAME] [BRANCH] — in-person tuition, max 6 per tutor across our centres.

Primary: English & Maths | Secondary: English, Maths & Science (GCSE)

[BUSINESS_NAME] [BRANCH] 📚`,

    g2: `At [BUSINESS_NAME] [BRANCH] we provide all resources & materials, weekly progress reports and homework. Taught by experienced tutors dedicated to your child's progress.

Book a FREE 1-hr trial: [CALENDLY_LINK]
Qs: [GENERAL_PHONE] | [BRANCH_PHONE] (opening hrs)
[BUSINESS_NAME] [BRANCH] 📚`,

    f1: `Hi [PARENT_NAME], following up re [STUDENT_NAMES] — [BUSINESS_NAME] [BRANCH]. Call [GENERAL_PHONE] or reply here to confirm. [BUSINESS_NAME] [BRANCH]`,

    f2: `Hi [PARENT_NAME], spaces at [BUSINESS_NAME] [BRANCH] filling up. Confirm [STUDENT_NAMES]'s place now: [GENERAL_PHONE] [BUSINESS_NAME] [BRANCH] 📚`,

    f3: `Final message re [STUDENT_NAMES] — [BUSINESS_NAME] [BRANCH]. To proceed: [GENERAL_PHONE]. To unsubscribe: reply STOP.`,

    n1: `Hi [PARENT_NAME], thanks for calling [BUSINESS_NAME] [BRANCH]! We\'d love to support [STUDENT_NAMES].[PACKAGE_DISCUSSED_LINE]

[CALENDLY_LINE]Call us on [GENERAL_PHONE] if you have any questions or would like more information.
[BUSINESS_NAME] [BRANCH] 📚`,

    n2: `Hi [PARENT_NAME], just following up on your recent enquiry about [BUSINESS_NAME] [BRANCH]. We still have spaces available and would love to get [STUDENT_NAMES] started. If you have any questions at all, please don\'t hesitate to call us on [GENERAL_PHONE].[CALENDLY_SHORT_LINE]
[BUSINESS_NAME] [BRANCH] 📚`,

    n3: `Hi [PARENT_NAME], just a final reminder about [STUDENT_NAMES]\'s place at [BUSINESS_NAME] [BRANCH]. We\'d still love to welcome them — if you\'d like to go ahead or have any questions, please give us a call on [GENERAL_PHONE]. Wishing you and your family all the best. [BUSINESS_NAME] [BRANCH] 📚`,
};

// ══════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const todayStr = () => new Date().toISOString().split("T")[0];
const fmt = (n) => "£" + Number(n).toFixed(2).replace(/\.00$/, "");
const daysSince = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

function calcProRata(monthly, joinDateStr) {
    const d = new Date(joinDateStr);
    const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const wl = Math.ceil((dim - d.getDate() + 1) / 7);
    return { proRata: Math.min(Math.round((monthly / 4) * wl * 100) / 100, monthly), weeksLeft: wl, weekly: monthly / 4 };
}
function stuCalc(s, settings) {
    const p = settings.packages.find((x) => x.id === s.pkg);
    if (!p) return null;
    const { proRata, weeksLeft, weekly } = calcProRata(p.monthly, s.joinDate);
    return { proRata, weeksLeft, weekly, monthly: p.monthly, hours: p.hours, total: settings.regFee + proRata };
}
const blankStu = () => ({
    id: uid(),
    name: "",
    yearGroup: "",
    level: "secondary",
    subjects: [],
    pkg: null,
    joinDate: todayStr(),
    confirmedSlots: [],
    slotsTBC: false,
});
const getSurname = (students) => (students[0]?.name || "SURNAME").trim().split(" ").pop().toUpperCase();
const normalisePhone = (spoken) => {
    let s = spoken.toLowerCase();
    s = s.replace(/double\s+(\w+)/g, (_, p) => {
        const m = { zero: "0", oh: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9" };
        return (m[p] || p).repeat(2);
    });
    const m = {
        zero: "0",
        oh: "0",
        nought: "0",
        one: "1",
        two: "2",
        three: "3",
        four: "4",
        five: "5",
        six: "6",
        seven: "7",
        eight: "8",
        nine: "9",
    };
    Object.entries(m).forEach(([w, d]) => {
        s = s.replace(new RegExp(`\\b${w}\\b`, "g"), d);
    });
    const digs = s.replace(/\D/g, "");
    return digs.length === 11 ? `${digs.slice(0, 5)} ${digs.slice(5, 8)} ${digs.slice(8)}` : digs;
};

function computeVars(data, settings) {
    const { parentName, students, branchId, grandTotal, selectedSlots, payMethod } = data;
    const branch = settings.branches.find((b) => b.id === branchId) || settings.branches[0];
    const stuArr = students || [];
    const surname = getSurname(stuArr);
    const studentNames =
        stuArr
            .map((s) => s.name)
            .filter(Boolean)
            .join(" & ") || "your child(ren)";

    // Possessive for single vs multiple students
    const stuPossessive = stuArr.length === 1 ? (stuArr[0].name ? `${stuArr[0].name}'s` : "your child's") : "your children's";

    // Session summary — omit name for single student
    const sessionSummary =
        stuArr.length === 1
            ? (() => {
                  const s = stuArr[0];
                  if (s.slotsTBC) return "TBC — session times to be confirmed";
                  const slots = (s.confirmedSlots || [])
                      .map((id) => {
                          const sl = branch.slots?.find((x) => x.id === id);
                          return sl ? `${sl.day} ${sl.time}` : "";
                      })
                      .filter(Boolean);
                  return slots.join("\n") || "TBC";
              })()
            : stuArr
                  .map((s) => {
                      if (s.slotsTBC) return `${s.name || "Student"}: TBC`;
                      const slots = (s.confirmedSlots || [])
                          .map((id) => {
                              const sl = branch.slots?.find((x) => x.id === id);
                              return sl ? `${sl.day} ${sl.time}` : "";
                          })
                          .filter(Boolean);
                      return `${s.name || "Student"}: ${slots.join(" & ") || "TBC"}`;
                  })
                  .join("\n");

    const sessionLines = stuArr
        .map((s) => {
            if (s.slotsTBC) return `${s.name || "Student"}: TBC`;
            const slots = (s.confirmedSlots || [])
                .map((id) => {
                    const sl = branch.slots?.find((x) => x.id === id);
                    return sl ? `${sl.day} ${sl.time}` : "";
                })
                .filter(Boolean);
            return `${s.name || "Student"}: ${slots.join(" & ") || "TBC"}`;
        })
        .join("\n");

    const weeklySessions = stuArr
        .map((s) => {
            const slots = (s.confirmedSlots || [])
                .map((id) => {
                    const sl = branch.slots?.find((x) => x.id === id);
                    return sl ? `${sl.day} ${sl.time}` : "";
                })
                .filter(Boolean);
            return `${s.name || "Student"}: ${slots.join(" & ") || "TBC"} (weekly)`;
        })
        .join("\n");

    const packageLines = stuArr
        .map((s) => {
            const p = settings.packages.find((x) => x.id === s.pkg);
            const c = stuCalc(s, settings);
            return p && c ? `${s.name || "Student"}: ${p.hours}hrs/week — ${fmt(p.monthly)}/month` : "";
        })
        .filter(Boolean)
        .join("\n");

    const monthlyTotal = stuArr.reduce((sum, st) => {
        const p = settings.packages.find((x) => x.id === st.pkg);
        return p ? sum + p.monthly : sum;
    }, 0);

    const slotSource =
        selectedSlots?.length > 0
            ? selectedSlots
                  .map((id) => {
                      const sl = branch.slots?.find((x) => x.id === id);
                      return sl ? `• ${sl.day} ${sl.time}` : "";
                  })
                  .filter(Boolean)
            : (branch.slots || []).map((s) => `• ${s.day} ${s.time}`);

    const bankRef = `${surname} + your child's date of birth (DDMMYY)`;

    // Payment line — card OR bank, not both
    const pm = payMethod || "sumup";
    const paymentLine =
        pm === "sumup"
            ? branch.sumupLink
                ? `Pay by card: ${branch.sumupLink}`
                : "Card payment — link to be provided"
            : `Bank transfer:\n${settings.bankName} | Sort: ${branch.bankSort} | Acc: ${branch.bankAcct}\nRef: ${bankRef}`;

    // Thinking About It specific variables
    const calendlyLine = branch.calendlyLink ? `Why not book a free trial: ${branch.calendlyLink}\n` : "";
    const calendlyShortLine = branch.calendlyLink ? ` Or book a free trial: ${branch.calendlyLink}` : "";
    const pkgDiscussed = stuArr.filter((s) => s.pkg);
    const pkgDiscussedLine =
        pkgDiscussed.length === 0
            ? ""
            : pkgDiscussed.length === 1
              ? (() => {
                    const p = settings.packages.find((x) => x.id === pkgDiscussed[0].pkg);
                    return p ? `\n\nWe discussed the ${p.hours}hrs/week package at £${p.monthly}/month.` : "";
                })()
              : "\n\nWe discussed:\n" +
                pkgDiscussed
                    .map((s) => {
                        const p = settings.packages.find((x) => x.id === s.pkg);
                        return p ? `• ${s.name || "Student"}: ${p.hours}hrs/week at £${p.monthly}/month` : "";
                    })
                    .filter(Boolean)
                    .join("\n");

    return {
        PARENT_NAME: parentName || "there",
        BRANCH: branch.name,
        BRANCH_PHONE: branch.phone,
        GENERAL_PHONE: settings.generalPhone,
        BUSINESS_NAME: settings.businessName,
        STUDENT_NAMES: studentNames,
        STUDENT_POSSESSIVE: stuPossessive,
        SESSION_LINES: sessionLines,
        SESSION_SUMMARY: sessionSummary,
        WEEKLY_SESSIONS: weeklySessions,
        PACKAGE_LINES: packageLines,
        FIRST_PAYMENT: fmt(grandTotal || 0),
        MONTHLY_TOTAL: fmt(monthlyTotal),
        PAYMENT_LINE: paymentLine,
        SUMUP_LINK: branch.sumupLink,
        BANK_NAME: settings.bankName,
        BANK_SORT: branch.bankSort,
        BANK_ACCT: branch.bankAcct,
        BANK_REF: bankRef,
        JOTFORMS_LINK: settings.jotformsLink,
        CALENDLY_LINK: branch.calendlyLink,
        SLOT_LIST: slotSource.join("\n"),
        SURNAME: surname,
        REG_FEE: String(settings.regFee),
        CALENDLY_LINE: calendlyLine,
        CALENDLY_SHORT_LINE: calendlyShortLine,
        PACKAGE_DISCUSSED_LINE: pkgDiscussedLine,
    };
}

function fillTemplate(template, vars) {
    return Object.entries(vars).reduce((t, [k, v]) => t.replace(new RegExp(`\\[${k}\\]`, "g"), v != null ? v : `[${k}]`), template || "");
}
function generateMsgs(workflow, formData, templates, settings) {
    const vars = computeVars(formData, settings);
    return STEPS[workflow].map((step) => ({
        step: step.label,
        timing: step.timing,
        content: fillTemplate(templates[step.key] || DEFAULT_TPL[step.key] || "", vars),
    }));
}

// ══════════════════════════════════════════════════════
// STORAGE
// ══════════════════════════════════════════════════════
const sGet = async (k, fb) => {
    try {
        const r = localStorage.getItem(k);
        return r ? JSON.parse(r) : fb;
    } catch {
        return fb;
    }
};
const sSet = async (k, v) => {
    try {
        localStorage.setItem(k, JSON.stringify(v));
    } catch {}
};

// ══════════════════════════════════════════════════════
// DESIGN TOKENS — Study Buddies blue, pink and white
// ══════════════════════════════════════════════════════
const C = {
    navy: "#3B58A8", // Study Buddies royal blue
    blue: "#2D4A9C", // deeper blue for text
    pink: "#E91E8C", // Study Buddies hot pink — accent
    green: "#27AE60", // success
    red: "#E05050", // error
    bg: "#F4F6FC", // very light blue-white
    white: "#FFFFFF",
    text: "#1A2C6B", // dark blue text
    muted: "#6B7FA8", // muted blue-grey
    border: "#D0D8F0", // light blue border
    tag: "#EEF2FA", // light blue tag background
};

// ══════════════════════════════════════════════════════
// UI PRIMITIVES
// ══════════════════════════════════════════════════════
const Card = ({ children, style = {} }) => (
    <div style={{ background: C.white, borderRadius: 12, padding: 14, marginBottom: 12, border: `1px solid ${C.border}`, ...style }}>
        {children}
    </div>
);
const ST = ({ children }) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
        {children}
    </div>
);
const Lbl = ({ children }) => (
    <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: "block", marginBottom: 4 }}>{children}</label>
);
const Inp = ({ style = {}, ...p }) => (
    <input
        {...p}
        style={{
            width: "100%",
            padding: "9px 11px",
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            fontSize: 13,
            color: C.text,
            boxSizing: "border-box",
            outline: "none",
            ...style,
        }}
    />
);
const Sel = ({ children, ...p }) => (
    <select
        {...p}
        style={{
            width: "100%",
            padding: "9px 11px",
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            fontSize: 13,
            color: C.text,
            background: C.white,
            boxSizing: "border-box",
        }}
    >
        {children}
    </select>
);

const Btn = ({ children, variant = "primary", style = {}, ...p }) => {
    const v = {
        primary: { background: C.navy, color: "#fff", border: "none" },
        pink: { background: C.pink, color: "#fff", border: "none" },
        ghost: { background: C.tag, color: C.navy, border: "none" },
        danger: { background: "#FEE2E2", color: C.red, border: `1px solid #FCA5A5` },
        success: { background: "#D1FAE5", color: C.green, border: `1px solid #6EE7B7` },
    };
    return (
        <button
            {...p}
            style={{ padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", ...v[variant], ...style }}
        >
            {children}
        </button>
    );
};

function Toggle({ on, onToggle }) {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onToggle();
            }}
            style={{
                width: 38,
                height: 22,
                borderRadius: 11,
                border: "none",
                cursor: "pointer",
                background: on ? C.pink : "#CBD5E1",
                position: "relative",
                padding: 0,
                transition: "background .2s",
                flexShrink: 0,
            }}
        >
            <div
                style={{
                    position: "absolute",
                    top: 3,
                    left: on ? 18 : 3,
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    background: "#fff",
                    transition: "left .2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                }}
            />
        </button>
    );
}

function StatusBadge({ status }) {
    const m = {
        pending: { bg: "#FEF3C7", color: "#92400E", label: "Pending" },
        enrolled: { bg: "#D1FAE5", color: "#065F46", label: "Enrolled" },
        declined: { bg: "#FEE2E2", color: "#991B1B", label: "Declined" },
    };
    const s = m[status] || m.pending;
    return (
        <span style={{ background: s.bg, color: s.color, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
            {s.label}
        </span>
    );
}

// ══════════════════════════════════════════════════════
// VOICE INPUT
// ══════════════════════════════════════════════════════
function MicButton({ onResult, isPhone }) {
    const [active, setActive] = useState(false);
    const recRef = useRef(null);
    const toggle = () => {
        if (active) {
            recRef.current?.stop();
            return;
        }
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            alert("Voice input requires Chrome.");
            return;
        }
        const rec = new SR();
        rec.lang = "en-GB";
        rec.interimResults = false;
        rec.onstart = () => setActive(true);
        rec.onend = () => setActive(false);
        rec.onerror = () => setActive(false);
        rec.onresult = (e) => {
            const t = e.results[0][0].transcript;
            onResult(isPhone ? normalisePhone(t) : t);
        };
        recRef.current = rec;
        rec.start();
    };
    return (
        <button
            onClick={toggle}
            type="button"
            style={{
                padding: "9px 12px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontSize: 15,
                flexShrink: 0,
                background: active ? C.red : C.tag,
                color: active ? "#fff" : C.navy,
            }}
        >
            {active ? "⏹" : "🎤"}
        </button>
    );
}
function VField({ label, value, onChange, isPhone, placeholder, type = "text" }) {
    return (
        <div style={{ marginBottom: 10 }}>
            {label && <Lbl>{label}</Lbl>}
            <div style={{ display: "flex", gap: 6 }}>
                <Inp value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} style={{ flex: 1 }} />
                <MicButton onResult={onChange} isPhone={isPhone} />
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════
// STUDENT CARD — Step 1
// ══════════════════════════════════════════════════════
function StudentCard({ student, onChange, onRemove, index, isOnly }) {
    const subs = student.level === "primary" ? ["English", "Maths"] : ["English", "Maths", "Science"];
    const yrs =
        student.level === "primary"
            ? ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"]
            : ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11"];
    return (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 10, background: "#F8FAFF" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>Student {index + 1}</span>
                {!isOnly && (
                    <button
                        onClick={onRemove}
                        style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 12, fontWeight: 700 }}
                    >
                        ✕ Remove
                    </button>
                )}
            </div>
            <VField label="Name" value={student.name} onChange={(v) => onChange({ ...student, name: v })} placeholder="Student name" />
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                    <Lbl>Level</Lbl>
                    <div style={{ display: "flex", gap: 6 }}>
                        {["primary", "secondary"].map((l) => (
                            <button
                                key={l}
                                onClick={() => onChange({ ...student, level: l, subjects: [], pkg: null })}
                                style={{
                                    flex: 1,
                                    padding: "7px 4px",
                                    borderRadius: 8,
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: student.level === l ? C.navy : C.tag,
                                    color: student.level === l ? "#fff" : C.muted,
                                }}
                            >
                                {l[0].toUpperCase() + l.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
                <div style={{ flex: 1 }}>
                    <Lbl>Year Group</Lbl>
                    <Sel value={student.yearGroup} onChange={(e) => onChange({ ...student, yearGroup: e.target.value })}>
                        <option value="">Select</option>
                        {yrs.map((y) => (
                            <option key={y}>{y}</option>
                        ))}
                    </Sel>
                </div>
            </div>
            <Lbl>Subjects</Lbl>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {subs.map((s) => {
                    const on = student.subjects.includes(s);
                    return (
                        <button
                            key={s}
                            onClick={() => {
                                const next = on ? student.subjects.filter((x) => x !== s) : [...student.subjects, s];
                                onChange({ ...student, subjects: next });
                            }}
                            style={{
                                padding: "5px 12px",
                                borderRadius: 20,
                                border: "none",
                                cursor: "pointer",
                                fontSize: 12,
                                fontWeight: 600,
                                background: on ? C.pink : C.tag,
                                color: on ? "#fff" : C.muted,
                            }}
                        >
                            {s}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════
// STUDENT PACKAGE CARD — Step 2
// ══════════════════════════════════════════════════════
function StudentPkgCard({ student, onChange, index, branchSlots, settings }) {
    const calc = stuCalc(student, settings);
    const toggleSlot = (id) => {
        const cur = student.confirmedSlots || [];
        onChange({ ...student, confirmedSlots: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
    };
    return (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 12, background: "#F8FAFF" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 10 }}>
                {student.name || `Student ${index + 1}`}
                <span style={{ fontSize: 11, fontWeight: 400, color: C.muted, marginLeft: 8 }}>
                    {student.yearGroup} · {student.level[0].toUpperCase() + student.level.slice(1)}
                </span>
            </div>
            <Lbl>Package</Lbl>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {settings.packages.map((p) => (
                    <button
                        key={p.id}
                        onClick={() => onChange({ ...student, pkg: p.id })}
                        style={{
                            flex: 1,
                            padding: "9px 4px",
                            borderRadius: 10,
                            border: "none",
                            cursor: "pointer",
                            textAlign: "center",
                            background: student.pkg === p.id ? C.navy : C.tag,
                            color: student.pkg === p.id ? "#fff" : C.text,
                        }}
                    >
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{p.hours}h/wk</div>
                        <div style={{ fontSize: 11, opacity: 0.8 }}>£{p.monthly}/mo</div>
                    </button>
                ))}
            </div>
            <Lbl>Start Date</Lbl>
            <Inp
                type="date"
                value={student.joinDate}
                onChange={(e) => onChange({ ...student, joinDate: e.target.value })}
                style={{ marginBottom: 10 }}
            />
            {calc && (
                <div
                    style={{
                        background: "#FFF0F8",
                        border: `1px solid #F9A8D4`,
                        borderRadius: 8,
                        padding: "10px 12px",
                        marginBottom: 12,
                        fontSize: 12,
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ color: C.muted }}>Reg fee</span>
                        <span>{fmt(settings.regFee)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ color: C.muted }}>
                            Pro-rata ({calc.weeksLeft}wk × {fmt(calc.weekly)}/wk{calc.proRata === calc.monthly ? " — capped" : ""})
                        </span>
                        <span>{fmt(calc.proRata)}</span>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontWeight: 800,
                            color: C.navy,
                            borderTop: `1px solid #F9A8D4`,
                            paddingTop: 6,
                            marginTop: 4,
                        }}
                    >
                        <span>First payment</span>
                        <span>{fmt(calc.total)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: C.pink, marginTop: 5 }}>
                        Monthly from next month: {fmt(calc.monthly)} — bank transfer on 1st
                    </div>
                </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Lbl>Confirmed Session Slots</Lbl>
                <label
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 11,
                        color: C.muted,
                        cursor: "pointer",
                        marginBottom: 4,
                    }}
                >
                    <input
                        type="checkbox"
                        checked={!!student.slotsTBC}
                        onChange={(e) => onChange({ ...student, slotsTBC: e.target.checked, confirmedSlots: [] })}
                    />
                    TBC
                </label>
            </div>
            {!student.slotsTBC ? (
                <>
                    {(branchSlots || []).map((slot) => {
                        const on = (student.confirmedSlots || []).includes(slot.id);
                        return (
                            <div
                                key={slot.id}
                                onClick={() => toggleSlot(slot.id)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "8px 0",
                                    borderBottom: `1px solid ${C.bg}`,
                                    cursor: "pointer",
                                    opacity: on ? 1 : 0.4,
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: on ? C.text : C.muted }}>{slot.day}</div>
                                    <div style={{ fontSize: 11, color: C.muted }}>{slot.time}</div>
                                </div>
                                <Toggle on={on} onToggle={() => toggleSlot(slot.id)} />
                            </div>
                        );
                    })}
                </>
            ) : (
                <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic", padding: "4px 0" }}>TBC — message will reflect this.</div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════
// PIN SCREEN
// ══════════════════════════════════════════════════════
function PinScreen({ correctPin, onUnlock }) {
    const [entry, setEntry] = useState("");
    const [error, setError] = useState(false);
    const check = () => {
        if (entry === correctPin) {
            sessionStorage.setItem("nhq_unlocked", "1");
            onUnlock();
        } else {
            setError(true);
            setEntry("");
            setTimeout(() => setError(false), 1500);
        }
    };
    const pad = (d) => {
        const cur = entry;
        if (cur.length < 6) {
            const n = cur + d;
            setEntry(n);
            if (n.length === correctPin.length && n === correctPin) {
                sessionStorage.setItem("nhq_unlocked", "1");
                onUnlock();
            } else if (n.length === correctPin.length) {
                setError(true);
                setTimeout(() => {
                    setError(false);
                    setEntry("");
                }, 1000);
            }
        }
    };
    return (
        <div
            style={{
                minHeight: "100vh",
                background: C.navy,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
            }}
        >
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: C.pink, marginBottom: 4 }}>
                NudgeHQ
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 32 }}>Enter Access PIN</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
                {Array.from({ length: correctPin.length }).map((_, i) => (
                    <div
                        key={i}
                        style={{
                            width: 16,
                            height: 16,
                            borderRadius: 8,
                            background: i < entry.length ? "#fff" : "rgba(255,255,255,.2)",
                            transition: "background .1s",
                        }}
                    />
                ))}
            </div>
            {error && <div style={{ color: C.pink, fontSize: 12, fontWeight: 700, marginBottom: 16 }}>Incorrect PIN — try again</div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, width: 220 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((d, i) => (
                    <button
                        key={i}
                        onClick={() => {
                            if (d === "⌫") setEntry((e) => e.slice(0, -1));
                            else if (d !== "") pad(String(d));
                        }}
                        style={{
                            height: 60,
                            borderRadius: 12,
                            border: "none",
                            cursor: d === "" ? "default" : "pointer",
                            fontSize: 22,
                            fontWeight: 600,
                            background: d === "" ? "transparent" : "rgba(255,255,255,.1)",
                            color: "#fff",
                            opacity: d === "" ? 0 : 1,
                        }}
                    >
                        {d}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════
// SETUP WIZARD
// ══════════════════════════════════════════════════════
function SetupWizard({ onComplete }) {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const start = () => onComplete({ ...DEFAULT_SETTINGS, businessName: name || "My Tuition Centre", generalPhone: phone });
    return (
        <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div
                style={{
                    background: C.white,
                    borderRadius: 16,
                    padding: 28,
                    maxWidth: 400,
                    width: "100%",
                    boxShadow: "0 4px 24px rgba(59,88,168,.12)",
                }}
            >
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: C.navy }}>Welcome to NudgeHQ</div>
                    <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Enquiry automation for tutoring centres</div>
                </div>
                <div style={{ marginBottom: 14 }}>
                    <Lbl>Business name</Lbl>
                    <Inp value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bright Minds Tuition" />
                </div>
                <div style={{ marginBottom: 20 }}>
                    <Lbl>Main phone number</Lbl>
                    <Inp value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0203 000 0000" type="tel" />
                </div>
                <Btn style={{ width: "100%", padding: 13 }} onClick={start}>
                    Get Started →
                </Btn>
                <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 12 }}>
                    Complete your branch details, payment links and timetable in the Settings tab after setup.
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════
export default function App() {
    const [mainTab, setMainTab] = useState("new");
    const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("nhq_unlocked") === "1");
    const [inquiries, setInquiries] = useState([]);
    const [templates, setTemplates] = useState(DEFAULT_TPL);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const inq = await sGet("nhq_inq", []);
            const tpl = await sGet("nhq_tpl", DEFAULT_TPL);
            const cfg = await sGet("nhq_settings", null);
            setInquiries(inq);
            setTemplates(tpl);
            if (cfg) setSettings(cfg);
            setLoading(false);
        })();
    }, []);

    const saveInq = async (inq) => {
        const u = [inq, ...inquiries.filter((i) => i.id !== inq.id)];
        setInquiries(u);
        await sSet("nhq_inq", u);
    };
    const updateInq = async (id, patch) => {
        const u = inquiries.map((i) => (i.id === id ? { ...i, ...patch } : i));
        setInquiries(u);
        await sSet("nhq_inq", u);
    };
    const saveTpl = async (tpl) => {
        setTemplates(tpl);
        await sSet("nhq_tpl", tpl);
    };
    const saveSettings = async (cfg) => {
        setSettings(cfg);
        await sSet("nhq_settings", cfg);
    };

    const pending = inquiries.filter((i) => i.status === "pending" && daysSince(i.createdAt) <= 14);
    const log60 = inquiries.filter((i) => daysSince(i.createdAt) <= 60);

    if (loading)
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "100vh",
                    background: C.bg,
                    color: C.muted,
                }}
            >
                Loading...
            </div>
        );
    if (!settings) return <SetupWizard onComplete={saveSettings} />;
    if (settings.pin && !unlocked) return <PinScreen correctPin={settings.pin} onUnlock={() => setUnlocked(true)} />;

    return (
        <div
            style={{
                fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
                background: C.bg,
                minHeight: "100vh",
                color: C.text,
            }}
        >
            <div style={{ background: C.navy, padding: "16px 16px 12px" }}>
                <div
                    style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: C.pink, marginBottom: 3 }}
                >
                    NudgeHQ
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>{settings.businessName || "My Business"}</div>
            </div>
            <div style={{ display: "flex", background: "#2D4A9C", borderBottom: `1px solid #1E3A8A`, overflowX: "auto" }}>
                {[
                    { id: "new", label: "+ New" },
                    { id: "pending", label: `Pending${pending.length ? ` (${pending.length})` : ""}` },
                    { id: "log", label: "Log" },
                    { id: "tpl", label: "Templates" },
                    { id: "settings", label: "Settings" },
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setMainTab(t.id)}
                        style={{
                            flexShrink: 0,
                            padding: "11px 16px",
                            border: "none",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 700,
                            background: "transparent",
                            color: mainTab === t.id ? "#fff" : "#93C5FD",
                            borderBottom: mainTab === t.id ? `2px solid ${C.pink}` : "2px solid transparent",
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
            <div style={{ padding: 14, maxWidth: 640, margin: "0 auto" }}>
                {mainTab === "new" && <NewTab onSave={saveInq} onUpdate={updateInq} templates={templates} settings={settings} />}
                {mainTab === "pending" && <PendingTab inquiries={pending} onUpdate={updateInq} settings={settings} templates={templates} />}
                {mainTab === "log" && <LogTab inquiries={log60} onUpdate={updateInq} />}
                {mainTab === "tpl" && <TplTab templates={templates} onSave={saveTpl} />}
                {mainTab === "settings" && <SettingsTab settings={settings} onSave={saveSettings} />}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════
// NEW ENQUIRY TAB
// ══════════════════════════════════════════════════════
function NewTab({ onSave, onUpdate, templates, settings }) {
    const [step, setStep] = useState(1);
    const [branchId, setBranchId] = useState(settings.branches[0]?.id || "");
    const [workflow, setWorkflow] = useState("enquiry");
    const [parentName, setParentName] = useState("");
    const [phone, setPhone] = useState("");
    const [students, setStudents] = useState([blankStu()]);
    const [payMethod, setPayMethod] = useState("sumup");
    const [selectedSlots, setSelected] = useState([]);
    const [messages, setMessages] = useState([]);
    const [editedMsgs, setEditedMsgs] = useState({});
    const [editingIdx, setEditingIdx] = useState(null);
    const [saved, setSaved] = useState(false);
    const [copied, setCopied] = useState(null);
    const [inqId, setInqId] = useState(null);
    const [sentSteps, setSentSteps] = useState([]);
    // sendState: { [index]: 'idle' | 'sending' | 'sent' | 'error' }
    const [sendState, setSendState] = useState({});
    const [intent, setIntent] = useState("proceed"); // "proceed" | "thinking"

    const branch = settings.branches.find((b) => b.id === branchId) || settings.branches[0];
    const branchSlots = branch?.slots || [];
    const grandTotal = students.reduce((s, st) => {
        const c = stuCalc(st, settings);
        return c ? s + c.total : s;
    }, 0);

    const updStu = (id, data) => setStudents((s) => s.map((x) => (x.id === id ? data : x)));
    const getMsg = (i) => (editedMsgs[i] !== undefined ? editedMsgs[i] : messages[i]?.content || "");
    const copyMsg = (i) => {
        navigator.clipboard.writeText(getMsg(i)).catch(() => {});
        setCopied(i);
        setTimeout(() => setCopied(null), 2000);
    };
    const toggleSl = (id) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

    const sendSms = async (i) => {
        if (!settings.voodoo?.apiKey || !settings.voodoo?.senderName) {
            alert("Add your Voodoo SMS API key and sender name in Settings first.");
            return;
        }
        if (!phone) {
            alert("No phone number logged for this enquiry — go back and add one.");
            return;
        }
        setSendState((s) => ({ ...s, [i]: "sending" }));
        try {
            const res = await fetch("/api/send-sms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    apiKey: settings.voodoo.apiKey,
                    senderName: settings.voodoo.senderName,
                    toNumber: phone,
                    body: getMsg(i),
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.success) {
                setSendState((s) => ({ ...s, [i]: "sent" }));
                // Auto-mark this step as sent on the saved enquiry. Add `i`
                // to the local list and persist via onUpdate so the Pending
                // tab's "X/N messages sent" counter ticks up immediately.
                if (inqId) {
                    const next = sentSteps.includes(i) ? sentSteps : [...sentSteps, i].sort((a, b) => a - b);
                    setSentSteps(next);
                    await onUpdate(inqId, { sentSteps: next });
                }
            } else {
                setSendState((s) => ({ ...s, [i]: "error" }));
                const reason = data?.error || `HTTP ${res.status}`;
                alert("Send failed: " + reason + "\n\nYou can tap Send SMS again to retry.");
            }
        } catch (err) {
            setSendState((s) => ({ ...s, [i]: "error" }));
            alert("Could not send — network/server error: " + (err?.message || "unknown") + "\n\nYou can tap Send SMS again to retry.");
        }
    };

    const doGenerate = async () => {
        const effectiveWorkflow = intent === "thinking" ? "nudge" : workflow;
        const msgs = generateMsgs(
            effectiveWorkflow,
            { parentName, students, branchId, grandTotal, selectedSlots, payMethod },
            templates,
            settings,
        );
        setMessages(msgs);
        setEditedMsgs({});
        setEditingIdx(null);
        setStep(3);
        // Filter local sentSteps to the new message length so stale
        // indices from a previous generation don't leak through.
        const validSent = sentSteps.filter((i) => i < msgs.length);
        if (validSent.length !== sentSteps.length) setSentSteps(validSent);

        if (inqId) {
            // Regenerate — patch the existing enquiry in place so its
            // sentSteps (and anything else) is preserved.
            await onUpdate(inqId, {
                messages: msgs,
                branchId,
                workflow,
                intent,
                parentName,
                phone,
                students,
                grandTotal,
                payMethod,
                sentSteps: validSent,
            });
        } else {
            // First generation — create the enquiry.
            const id = uid();
            setInqId(id);
            await onSave({
                id,
                createdAt: new Date().toISOString(),
                status: "pending",
                branchId,
                workflow,
                intent,
                parentName,
                phone,
                students,
                grandTotal,
                payMethod,
                messages: msgs,
                sentSteps: [],
            });
        }
        setSaved(true);
    };

    const reset = () => {
        setStep(1);
        setMessages([]);
        setEditedMsgs({});
        setSaved(false);
        setParentName("");
        setPhone("");
        setStudents([blankStu()]);
        setSelected([]);
        setPayMethod("sumup");
        setIntent("proceed");
        setInqId(null);
        setSentSteps([]);
        setSendState({});
    };

    const needsPackages = workflow === "enquiry";
    const needsSlots = workflow === "pricing";
    const needsStep2 = needsPackages || needsSlots;

    // ── STEP 1 ──────────────────────────────────────────
    if (step === 1)
        return (
            <>
                <div
                    style={{ background: "#EEF2FA", borderRadius: 10, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: C.navy }}
                >
                    🎤 <strong>Voice enabled</strong> — tap the mic next to any text field. Works in Chrome.
                </div>
                <Card>
                    <ST>Branch</ST>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {settings.branches.map((b) => (
                            <button
                                key={b.id}
                                onClick={() => {
                                    setBranchId(b.id);
                                    setSelected([]);
                                }}
                                style={{
                                    flex: 1,
                                    minWidth: 100,
                                    padding: 10,
                                    borderRadius: 8,
                                    border: "none",
                                    cursor: "pointer",
                                    fontWeight: 700,
                                    fontSize: 13,
                                    background: branchId === b.id ? C.navy : C.tag,
                                    color: branchId === b.id ? "#fff" : C.muted,
                                }}
                            >
                                📍 {b.name || "Branch"}
                            </button>
                        ))}
                    </div>
                </Card>
                <Card>
                    <ST>Workflow</ST>
                    {WF.map((w) => (
                        <button
                            key={w.id}
                            onClick={() => setWorkflow(w.id)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                width: "100%",
                                padding: 10,
                                borderRadius: 10,
                                border: `2px solid ${workflow === w.id ? C.navy : C.border}`,
                                background: workflow === w.id ? "#EEF2FA" : C.white,
                                cursor: "pointer",
                                marginBottom: 6,
                                textAlign: "left",
                            }}
                        >
                            <span style={{ fontSize: 18 }}>{w.icon}</span>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: workflow === w.id ? C.navy : C.text }}>{w.label}</div>
                                <div style={{ fontSize: 11, color: C.muted }}>{w.desc}</div>
                            </div>
                            {workflow === w.id && <span style={{ marginLeft: "auto", color: C.pink, fontWeight: 800 }}>✓</span>}
                        </button>
                    ))}
                </Card>
                <Card>
                    <ST>Parent / Guardian</ST>
                    <VField label="Name" value={parentName} onChange={setParentName} placeholder="e.g. Mrs Ahmed" />
                    <VField label="Mobile Number" value={phone} onChange={setPhone} placeholder="07700 900000" isPhone />
                </Card>
                {workflow !== "pricing" && workflow !== "info" && (
                    <Card>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <ST>Students</ST>
                            <button
                                onClick={() => setStudents((s) => [...s, blankStu()])}
                                style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: C.navy,
                                    background: C.tag,
                                    border: "none",
                                    borderRadius: 6,
                                    padding: "4px 10px",
                                    cursor: "pointer",
                                }}
                            >
                                + Add Sibling
                            </button>
                        </div>
                        {students.map((s, i) => (
                            <StudentCard
                                key={s.id}
                                student={s}
                                index={i}
                                isOnly={students.length === 1}
                                onChange={(data) => updStu(s.id, data)}
                                onRemove={() => setStudents((st) => st.filter((x) => x.id !== s.id))}
                            />
                        ))}
                    </Card>
                )}
                {["enquiry", "pricing", "info"].includes(workflow) && (
                    <Card>
                        <ST>Parent's Response</ST>
                        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                            <button
                                onClick={() => setIntent("proceed")}
                                style={{
                                    flex: 1,
                                    padding: "11px 8px",
                                    borderRadius: 8,
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    background: intent === "proceed" ? C.navy : C.tag,
                                    color: intent === "proceed" ? "#fff" : C.muted,
                                }}
                            >
                                ✓ Ready to Proceed
                            </button>
                            <button
                                onClick={() => setIntent("thinking")}
                                style={{
                                    flex: 1,
                                    padding: "11px 8px",
                                    borderRadius: 8,
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    background: intent === "thinking" ? C.pink : C.tag,
                                    color: intent === "thinking" ? "#fff" : C.muted,
                                }}
                            >
                                💭 Thinking About It
                            </button>
                        </div>
                        <div style={{ fontSize: 11, color: C.muted }}>
                            {intent === "proceed"
                                ? "Parent is ready — payment message sent immediately."
                                : "Parent needs time — softer message sent, follow-ups automated."}
                        </div>
                    </Card>
                )}
                <Btn style={{ width: "100%", padding: 13 }} onClick={() => (needsStep2 ? setStep(2) : doGenerate())}>
                    {needsPackages && intent === "thinking"
                        ? "Next: Add Details (Optional) →"
                        : needsPackages
                          ? "Next: Packages & Sessions →"
                          : needsSlots
                            ? "Next: Select Slots →"
                            : "Generate Message →"}
                </Btn>
            </>
        );

    // ── STEP 2 ──────────────────────────────────────────
    if (step === 2)
        return (
            <>
                {needsPackages && (
                    <>
                        <Card>
                            <ST>First Payment Method</ST>
                            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                                <button
                                    onClick={() => setPayMethod("sumup")}
                                    style={{
                                        flex: 1,
                                        padding: "10px 8px",
                                        borderRadius: 8,
                                        border: "none",
                                        cursor: "pointer",
                                        fontSize: 12,
                                        fontWeight: 700,
                                        background: payMethod === "sumup" ? C.pink : C.tag,
                                        color: payMethod === "sumup" ? "#fff" : C.muted,
                                    }}
                                >
                                    Card (SumUp)
                                </button>
                                <button
                                    onClick={() => setPayMethod("bank")}
                                    style={{
                                        flex: 1,
                                        padding: "10px 8px",
                                        borderRadius: 8,
                                        border: "none",
                                        cursor: "pointer",
                                        fontSize: 12,
                                        fontWeight: 700,
                                        background: payMethod === "bank" ? C.pink : C.tag,
                                        color: payMethod === "bank" ? "#fff" : C.muted,
                                    }}
                                >
                                    Bank Transfer
                                </button>
                            </div>
                            <div style={{ fontSize: 11, color: C.muted }}>
                                {payMethod === "sumup"
                                    ? "Parent pays by card — SumUp link sent in message."
                                    : "Parent pays by bank transfer — account details sent in message."}
                            </div>
                        </Card>
                        <Card>
                            <ST>Package & Confirmed Slots per Student</ST>
                            {students.map((s, i) => (
                                <StudentPkgCard
                                    key={s.id}
                                    student={s}
                                    index={i}
                                    branchSlots={branchSlots}
                                    settings={settings}
                                    onChange={(data) => updStu(s.id, data)}
                                />
                            ))}
                            {students.length > 1 && students.every((s) => s.pkg) && (
                                <div style={{ background: C.navy, borderRadius: 10, padding: "12px 14px" }}>
                                    {students.map((s, i) => {
                                        const c = stuCalc(s, settings);
                                        return c ? (
                                            <div
                                                key={s.id}
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    fontSize: 12,
                                                    color: "#BFDBFE",
                                                    marginBottom: 2,
                                                }}
                                            >
                                                <span>{s.name || `Student ${i + 1}`}</span>
                                                <span>{fmt(c.total)}</span>
                                            </div>
                                        ) : null;
                                    })}
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            fontSize: 15,
                                            fontWeight: 800,
                                            color: "#fff",
                                            borderTop: "1px solid rgba(255,255,255,.2)",
                                            paddingTop: 8,
                                            marginTop: 6,
                                        }}
                                    >
                                        <span>Grand total</span>
                                        <span>{fmt(grandTotal)}</span>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </>
                )}
                {needsSlots && (
                    <Card>
                        <ST>
                            Slots to Include{" "}
                            <span style={{ fontSize: 10, fontWeight: 400, color: C.muted }}>(leave all off = show full timetable)</span>
                        </ST>
                        {branchSlots.map((slot) => {
                            const on = selectedSlots.includes(slot.id);
                            return (
                                <div
                                    key={slot.id}
                                    onClick={() => toggleSl(slot.id)}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "8px 0",
                                        borderBottom: `1px solid ${C.bg}`,
                                        cursor: "pointer",
                                        opacity: on ? 1 : 0.4,
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: on ? C.text : C.muted }}>{slot.day}</div>
                                        <div style={{ fontSize: 11, color: C.muted }}>{slot.time}</div>
                                    </div>
                                    <Toggle on={on} onToggle={() => toggleSl(slot.id)} />
                                </div>
                            );
                        })}
                    </Card>
                )}
                {intent === "thinking" && (
                    <div
                        style={{
                            background: "#EEF2FA",
                            borderRadius: 8,
                            padding: "10px 12px",
                            marginBottom: 8,
                            fontSize: 12,
                            color: C.navy,
                        }}
                    >
                        💭 <strong>Thinking About It path.</strong> Only fill in package and session details if they were discussed on the
                        call. Skip if nothing was confirmed.
                    </div>
                )}
                <Btn variant="pink" style={{ width: "100%", padding: 13 }} onClick={doGenerate}>
                    Generate Messages →
                </Btn>
                {intent === "thinking" && (
                    <Btn
                        variant="ghost"
                        style={{ width: "100%", padding: 11, marginTop: 8 }}
                        onClick={() => {
                            setStudents((s) => s.map((x) => ({ ...x, pkg: null, confirmedSlots: [], slotsTBC: false })));
                            doGenerate();
                        }}
                    >
                        Skip Details → Generate Without Package Info
                    </Btn>
                )}
                <Btn variant="ghost" style={{ width: "100%", padding: 11, marginTop: 8 }} onClick={() => setStep(1)}>
                    ← Back
                </Btn>
            </>
        );

    // ── STEP 3 ──────────────────────────────────────────
    return (
        <>
            <div
                style={{
                    background: "#EEF2FA",
                    borderRadius: 10,
                    padding: "10px 12px",
                    marginBottom: 12,
                    border: `1px solid ${C.border}`,
                    fontSize: 12,
                    color: C.muted,
                }}
            >
                {WF.find((w) => w.id === workflow)?.icon} <strong>{WF.find((w) => w.id === workflow)?.label}</strong>
                {" · "}
                {branch?.name}
                {parentName && ` · ${parentName}`}
                {phone && ` · ${phone}`}
                {saved && <span style={{ marginLeft: 8, color: C.pink, fontWeight: 700 }}>✓ Saved</span>}
            </div>
            {messages.map((msg, i) => (
                <div
                    key={i}
                    style={{ background: "#F4F6FC", borderRadius: 10, padding: 12, marginBottom: 10, border: `1px solid ${C.border}` }}
                >
                    <div
                        style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: C.navy,
                            textTransform: "uppercase",
                            letterSpacing: 0.8,
                            marginBottom: 3,
                        }}
                    >
                        Step {i + 1}: {msg.step}
                    </div>
                    {msg.timing && <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>⏱ {msg.timing}</div>}
                    {editingIdx === i ? (
                        <textarea
                            value={getMsg(i)}
                            onChange={(e) => setEditedMsgs((m) => ({ ...m, [i]: e.target.value }))}
                            rows={10}
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: 8,
                                border: `2px solid ${C.pink}`,
                                fontSize: 13,
                                color: C.text,
                                boxSizing: "border-box",
                                resize: "vertical",
                                outline: "none",
                                lineHeight: 1.6,
                                whiteSpace: "pre-wrap",
                            }}
                        />
                    ) : (
                        <div
                            style={{
                                background: C.white,
                                borderRadius: 8,
                                padding: "10px 12px",
                                fontSize: 13,
                                lineHeight: 1.7,
                                color: C.text,
                                border: `1px solid ${C.border}`,
                                whiteSpace: "pre-wrap",
                            }}
                        >
                            {getMsg(i)}
                            {editedMsgs[i] !== undefined && <span style={{ fontSize: 10, color: C.pink, marginLeft: 8 }}>✏️ edited</span>}
                        </div>
                    )}
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        <button
                            onClick={() => setEditingIdx(editingIdx === i ? null : i)}
                            style={{
                                fontSize: 10,
                                fontWeight: 700,
                                border: "none",
                                borderRadius: 6,
                                padding: "3px 9px",
                                cursor: "pointer",
                                background: editingIdx === i ? "#FCE7F3" : C.tag,
                                color: editingIdx === i ? C.pink : C.navy,
                            }}
                        >
                            {editingIdx === i ? "✓ Done" : "✏️ Edit"}
                        </button>
                        <button
                            onClick={() => copyMsg(i)}
                            style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: C.navy,
                                background: C.tag,
                                border: "none",
                                borderRadius: 6,
                                padding: "3px 9px",
                                cursor: "pointer",
                            }}
                        >
                            {copied === i ? "✓ Copied" : "Copy"}
                        </button>
                        <button
                            onClick={() => sendSms(i)}
                            disabled={sendState[i] === "sending"}
                            title={
                                sendState[i] === "sending"
                                    ? "Sending…"
                                    : sentSteps.includes(i)
                                      ? "Already sent — tap to resend via Voodoo SMS"
                                      : "Send this message via Voodoo SMS"
                            }
                            style={{
                                fontSize: 10,
                                fontWeight: 700,
                                border: "none",
                                borderRadius: 6,
                                padding: "3px 9px",
                                cursor: sendState[i] === "sending" ? "default" : "pointer",
                                background:
                                    sendState[i] === "error"
                                        ? "#FEE2E2"
                                        : sentSteps.includes(i) || sendState[i] === "sent"
                                          ? "#D1FAE5"
                                          : C.pink,
                                color:
                                    sendState[i] === "error"
                                        ? C.red
                                        : sentSteps.includes(i) || sendState[i] === "sent"
                                          ? "#065F46"
                                          : "#fff",
                                opacity: sendState[i] === "sending" ? 0.6 : 1,
                            }}
                        >
                            {sendState[i] === "sending"
                                ? "Sending…"
                                : sendState[i] === "error"
                                  ? "↻ Retry Send"
                                  : sentSteps.includes(i) || sendState[i] === "sent"
                                    ? "✓ Sent · Resend"
                                    : "Send SMS"}
                        </button>
                    </div>
                </div>
            ))}
            <div
                style={{
                    background: "#FDF2F8",
                    border: `1px solid #F9A8D4`,
                    borderRadius: 8,
                    padding: "10px 12px",
                    fontSize: 12,
                    color: "#9D174D",
                    marginBottom: 12,
                }}
            >
                💬 <strong>Send via Voodoo SMS:</strong> add your API key and sender name in Settings, then tap <em>Send SMS</em> on any
                message above. Sent steps are marked automatically.
            </div>
            <Btn variant="ghost" style={{ width: "100%", padding: 12, marginBottom: 8 }} onClick={doGenerate}>
                ↺ Regenerate
            </Btn>
            <Btn variant="ghost" style={{ width: "100%", padding: 12, marginBottom: 8 }} onClick={() => setStep(needsStep2 ? 2 : 1)}>
                ← Back
            </Btn>
            <Btn variant="ghost" style={{ width: "100%", padding: 12 }} onClick={reset}>
                + New Enquiry
            </Btn>
        </>
    );
}

// ══════════════════════════════════════════════════════
// PENDING TAB
// ══════════════════════════════════════════════════════
function PendingTab({ inquiries, onUpdate, settings, templates }) {
    const [expanded, setExpanded] = useState({});
    const [switchingId, setSwitchingId] = useState(null);
    const [switchData, setSwitchData] = useState({});

    const openSwitch = (inq) => {
        setSwitchingId(inq.id);
        setSwitchData({
            students: (inq.students || []).map((s) => ({ ...s, pkg: null, confirmedSlots: [], slotsTBC: false })),
            payMethod: "sumup",
        });
        setExpanded((e) => ({ ...e, [inq.id]: false }));
    };

    const doSwitch = async (inq) => {
        const branch = settings.branches.find((b) => b.id === inq.branchId) || settings.branches[0];
        const updStudents = switchData.students || [];
        const grandTotal = updStudents.reduce((s, st) => {
            const c = stuCalc(st, settings);
            return c ? s + c.total : s;
        }, 0);
        const msgs = generateMsgs(
            "enquiry",
            {
                parentName: inq.parentName,
                students: updStudents,
                branchId: inq.branchId,
                grandTotal,
                selectedSlots: [],
                payMethod: switchData.payMethod || "sumup",
            },
            templates || DEFAULT_TPL,
            settings,
        );
        await onUpdate(inq.id, {
            intent: "proceed",
            messages: msgs,
            sentSteps: [],
            students: updStudents,
            grandTotal,
            payMethod: switchData.payMethod || "sumup",
        });
        setSwitchingId(null);
        setSwitchData({});
    };
    const sorted = [...inquiries].sort((a, b) => daysSince(b.createdAt) - daysSince(a.createdAt));
    const toggleSent = async (inq, idx) => {
        const cur = inq.sentSteps || [];
        const next = cur.includes(idx) ? cur.filter((x) => x !== idx) : [...cur, idx].sort((a, b) => a - b);
        await onUpdate(inq.id, { sentSteps: next });
    };

    if (!sorted.length)
        return (
            <Card style={{ textAlign: "center", padding: "32px 14px" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>No pending enquiries</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>All caught up within 14 days</div>
            </Card>
        );

    return (
        <>
            {sorted.map((inq) => {
                const days = daysSince(inq.createdAt);
                const urgency = days >= 10 ? C.red : days >= 7 ? "#F59E0B" : C.pink;
                const msgs = inq.messages || [];
                const sent = inq.sentSteps || [];
                const stage = sent.length;
                const isExp = expanded[inq.id];
                const branchName = settings?.branches.find((b) => b.id === inq.branchId)?.name || inq.branchId;
                return (
                    <Card key={inq.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 700 }}>{inq.parentName || "Unknown"}</div>
                                <div style={{ fontSize: 12, color: C.muted }}>
                                    {inq.phone} · {branchName} · {WF.find((w) => w.id === inq.workflow)?.label}
                                </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: urgency }}>{days}d ago</div>
                                <div style={{ fontSize: 10, color: C.muted }}>{new Date(inq.createdAt).toLocaleDateString("en-GB")}</div>
                            </div>
                        </div>
                        {msgs.length > 0 && (
                            <div
                                style={{
                                    background: C.tag,
                                    borderRadius: 8,
                                    padding: "7px 10px",
                                    marginBottom: 8,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>
                                        {stage === 0 ? "No messages sent yet" : `Step ${stage} of ${msgs.length} sent`}
                                    </div>
                                    {stage > 0 && stage < msgs.length && (
                                        <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>Next: {msgs[stage]?.step}</div>
                                    )}
                                    {stage === msgs.length && (
                                        <div style={{ fontSize: 11, color: C.pink, marginTop: 1 }}>All messages sent ✓</div>
                                    )}
                                </div>
                                <button
                                    onClick={() => setExpanded((e) => ({ ...e, [inq.id]: !isExp }))}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        color: C.navy,
                                        fontSize: 12,
                                        fontWeight: 700,
                                    }}
                                >
                                    {isExp ? "Hide" : "View"}
                                </button>
                            </div>
                        )}
                        {isExp && msgs.length > 0 && (
                            <div style={{ marginBottom: 10, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
                                {msgs.map((msg, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            display: "flex",
                                            gap: 10,
                                            alignItems: "flex-start",
                                            padding: "9px 10px",
                                            background: sent.includes(i) ? "#FDF2F8" : C.white,
                                            borderBottom: i < msgs.length - 1 ? `1px solid ${C.border}` : "none",
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={sent.includes(i)}
                                            onChange={() => toggleSent(inq, i)}
                                            style={{ marginTop: 2, flexShrink: 0, accentColor: C.pink }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div
                                                style={{
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    color: sent.includes(i) ? C.pink : C.muted,
                                                    marginBottom: 2,
                                                }}
                                            >
                                                Step {i + 1}: {msg.step}
                                                {sent.includes(i) ? " · ✓" : ""}
                                            </div>
                                            <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {inq.students?.length > 0 && (
                            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
                                {inq.students
                                    .map((s) => s.name)
                                    .filter(Boolean)
                                    .join(", ") || "Students TBC"}
                                {inq.grandTotal > 0 && (
                                    <span style={{ marginLeft: 6, fontWeight: 700, color: C.navy }}>· {fmt(inq.grandTotal)}</span>
                                )}
                            </div>
                        )}
                        {days >= 3 && stage < (msgs.length || 1) && (
                            <div
                                style={{
                                    background: "#FFF7ED",
                                    borderRadius: 8,
                                    padding: "7px 10px",
                                    fontSize: 11,
                                    color: "#92400E",
                                    marginBottom: 8,
                                }}
                            >
                                ⏰ {days} days — consider sending step {stage + 1}.
                            </div>
                        )}
                        {inq.intent === "thinking" && switchingId !== inq.id && (
                            <div style={{ marginBottom: 8 }}>
                                <Btn
                                    variant="ghost"
                                    style={{
                                        width: "100%",
                                        fontSize: 12,
                                        padding: 8,
                                        border: `1px solid ${C.pink}`,
                                        color: C.pink,
                                        background: "#FDF2F8",
                                    }}
                                    onClick={() => openSwitch(inq)}
                                >
                                    ↗ Parent wants to proceed — Switch Path
                                </Btn>
                            </div>
                        )}
                        {switchingId === inq.id && (
                            <div
                                style={{
                                    border: `2px solid ${C.pink}`,
                                    borderRadius: 10,
                                    padding: 12,
                                    marginBottom: 10,
                                    background: "#FDF2F8",
                                }}
                            >
                                <div style={{ fontSize: 12, fontWeight: 700, color: C.pink, marginBottom: 10 }}>
                                    ↗ Switching to Proceed — confirm details
                                </div>
                                <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
                                    Select package and sessions for each student, then generate the payment message.
                                </div>
                                {(switchData.students || []).map((s, si) => {
                                    const branchObj = settings.branches.find((b) => b.id === inq.branchId) || settings.branches[0];
                                    return (
                                        <div
                                            key={s.id}
                                            style={{
                                                border: `1px solid ${C.border}`,
                                                borderRadius: 8,
                                                padding: 10,
                                                marginBottom: 8,
                                                background: C.white,
                                            }}
                                        >
                                            <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 8 }}>
                                                {s.name || `Student ${si + 1}`}
                                            </div>
                                            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Package</div>
                                            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                                                {settings.packages.map((p) => (
                                                    <button
                                                        key={p.id}
                                                        onClick={() =>
                                                            setSwitchData((d) => ({
                                                                ...d,
                                                                students: d.students.map((x, xi) => (xi === si ? { ...x, pkg: p.id } : x)),
                                                            }))
                                                        }
                                                        style={{
                                                            flex: 1,
                                                            minWidth: 60,
                                                            padding: "7px 4px",
                                                            borderRadius: 8,
                                                            border: "none",
                                                            cursor: "pointer",
                                                            textAlign: "center",
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            background: s.pkg === p.id ? C.navy : C.tag,
                                                            color: s.pkg === p.id ? "#fff" : C.text,
                                                        }}
                                                    >
                                                        {p.hours}h/wk
                                                        <br />
                                                        <span style={{ fontWeight: 400 }}>£{p.monthly}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Session Slot</div>
                                            {(branchObj?.slots || []).map((slot) => {
                                                const on = (s.confirmedSlots || []).includes(slot.id);
                                                return (
                                                    <div
                                                        key={slot.id}
                                                        onClick={() =>
                                                            setSwitchData((d) => ({
                                                                ...d,
                                                                students: d.students.map((x, xi) =>
                                                                    xi === si
                                                                        ? {
                                                                              ...x,
                                                                              confirmedSlots: on
                                                                                  ? x.confirmedSlots.filter((c) => c !== slot.id)
                                                                                  : [...(x.confirmedSlots || []), slot.id],
                                                                          }
                                                                        : x,
                                                                ),
                                                            }))
                                                        }
                                                        style={{
                                                            display: "flex",
                                                            justifyContent: "space-between",
                                                            alignItems: "center",
                                                            padding: "6px 0",
                                                            borderBottom: `1px solid ${C.bg}`,
                                                            cursor: "pointer",
                                                            opacity: on ? 1 : 0.45,
                                                        }}
                                                    >
                                                        <span style={{ fontSize: 12, color: on ? C.text : C.muted }}>
                                                            {slot.day} {slot.time}
                                                        </span>
                                                        <Toggle on={on} onToggle={() => {}} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                                <div style={{ marginBottom: 10 }}>
                                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Payment Method</div>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        {["sumup", "bank"].map((m) => (
                                            <button
                                                key={m}
                                                onClick={() => setSwitchData((d) => ({ ...d, payMethod: m }))}
                                                style={{
                                                    flex: 1,
                                                    padding: "8px 4px",
                                                    borderRadius: 8,
                                                    border: "none",
                                                    cursor: "pointer",
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    background: switchData.payMethod === m ? C.pink : C.tag,
                                                    color: switchData.payMethod === m ? "#fff" : C.muted,
                                                }}
                                            >
                                                {m === "sumup" ? "Card (SumUp)" : "Bank Transfer"}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: 8 }}>
                                    <Btn variant="pink" style={{ flex: 1, fontSize: 12, padding: 8 }} onClick={() => doSwitch(inq)}>
                                        Generate Payment Message →
                                    </Btn>
                                    <Btn
                                        variant="ghost"
                                        style={{ fontSize: 12, padding: 8 }}
                                        onClick={() => {
                                            setSwitchingId(null);
                                            setSwitchData({});
                                        }}
                                    >
                                        Cancel
                                    </Btn>
                                </div>
                            </div>
                        )}
                        <div style={{ display: "flex", gap: 8 }}>
                            <Btn
                                variant="success"
                                style={{ flex: 1, fontSize: 12, padding: 8 }}
                                onClick={() => onUpdate(inq.id, { status: "enrolled" })}
                            >
                                ✓ Enrolled
                            </Btn>
                            <Btn
                                variant="danger"
                                style={{ flex: 1, fontSize: 12, padding: 8 }}
                                onClick={() => onUpdate(inq.id, { status: "declined" })}
                            >
                                ✕ Declined
                            </Btn>
                        </div>
                    </Card>
                );
            })}
        </>
    );
}

// ══════════════════════════════════════════════════════
// LOG TAB
// ══════════════════════════════════════════════════════
function LogTab({ inquiries, onUpdate }) {
    const sorted = [...inquiries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return (
        <>
            <div
                style={{
                    background: "#EEF2FA",
                    borderRadius: 10,
                    padding: "10px 12px",
                    marginBottom: 12,
                    fontSize: 12,
                    color: C.navy,
                    lineHeight: 1.6,
                }}
            >
                <strong>60-day record.</strong> Enrolled/Declined entries stay here as history. Phase 2: JotForms auto-updates to Enrolled.
            </div>
            {!sorted.length ? (
                <Card style={{ textAlign: "center", padding: "32px 14px" }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>No enquiries yet</div>
                </Card>
            ) : (
                <>
                    {sorted.map((inq) => (
                        <Card key={inq.id} style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                                <div style={{ fontSize: 13, fontWeight: 700 }}>{inq.parentName || "Unknown"}</div>
                                <StatusBadge status={inq.status} />
                            </div>
                            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
                                {new Date(inq.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                {" · "}
                                {WF.find((w) => w.id === inq.workflow)?.label}
                                {inq.phone && ` · ${inq.phone}`}
                            </div>
                            {inq.students?.length > 0 && (
                                <div style={{ fontSize: 11, color: C.text, marginBottom: 4 }}>
                                    {inq.students
                                        .map((s, i) => `${s.name || `Student ${i + 1}`}${s.yearGroup ? ` (${s.yearGroup})` : ""}`)
                                        .join(" · ")}
                                </div>
                            )}
                            {inq.grandTotal > 0 && (
                                <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 4 }}>
                                    First payment: {fmt(inq.grandTotal)}
                                </div>
                            )}
                            {inq.messages?.length > 0 && (
                                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
                                    {(inq.sentSteps || []).length}/{inq.messages.length} messages sent
                                </div>
                            )}
                            {inq.status === "pending" && (
                                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                                    <Btn
                                        variant="success"
                                        style={{ fontSize: 11, padding: "5px 10px" }}
                                        onClick={() => onUpdate(inq.id, { status: "enrolled" })}
                                    >
                                        Enrolled
                                    </Btn>
                                    <Btn
                                        variant="danger"
                                        style={{ fontSize: 11, padding: "5px 10px" }}
                                        onClick={() => onUpdate(inq.id, { status: "declined" })}
                                    >
                                        Declined
                                    </Btn>
                                </div>
                            )}
                        </Card>
                    ))}
                </>
            )}
        </>
    );
}

// ══════════════════════════════════════════════════════
// TEMPLATES TAB
// ══════════════════════════════════════════════════════
function TplTab({ templates, onSave }) {
    const [draft, setDraft] = useState(templates);
    const [saved, setSaved] = useState(false);
    const [showVar, setShowVar] = useState(false);
    const save = async () => {
        await onSave(draft);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };
    const sections = [
        { label: "👋 New Enquiry", steps: STEPS.enquiry },
        { label: "📅 Trial", steps: STEPS.trial },
        { label: "💷 Pricing", steps: STEPS.pricing },
        { label: "ℹ️ General Info", steps: STEPS.info },
        { label: "🔔 Follow-up", steps: STEPS.followup },
    ];
    return (
        <>
            <Card style={{ background: "#EEF2FA", border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 12, color: C.navy, fontWeight: 700 }}>Variable Reference</div>
                    <button
                        onClick={() => setShowVar(!showVar)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: C.navy, fontSize: 12 }}
                    >
                        {showVar ? "Hide ▲" : "Show ▼"}
                    </button>
                </div>
                {showVar && (
                    <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
                            Use these placeholders in templates — auto-replaced when messages are generated.
                        </div>
                        {VARS.map((v) => (
                            <div key={v.v} style={{ display: "flex", gap: 8, padding: "4px 0", borderBottom: `1px solid ${C.border}` }}>
                                <code style={{ fontSize: 10, color: C.pink, fontWeight: 700, flexShrink: 0, minWidth: 170 }}>{v.v}</code>
                                <span style={{ fontSize: 11, color: C.muted }}>{v.d}</span>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
            {sections.map((sec) => (
                <Card key={sec.label}>
                    <ST>{sec.label}</ST>
                    {sec.steps.map((step) => (
                        <div key={step.key} style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 2 }}>{step.label}</div>
                            <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>⏱ {step.timing}</div>
                            <textarea
                                value={draft[step.key] || ""}
                                onChange={(e) => setDraft((d) => ({ ...d, [step.key]: e.target.value }))}
                                rows={7}
                                style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: 8,
                                    border: `1px solid ${C.border}`,
                                    fontSize: 12,
                                    color: C.text,
                                    boxSizing: "border-box",
                                    resize: "vertical",
                                    lineHeight: 1.6,
                                    outline: "none",
                                    whiteSpace: "pre-wrap",
                                }}
                            />
                        </div>
                    ))}
                </Card>
            ))}
            <div style={{ display: "flex", gap: 8 }}>
                <Btn style={{ flex: 1, padding: 12 }} onClick={save}>
                    {saved ? "✓ Saved!" : "Save All Templates"}
                </Btn>
                <Btn variant="ghost" style={{ padding: 12 }} onClick={() => setDraft(DEFAULT_TPL)}>
                    Reset
                </Btn>
            </div>
        </>
    );
}

// ══════════════════════════════════════════════════════
// SETTINGS TAB
// ══════════════════════════════════════════════════════
function SettingsTab({ settings, onSave }) {
    const [draft, setDraft] = useState(JSON.parse(JSON.stringify(settings)));
    const [saved, setSaved] = useState(false);
    const [openBranch, setOpenBranch] = useState(settings.branches[0]?.id || null);

    const save = async () => {
        await onSave(draft);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const addBranch = () => {
        const b = { id: uid(), name: "", phone: "", email: "", sumupLink: "", calendlyLink: "", bankSort: "", bankAcct: "", slots: [] };
        setDraft((d) => ({ ...d, branches: [...d.branches, b] }));
    };
    const removeBranch = (id) => setDraft((d) => ({ ...d, branches: d.branches.filter((b) => b.id !== id) }));
    const updBranch = (id, field, val) =>
        setDraft((d) => ({ ...d, branches: d.branches.map((b) => (b.id === id ? { ...b, [field]: val } : b)) }));
    const addSlot = (bId) =>
        setDraft((d) => ({
            ...d,
            branches: d.branches.map((b) => (b.id === bId ? { ...b, slots: [...b.slots, { id: uid(), day: "Monday", time: "" }] } : b)),
        }));
    const removeSlot = (bId, sId) =>
        setDraft((d) => ({
            ...d,
            branches: d.branches.map((b) => (b.id === bId ? { ...b, slots: b.slots.filter((s) => s.id !== sId) } : b)),
        }));
    const updSlot = (bId, sId, field, val) =>
        setDraft((d) => ({
            ...d,
            branches: d.branches.map((b) =>
                b.id === bId ? { ...b, slots: b.slots.map((s) => (s.id === sId ? { ...s, [field]: val } : s)) } : b,
            ),
        }));
    const addPkg = () => setDraft((d) => ({ ...d, packages: [...d.packages, { id: uid(), hours: 1, monthly: 50 }] }));
    const removePkg = (id) => setDraft((d) => ({ ...d, packages: d.packages.filter((p) => p.id !== id) }));
    const updPkg = (id, field, val) =>
        setDraft((d) => ({ ...d, packages: d.packages.map((p) => (p.id === id ? { ...p, [field]: val } : p)) }));

    const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const Sub = ({ children }) => (
        <div style={{ fontSize: 11, fontWeight: 700, color: C.pink, textTransform: "uppercase", letterSpacing: 1, margin: "14px 0 8px" }}>
            {children}
        </div>
    );

    return (
        <>
            <Card style={{ background: "#EEF2FA", border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, color: C.navy, lineHeight: 1.6 }}>
                    <strong>White-label settings.</strong> Each business configures their own details here. Changes take effect immediately
                    on next message generated.
                </div>
            </Card>

            {/* Business */}
            <Card>
                <ST>Business</ST>
                <div style={{ marginBottom: 10 }}>
                    <Lbl>Business Name</Lbl>
                    <Inp value={draft.businessName} onChange={(e) => setDraft((d) => ({ ...d, businessName: e.target.value }))} />
                </div>
                <div style={{ marginBottom: 10 }}>
                    <Lbl>Bank Account Name</Lbl>
                    <Inp value={draft.bankName} onChange={(e) => setDraft((d) => ({ ...d, bankName: e.target.value }))} />
                </div>
                <div style={{ marginBottom: 10 }}>
                    <Lbl>General Phone (main number)</Lbl>
                    <Inp
                        value={draft.generalPhone}
                        onChange={(e) => setDraft((d) => ({ ...d, generalPhone: e.target.value }))}
                        placeholder="0203 000 0000"
                    />
                </div>
                <div style={{ marginBottom: 10 }}>
                    <Lbl>Registration Fee (£)</Lbl>
                    <Inp type="number" value={draft.regFee} onChange={(e) => setDraft((d) => ({ ...d, regFee: Number(e.target.value) }))} />
                </div>
                <Lbl>Enrolment Form Link</Lbl>
                <Inp
                    value={draft.jotformsLink}
                    onChange={(e) => setDraft((d) => ({ ...d, jotformsLink: e.target.value }))}
                    placeholder="https://..."
                />
            </Card>

            {/* Packages */}
            <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <ST>Packages</ST>
                    <button
                        onClick={addPkg}
                        style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: C.navy,
                            background: C.tag,
                            border: "none",
                            borderRadius: 6,
                            padding: "4px 10px",
                            cursor: "pointer",
                        }}
                    >
                        + Add
                    </button>
                </div>
                {draft.packages.map((p) => (
                    <div key={p.id} style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 10 }}>
                        <div style={{ flex: 1 }}>
                            <Lbl>Hours/wk</Lbl>
                            <Inp type="number" value={p.hours} onChange={(e) => updPkg(p.id, "hours", Number(e.target.value))} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <Lbl>£/month</Lbl>
                            <Inp type="number" value={p.monthly} onChange={(e) => updPkg(p.id, "monthly", Number(e.target.value))} />
                        </div>
                        {draft.packages.length > 1 && (
                            <button
                                onClick={() => removePkg(p.id)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: C.red,
                                    cursor: "pointer",
                                    fontSize: 18,
                                    paddingBottom: 10,
                                }}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                ))}
            </Card>

            {/* Branches */}
            <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <ST>Branches</ST>
                    <button
                        onClick={addBranch}
                        style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: C.navy,
                            background: C.tag,
                            border: "none",
                            borderRadius: 6,
                            padding: "4px 10px",
                            cursor: "pointer",
                        }}
                    >
                        + Add Branch
                    </button>
                </div>
                {draft.branches.map((b) => (
                    <div key={b.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
                        <div
                            onClick={() => setOpenBranch(openBranch === b.id ? null : b.id)}
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "12px 14px",
                                cursor: "pointer",
                                background: "#F8FAFF",
                            }}
                        >
                            <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>📍 {b.name || "Unnamed Branch"}</span>
                            <span style={{ color: C.muted, fontSize: 12 }}>{openBranch === b.id ? "▲" : "▼"}</span>
                        </div>
                        {openBranch === b.id && (
                            <div style={{ padding: "12px 14px" }}>
                                <div style={{ marginBottom: 8 }}>
                                    <Lbl>Branch Name</Lbl>
                                    <Inp value={b.name} onChange={(e) => updBranch(b.id, "name", e.target.value)} />
                                </div>
                                <div style={{ marginBottom: 8 }}>
                                    <Lbl>Direct Phone</Lbl>
                                    <Inp
                                        value={b.phone}
                                        onChange={(e) => updBranch(b.id, "phone", e.target.value)}
                                        placeholder="07xxx xxxxxx"
                                    />
                                </div>
                                <div style={{ marginBottom: 8 }}>
                                    <Lbl>Email</Lbl>
                                    <Inp
                                        value={b.email}
                                        onChange={(e) => updBranch(b.id, "email", e.target.value)}
                                        placeholder="branch@email.com"
                                    />
                                </div>

                                <Sub>Payment Details</Sub>
                                <div style={{ marginBottom: 8 }}>
                                    <Lbl>SumUp Card Payment Link</Lbl>
                                    <Inp
                                        value={b.sumupLink}
                                        onChange={(e) => updBranch(b.id, "sumupLink", e.target.value)}
                                        placeholder="https://pay.sumup.com/..."
                                    />
                                </div>
                                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                                    <div style={{ flex: 1 }}>
                                        <Lbl>Bank Sort Code</Lbl>
                                        <Inp
                                            value={b.bankSort}
                                            onChange={(e) => updBranch(b.id, "bankSort", e.target.value)}
                                            placeholder="00-00-00"
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <Lbl>Account Number</Lbl>
                                        <Inp
                                            value={b.bankAcct}
                                            onChange={(e) => updBranch(b.id, "bankAcct", e.target.value)}
                                            placeholder="00000000"
                                        />
                                    </div>
                                </div>

                                <Sub>Booking</Sub>
                                <div style={{ marginBottom: 8 }}>
                                    <Lbl>Calendly Trial Link</Lbl>
                                    <Inp
                                        value={b.calendlyLink}
                                        onChange={(e) => updBranch(b.id, "calendlyLink", e.target.value)}
                                        placeholder="https://calendly.com/..."
                                    />
                                </div>

                                <Sub>Timetable</Sub>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                    <Lbl>Session Slots</Lbl>
                                    <button
                                        onClick={() => addSlot(b.id)}
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: C.navy,
                                            background: C.tag,
                                            border: "none",
                                            borderRadius: 6,
                                            padding: "3px 8px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        + Add Slot
                                    </button>
                                </div>
                                {(b.slots || []).length === 0 && (
                                    <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic", marginBottom: 8 }}>
                                        No slots added yet — tap + Add Slot
                                    </div>
                                )}
                                {(b.slots || []).map((s) => (
                                    <div
                                        key={s.id}
                                        style={{
                                            marginBottom: 8,
                                            border: `1px solid ${C.border}`,
                                            borderRadius: 8,
                                            padding: "8px 10px",
                                            background: C.bg,
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                marginBottom: 6,
                                            }}
                                        >
                                            <span style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>Slot</span>
                                            <button
                                                onClick={() => removeSlot(b.id, s.id)}
                                                style={{
                                                    background: "none",
                                                    border: "none",
                                                    color: C.red,
                                                    cursor: "pointer",
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                }}
                                            >
                                                ✕ Remove
                                            </button>
                                        </div>
                                        <div style={{ marginBottom: 6 }}>
                                            <Lbl>Day</Lbl>
                                            <Sel value={s.day} onChange={(e) => updSlot(b.id, s.id, "day", e.target.value)}>
                                                {DAYS.map((d) => (
                                                    <option key={d}>{d}</option>
                                                ))}
                                            </Sel>
                                        </div>
                                        <div>
                                            <Lbl>Time (e.g. 5:00pm–7:00pm)</Lbl>
                                            <Inp
                                                value={s.time}
                                                onChange={(e) => updSlot(b.id, s.id, "time", e.target.value)}
                                                placeholder="5:00pm–7:00pm"
                                            />
                                        </div>
                                    </div>
                                ))}

                                {draft.branches.length > 1 && (
                                    <button
                                        onClick={() => removeBranch(b.id)}
                                        style={{
                                            marginTop: 10,
                                            background: "#FEE2E2",
                                            color: C.red,
                                            border: "none",
                                            borderRadius: 8,
                                            padding: "6px 12px",
                                            fontSize: 12,
                                            fontWeight: 700,
                                            cursor: "pointer",
                                        }}
                                    >
                                        Remove this branch
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </Card>

            {/* Access PIN */}
            <Card>
                <ST>Access PIN</ST>
                <div
                    style={{
                        background: "#EEF2FA",
                        borderRadius: 8,
                        padding: "10px 12px",
                        marginBottom: 12,
                        fontSize: 12,
                        color: C.navy,
                        lineHeight: 1.6,
                    }}
                >
                    Set a PIN to lock the app. Anyone opening the URL must enter this to access it. Leave blank for no PIN. 4–6 digits
                    recommended.
                </div>
                <Lbl>PIN (numbers only, 4–6 digits)</Lbl>
                <Inp
                    value={draft.pin || ""}
                    onChange={(e) => setDraft((d) => ({ ...d, pin: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                    placeholder="e.g. 4821"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                />
                {draft.pin && (
                    <div style={{ fontSize: 11, color: C.pink, marginTop: 6, fontWeight: 600 }}>
                        PIN set — share this with your customer only. Keep it secret.
                    </div>
                )}
            </Card>

            {/* Voodoo SMS */}
            <Card>
                <ST>SMS (Voodoo SMS)</ST>
                <div
                    style={{
                        background: "#EEF2FA",
                        borderRadius: 8,
                        padding: "10px 12px",
                        marginBottom: 12,
                        fontSize: 12,
                        color: C.navy,
                        lineHeight: 1.6,
                    }}
                >
                    Each business uses their own Voodoo SMS account. Sign up at voodoosms.com and go to Send SMS → API SMS → HTTP API to get
                    your API key. SMS costs approximately £0.04 per message.
                </div>
                <div style={{ marginBottom: 12 }}>
                    <Lbl>API Key</Lbl>
                    <Inp
                        type="password"
                        value={draft.voodoo?.apiKey || ""}
                        onChange={(e) => setDraft((d) => ({ ...d, voodoo: { ...d.voodoo, apiKey: e.target.value } }))}
                        placeholder="Your Voodoo SMS API key"
                    />
                </div>
                <div>
                    <Lbl>Sender Name (max 11 characters — shown as "from" on recipient's phone)</Lbl>
                    <Inp
                        value={draft.voodoo?.senderName || ""}
                        onChange={(e) => setDraft((d) => ({ ...d, voodoo: { ...d.voodoo, senderName: e.target.value.slice(0, 11) } }))}
                        placeholder="e.g. NudgeHQ"
                    />
                    {draft.voodoo?.senderName && (
                        <div style={{ fontSize: 11, color: C.pink, marginTop: 4 }}>
                            Recipients will see "{draft.voodoo.senderName}" as the sender. They cannot reply directly.
                        </div>
                    )}
                </div>
            </Card>

            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                <Btn style={{ flex: 1, padding: 12 }} onClick={save}>
                    {saved ? "✓ Saved!" : "Save Settings"}
                </Btn>
                <Btn variant="ghost" style={{ padding: 12 }} onClick={() => setDraft(JSON.parse(JSON.stringify(settings)))}>
                    Cancel
                </Btn>
            </div>
        </>
    );
}
