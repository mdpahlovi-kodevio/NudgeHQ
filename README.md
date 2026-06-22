# NudgeHQ

**Enquiry automation & SMS follow-up for tutoring centres.**

NudgeHQ is a white-label, mobile-first PWA that helps tutoring business staff turn phone enquiries into enrolled students. After taking a call, a staff member opens the app, enters the family's details (by typing or voice), and NudgeHQ instantly generates a personalised, multi-step WhatsApp/SMS message sequence — complete with confirmed session times, package pricing, pro-rata first payment, payment links and follow-up reminders — that can be copied or sent directly via [Voodoo SMS](https://voodoosms.com).

Built with **React 18 + Vite**, deployed to **Vercel** (where the SMS send runs as a serverless function), and installed to the home screen like a native app.

---

## Table of Contents

1. [What it solves](#1-what-it-solves)
2. [Tech stack](#2-tech-stack)
3. [Project structure](#3-project-structure)
4. [Getting started](#4-getting-started)
5. [Data model & persistence](#5-data-model--persistence)
6. [The full walkthrough — how the app works](#6-the-full-walkthrough--how-the-app-works)
    - [First run: Setup Wizard](#first-run-setup-wizard)
    - [PIN lock](#pin-lock)
    - [Tab 1 — + New (the enquiry engine)](#tab-1--new-the-enquiry-engine)
    - [Tab 2 — Pending](#tab-2--pending)
    - [Tab 3 — Log](#tab-3--log)
    - [Tab 4 — Templates](#tab-4--templates)
    - [Tab 5 — Settings](#tab-5--settings)
    - [Sending an SMS](#sending-an-sms)
7. [Workflows & message sequences](#7-workflows--message-sequences)
8. [Template variables reference](#8-template-variables-reference)
9. [Pricing & pro-rata math](#9-pricing--pro-rata-math)
10. [Voice input](#10-voice-input)
11. [PWA / offline behaviour](#11-pwa--offline-behaviour)
12. [Design system](#12-design-system)
13. [Deployment](#13-deployment)
14. [Roadmap (Phase 2)](#14-roadmap-phase-2)

---

## 1. What it solves

Tutoring centres (e.g. Study Buddies) take dozens of new-enquiry phone calls a week. Each call ends with the staff member needing to send a parent a sequence of messages:

1. A welcome + confirmed sessions + first-payment instructions
2. A link to the enrolment form (once paid)
3. A welcome / class-details confirmation (once the form is done)
4. A follow-up if they go quiet

Writing these by hand is slow, error-prone and inconsistent. NudgeHQ:

- Captures the call details in a guided 3-step form
- Computes package pricing, **pro-rata** first payment and grand totals automatically
- Generates the **correct, personalised message sequence** for the workflow the parent is in
- Lets staff **edit**, **copy** or **send via SMS** each step
- Tracks which steps have been sent and nags staff to follow up

Each business gets its own deployment, configures its own branding/branches/packages/templates/SMS credentials, and optionally locks the app behind a PIN.

---

## 2. Tech stack

| Layer        | Choice                                             |
| ------------ | -------------------------------------------------- |
| UI framework | React 18 (function components, hooks)              |
| Bundler      | Vite 5                                             |
| Styling      | Inline styles only — no CSS framework              |
| State        | React `useState` / `useEffect`, all in one file    |
| Storage      | `localStorage` (Phase 1 — no backend)              |
| SMS          | Voodoo SMS REST API via Vercel serverless function |
| Hosting      | Vercel (auto HTTPS)                                |
| PWA          | `manifest.json` + service worker, installable      |
| Voice        | Web Speech API (`webkitSpeechRecognition`)         |

> Per the developer brief, **all application logic lives in a single file — `src/App.jsx`** and must not be split. This README documents that file end to end.

---

## 3. Project structure

```
nudgehq/
├── index.html              # PWA shell, theme color, manifest link, global reset
├── package.json            # react, react-dom, vite, @vitejs/plugin-react
├── vite.config.js          # just the react plugin
├── src/
│   ├── main.jsx            # mounts <App/>, registers service worker
│   └── App.jsx             # THE ENTIRE APP (constants, helpers, UI, all tabs)
├── api/
│   └── send-sms.js         # Vercel serverless fn → Voodoo SMS
├── public/
│   ├── manifest.json       # PWA manifest (name, icons, colors, orientation)
│   ├── sw.js               # service worker — cache-first fallback for GETs
│   └── icon-48 … 512.png   # app icons
└── DEVELOPER-README.md     # original build brief (kept for reference)
```

---

## 4. Getting started

```bash
npm install
npm run dev      # local dev server (Vite)
npm run build    # production build → dist/
npm run preview  # preview the production build
```

Deploy by connecting the repo to Vercel (or drag `dist/` in). Vercel automatically detects the `api/` directory and exposes `POST /api/send-sms`.

---

## 5. Data model & persistence

Everything is stored in the browser's `localStorage` under three keys:

| Key            | Contents                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------- |
| `nhq_settings` | Business config (name, phone, reg fee, packages, branches, templates override, PIN, Voodoo) |
| `nhq_tpl`      | Message templates (defaults overridden when edited in the Templates tab)                    |
| `nhq_inq`      | Array of enquiry records                                                                    |

Helpers `sGet`/`sSet` (async wrappers around `localStorage.getItem`/`setItem` with `JSON.parse`/`stringify`) handle all reads/writes.

### `DEFAULT_SETTINGS`

```js
{
  businessName, bankName, generalPhone, jotformsLink, regFee: 30,
  packages: [ {id, hours, monthly} x4 ],          // 2h £100, 4h £140, 6h £180, 8h £220
  branches:  [ { id, name, phone, email, sumupLink, calendlyLink,
                 bankSort, bankAcct, slots:[{id, day, time}] } ],
  voodoo: { apiKey, senderName },
  pin: ""
}
```

### Enquiry record (saved on first generate)

```js
{
  id, createdAt (ISO), status: "pending"|"enrolled"|"declined",
  branchId, workflow, parentName, phone,
  students: [{ id, name, yearGroup, level, subjects[], pkg, joinDate,
               confirmedSlots[], slotsTBC }],
  grandTotal, payMethod, messages: [{step, timing, content}], sentSteps: [0,1,…]
}
```

`sentSteps` is the array of message indexes that have been sent — used by the Pending tab to show "Step X of N sent" and decide what to nag about next.

---

## 6. The full walkthrough — how the app works

### App bootstrap (`App`)

1. `unlocked` is seeded from `sessionStorage["nhq_unlocked"]` so a PIN unlock persists for the browser session only.
2. `useEffect` loads `nhq_inq`, `nhq_tpl`, `nhq_settings` from localStorage. While loading, a centered "Loading…" splash is shown.
3. **If no settings** → render `<SetupWizard/>`.
4. **If `settings.pin` set and not unlocked** → render `<PinScreen/>`.
5. Otherwise render the shell: navy header (NudgeHQ wordmark + business name), tab bar, and the active tab.

Tabs: **+ New**, **Pending** (with count badge), **Log**, **Templates**, **Settings**.

Derived lists:

- `pending` = enquiries with `status === "pending"` and age ≤ 14 days
- `log60` = all enquiries with age ≤ 60 days

Mutations (`saveInq`, `updateInq`, `saveTpl`, `saveSettings`) update React state and persist to localStorage in one go.

---

### First run: Setup Wizard

`SetupWizard` shows a centered card asking for **Business name** and **Main phone number**, then calls `onComplete` with `DEFAULT_SETTINGS` merged with those two fields. The remaining branch/payment/timetable/SMS details are filled in later via Settings.

---

### PIN lock

`PinScreen` renders a numeric keypad (1–9, 0, ⌫) over a navy full-screen backdrop. As digits are entered they light up dots; when the entry reaches the PIN length it auto-checks. On success it writes `sessionStorage["nhq_unlocked"]="1"` and calls `onUnlock`. On failure it flashes "Incorrect PIN — try again" and clears.

The PIN is set in Settings (4–6 digits, numbers only) and stored in `settings.pin`. Leave it blank to disable the lock entirely.

---

### Tab 1 — + New (the enquiry engine)

This is the heart of the app: a 3-step guided form (`NewTab`).

**Step 1 — Capture the call**

- **Branch selector** — pill buttons for each branch in settings.
- **Workflow selector** — 5 cards (see [Workflows](#7-workflows--message-sequences)):
    - 👋 New Enquiry (4 messages, full onboarding)
    - 📅 Trial Session (2 messages)
    - 💷 Pricing & Timetable (1 message)
    - ℹ️ General Information (2 messages)
    - 🔔 Follow-up (3 messages)
- **Parent/Guardian** — Name + Mobile number, both voice-enabled (🎤). The phone field runs spoken numbers through `normalisePhone` (handles "double seven", "oh", "nought", formats 11-digit numbers as `XXXXX XXX XXXX`).
- **Students** (hidden for `pricing`/`info` workflows) — one or more `StudentCard`s. Add sibling / remove. Each card captures:
    - Name (voice-enabled)
    - Level (Primary/Secondary toggle — swaps available subjects & year groups)
    - Year group dropdown
    - Subject chips (Primary: English, Maths — Secondary: + Science)

The primary button label adapts:

- enquiry → "Next: Packages & Sessions →" (go to Step 2)
- pricing → "Next: Select Slots →" (go to Step 2)
- trial/info/followup → "Generate Message →" (skip to Step 3)

**Step 2 — Packages & sessions** (enquiry + pricing only)

For **enquiry**:

- **First Payment Method** — Card (SumUp) vs Bank Transfer. This switches the `[PAYMENT_LINE]` variable in message e1 between a SumUp card-pay link and bank transfer details.
- **Per-student package card** (`StudentPkgCard`):
    - Package selector (the 4 packages from settings, shown as `2h/wk £100/mo` buttons)
    - Start date picker
    - **Live pro-rata breakdown** (pink panel): reg fee, pro-rata (weeks left × weekly, capped at monthly), first payment total, and a note about monthly-from-next-month.
    - **Confirmed Session Slots** — toggles for each slot defined on the branch, plus a "TBC" checkbox (clears slots, messages will say "TBC").
- When 2+ students all have packages, a navy **grand total** panel appears.

For **pricing**:

- **Slots to Include** — toggles for branch slots; leaving all off means the message shows the full timetable (`[SLOT_LIST]`).

**Step 3 — Review, edit, send**

- Summary header: workflow icon + label, branch, parent name, phone, "✓ Saved" badge.
- One card per generated message:
    - `Step N: <label>` + timing hint (⏱)
    - Message body in a white box (`white-space: pre-wrap` so `\n` line breaks render)
    - **Edit** (inline textarea, pink border), **Copy** (clipboard), **Send SMS** (pink → green "✓ Sent")
    - Already-sent steps show green "✓ Sent" and are disabled.
- Footer helper explains the SMS integration.
- Buttons: **↺ Regenerate** (re-runs `generateMsgs` and patches the existing enquiry in place, preserving `sentSteps`), **← Back**, **+ New Enquiry** (resets the whole form).

#### Generation flow (`doGenerate`)

```
formData = { parentName, students, branchId, grandTotal, selectedSlots, payMethod }
msgs     = generateMsgs(workflow, formData, templates, settings)
            ↳ computeVars(formData, settings)  → vars object (24 variables)
            ↳ for each step in STEPS[workflow]:
                 fillTemplate(templates[key] ?? DEFAULT_TPL[key], vars)
```

If an enquiry `id` already exists (regenerate) it **patches** that enquiry, preserving `sentSteps` (filtered to the new message count so stale indices don't leak). If not, it **creates** a new enquiry with `status: "pending"`, fresh `sentSteps: []`, and stores it via `onSave`.

`fillTemplate` replaces every `[VAR]` with its value, leaving unknown `[VAR]`s intact so missing data is visible.

---

### Tab 2 — Pending

`PendingTab` lists enquiries with `status === "pending"` (and ≤14 days old), **sorted oldest first**.

Each card shows:

- Parent name, phone, branch, workflow label
- **Days ago** in an urgency colour: pink (<7d), amber (≥7d), red (≥10d)
- A blue progress strip: **"Step X of N sent"** with the next step's label, or "All messages sent ✓". A **View/Hide** toggle expands the full message list with per-step checkboxes (manual mark-as-sent via `toggleSent`).
- Student names + grand total
- If ≥3 days have passed and not all steps are sent: an amber "⏰ consider sending step X+1" nudge.
- **✓ Enrolled** / **✕ Declined** buttons to move the enquiry out of pending.

Empty state: a green "✅ No pending enquiries" card.

---

### Tab 3 — Log

`LogTab` is a 60-day record of **all** enquiries (pending, enrolled, declined), newest first. Each card shows the date, workflow, phone, student list with year groups, first-payment total, messages-sent ratio, and a `StatusBadge` (Pending = amber, Enrolled = green, Declined = red). Pending entries still get Enrolled/Declined quick buttons.

A banner notes the Phase 2 plan: JotForms webhook will auto-flip status to Enrolled.

---

### Tab 4 — Templates

`TplTab` lets the business customise every message template. Sections mirror the five workflows; each step has a label, timing hint, and a textarea seeded from `draft[key]`.

- **Variable Reference** collapsible lists all 24 `[VARS]` with descriptions (see [below](#8-template-variables-reference)).
- **Save All Templates** persists `draft` to `nhq_tpl`.
- **Reset** restores `DEFAULT_TPL` (without saving).

Templates are merged at generate time: `templates[key] || DEFAULT_TPL[key]`, so a blanked-out field falls back to the default.

---

### Tab 5 — Settings

`SettingsTab` is a deep-link form with collapsible branch accordions. Sections:

1. **Business** — name, bank account name, general phone, reg fee (£), enrolment form (JotForms) link.
2. **Packages** — add/remove/edit each `{hours, monthly}` row (min 1 package).
3. **Branches** — accordion per branch:
    - Name, direct phone, email
    - Payment: SumUp card link, bank sort code, account number
    - Booking: Calendly trial link
    - Timetable: add/remove session slots `{day, time}`
    - Remove branch (if >1)
4. **Access PIN** — 4–6 digit numeric PIN, blank = no lock.
5. **SMS (Voodoo SMS)** — API key (password field) + sender name (max 11 chars, shown to recipients as "from"). Helper text links to voodoosms.com and notes ~£0.04/msg.

**Save Settings** persists; **Cancel** reverts the draft to a deep clone of the current settings.

---

### Sending an SMS

In Step 3 of the New tab, each message card has a **Send SMS** button (`sendSms`):

1. Guard: Voodoo API key + sender name must be set in Settings; phone must be present.
2. Set `sendState[i] = "sending"` (button greys out, shows "Sending…").
3. `POST /api/send-sms` with `{ apiKey, senderName, toNumber: phone, body: getMsg(i) }`.
4. On `data.success`: `sendState[i] = "sent"`, push `i` into `sentSteps`, and `onUpdate(inqId, { sentSteps })` so the Pending counter ticks up immediately and persists.
5. On failure: `sendState[i] = "error"` + an alert with the error message.

The serverless function (`api/send-sms.js`):

- Validates required fields
- Normalises the UK number to international format (`07…` → `44…`)
- Sanitises the sender name (alphanumeric, ≤11 chars)
- Truncates body to 1600 chars (Voodoo concatenates long messages)
- Calls `POST https://api.voodoosms.com/sendsms` with `Bearer` auth
- Returns `{ success, messageId, status }` or a descriptive error

---

## 7. Workflows & message sequences

Defined in `WF` and `STEPS`. Each step has a `key` (matches a template key), a human label, and a `timing` hint.

| Workflow   | Icon | Steps                                                                                           | Templates used |
| ---------- | ---- | ----------------------------------------------------------------------------------------------- | -------------- |
| `enquiry`  | 👋   | e1 Welcome/Sessions/Payment · e2 Enrolment Form · e3 Welcome & Confirmation · e4 24hr Follow-up | e1, e2, e3, e4 |
| `trial`    | 📅   | t1 Trial Invitation · t2 Day-Before Reminder                                                    | t1, t2         |
| `pricing`  | 💷   | p1 Pricing & Timetable                                                                          | p1             |
| `info`     | ℹ️   | g1 About Us · g2 What We Provide                                                                | g1, g2         |
| `followup` | 🔔   | f1 24hr · f2 48hr · f3 72hr Final (with STOP)                                                   | f1, f2, f3     |

Default templates are shipped in `DEFAULT_TPL` and can be overridden per-business via the Templates tab.

---

## 8. Template variables reference

`computeVars(data, settings)` produces the 24 variables below. All are replaced in templates via `[VAR_NAME]`.

| Variable               | Meaning                                                           |
| ---------------------- | ----------------------------------------------------------------- |
| `[PARENT_NAME]`        | Parent/guardian name (defaults to "there")                        |
| `[BRANCH]`             | Branch name                                                       |
| `[BRANCH_PHONE]`       | Branch direct mobile                                              |
| `[GENERAL_PHONE]`      | Main/general phone number                                         |
| `[BUSINESS_NAME]`      | Business name                                                     |
| `[STUDENT_NAMES]`      | All student names joined with " & " (e.g. "Zaynab & Ibrahim")     |
| `[STUDENT_POSSESSIVE]` | "Zaynab's" for one, "your children's" for multiple                |
| `[SESSION_LINES]`      | Confirmed slots per student (Step 1)                              |
| `[SESSION_SUMMARY]`    | Class details — omits the name when there's a single student      |
| `[WEEKLY_SESSIONS]`    | Weekly sessions per student                                       |
| `[PACKAGE_LINES]`      | Package per student (`2hrs/week — £100/month`)                    |
| `[FIRST_PAYMENT]`      | Total first payment (reg fee + pro-rata, all students)            |
| `[MONTHLY_TOTAL]`      | Total ongoing monthly amount                                      |
| `[PAYMENT_LINE]`       | Card link **OR** bank details — based on Step 2 payment selection |
| `[BANK_NAME]`          | Bank account name                                                 |
| `[BANK_SORT]`          | Sort code (branch-level)                                          |
| `[BANK_ACCT]`          | Account number (branch-level)                                     |
| `[BANK_REF]`           | Payment reference instruction (`SURNAME + DOB DDMMYY`)            |
| `[JOTFORMS_LINK]`      | Enrolment form link                                               |
| `[CALENDLY_LINK]`      | Trial booking link (branch-level)                                 |
| `[SLOT_LIST]`          | Available session times (used by pricing workflow)                |
| `[REG_FEE]`            | Registration fee amount                                           |
| `[SUMUP_LINK]`         | Branch SumUp card payment link                                    |
| `[SURNAME]`            | Student surname in capitals (used in bank ref)                    |

Smart details:

- `[SESSION_SUMMARY]` for a single student omits the name and respects `slotsTBC` → "TBC — session times to be confirmed".
- `[PAYMENT_LINE]` is **either** the SumUp link **or** the full bank block (Sort/Acc/Ref), never both — chosen by the `payMethod` selection in Step 2.
- `[SLOT_LIST]` uses the explicitly selected slots from the pricing workflow, or falls back to the branch's full timetable if none were toggled on.
- `[BANK_REF]` is built as `"<SURNAME> + your child's date of birth (DDMMYY)"`.

---

## 9. Pricing & pro-rata math

```js
calcProRata(monthly, joinDateStr);
// days-in-month, weeksLeft = ceil((dim - day + 1) / 7)
// proRata = min(round((monthly/4) * weeksLeft, 2), monthly)
// weekly  = monthly / 4
```

`stuCalc(student, settings)` looks up the student's package and returns `{ proRata, weeksLeft, weekly, monthly, hours, total: regFee + proRata }`. `total` is the **first payment** shown in the e1 message and in the per-student breakdown. The grand total across all students is `grandTotal`, used as `[FIRST_PAYMENT]`.

If `proRata` equals `monthly` the breakdown shows "— capped" (you never charge more than a full month upfront). Monthly from the next month onwards is the package's `monthly`, collected by bank transfer on the 1st.

---

## 10. Voice input

`MicButton` wraps the Web Speech API:

```js
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const rec = new SR();
rec.lang = "en-GB";
rec.interimResults = false;
```

Tap 🎤 to start (turns red ⏹ while listening). On `result`, the transcript is passed to `onResult`. For phone fields, the transcript is first run through `normalisePhone`, which:

- Expands `double seven` → `77`
- Converts word-numbers (`oh`, `nought`, `zero`…`nine`) to digits
- Strips non-digits and, if 11 digits, formats as `XXXXX XXX XXXX`

Voice requires Chrome. A banner on Step 1 reminds the user.

`VField` is the reusable labelled input + mic row used throughout the form.

---

## 11. PWA / offline behaviour

- `index.html` declares theme color `#3B58A8`, mobile-web-app meta tags, manifest link, and icon links (48→512px).
- `public/manifest.json` — `display: standalone`, portrait orientation, maskable 192/512 icons, name "NudgeHQ".
- `public/sw.js` — service worker:
    - On `install`: pre-caches `/`, `/index.html`, `/src/main.jsx`, `/src/App.jsx`, then `skipWaiting()`.
    - On `activate`: deletes old caches, `clients.claim()`.
    - On `fetch` (GET only): **network-first with cache fallback** — fetches fresh, clones the response into cache, falls back to cache on failure. POSTs (e.g. `/api/send-sms`) bypass the SW.
- `src/main.jsx` registers the SW on `load`.

Result: installable to Android/iOS home screen, works offline for browsing previously-loaded views. SMS sending itself requires connectivity.

---

## 12. Design system

Defined in the `C` token object — do not change without approval (per brief):

| Token    | Hex       | Use                              |
| -------- | --------- | -------------------------------- |
| `navy`   | `#3B58A8` | Study Buddies royal blue (brand) |
| `blue`   | `#2D4A9C` | Deeper blue for text             |
| `pink`   | `#E91E8C` | Hot-pink accent                  |
| `green`  | `#27AE60` | Success                          |
| `red`    | `#E05050` | Error/danger                     |
| `bg`     | `#F4F6FC` | App background                   |
| `white`  | `#FFFFFF` | Cards                            |
| `text`   | `#1A2C6B` | Body text                        |
| `muted`  | `#6B7FA8` | Secondary text                   |
| `border` | `#D0D8F0` | Borders                          |
| `tag`    | `#EEF2FA` | Light tag/ghost-button bg        |

UI primitives (all inline-styled): `Card`, `ST` (section title), `Lbl`, `Inp`, `Sel`, `Btn` (variants: `primary`/`pink`/`ghost`/`danger`/`success`), `Toggle` (pink switch), `StatusBadge` (pending/enrolled/declined). The layout is mobile-first, max-width 640px centered.

---

## 13. Deployment

1. `npm install && npm run build` → produces `dist/`.
2. Connect the repo to Vercel (or drag `dist/`). Vercel auto-detects Vite and the `api/` serverless functions.
3. HTTPS is automatic — required for the Web Speech API, service worker and PWA install.
4. Optional custom domain, e.g. `clientname.nudgehq.co.uk`.
5. Each white-label customer = their own Vercel deployment with their own localStorage + their own Voodoo SMS account/API key.

Test the install flow on Android Chrome (Add to Home screen) and iOS Safari (Share → Add to Home Screen).

---

## 14. Roadmap (Phase 2)

From the developer brief — separate scope after Phase 1 sign-off:

- **Supabase backend** replacing `localStorage` (multi-device sync)
- **Email + password auth** per business
- **Admin dashboard** for the owner to manage customer accounts
- **Automated follow-up scheduling** — send follow-up messages on timed delays
- **Inbound STOP handling** via a Voodoo SMS webhook
- **JotForms webhook** → auto-flip enquiry status to Enrolled (currently manual in the Log tab)

---

_NudgeHQ — nudge every enquiry to enrolment._
