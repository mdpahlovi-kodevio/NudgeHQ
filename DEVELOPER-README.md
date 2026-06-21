# NudgeHQ — Developer Brief

Enquiry management and SMS automation app for tutoring centres.
Built in React 18 + Vite. Deploy to Vercel as a PWA.

---

## Project Structure

```
nudgehq/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx
│   └── App.jsx             # Entire application (single file — do not split)
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── sw.js               # Service worker
│   ├── icon-192.png        # YOU CREATE — navy #3B58A8 bg, white "NH" text, 192×192px
│   └── icon-512.png        # Same design, 512×512px
└── api/
    └── send-sms.js         # Vercel serverless function — Voodoo SMS
```

---

## Phase 1 Tasks

### 1. Deploy to Vercel as PWA

- `npm install` then `npm run build`
- Deploy to Vercel (connect GitHub repo or drag-and-drop dist/)
- Ensure HTTPS is active (Vercel does this automatically)
- Custom domain optional: e.g. `clientname.nudgehq.co.uk`
- Test PWA install on Android Chrome and iPhone Safari

**PWA icons needed:** Create two PNG icons and place in `/public/`:
- `icon-192.png` (192×192px): navy #3B58A8 background, white "NH" text, rounded corners
- `icon-512.png` (512×512px): same design

---

### 2. Wire up Voodoo SMS Send button

The app Settings tab has a Voodoo SMS section where each business enters:
- **API Key** — from voodoosms.com → Send SMS → API SMS → HTTP API
- **Sender Name** — up to 11 chars, shown as "from" on recipient's phone (e.g. "NudgeHQ")

These are stored in localStorage under `settings.voodoo.apiKey` and `settings.voodoo.senderName`.

The serverless function at `api/send-sms.js` is ready — it accepts `{ apiKey, senderName, toNumber, body }` and calls the Voodoo SMS REST API.

**What you need to add in App.jsx:**

In the Step 3 message display (NewTab component, step 3 render), add a **Send via SMS** button below each message card.

```jsx
// Add to NewTab component — alongside existing state declarations
const [sendState, setSendState] = useState({}) // { [index]: 'idle'|'sending'|'sent'|'error' }

const sendSms = async (i) => {
  if (!settings.voodoo?.apiKey || !settings.voodoo?.senderName) {
    alert('Add your Voodoo SMS API key and sender name in Settings first.')
    return
  }
  if (!phone) {
    alert('No phone number logged for this enquiry — go back and add one.')
    return
  }
  setSendState(s => ({ ...s, [i]: 'sending' }))
  try {
    const res = await fetch('/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: settings.voodoo.apiKey,
        senderName: settings.voodoo.senderName,
        toNumber: phone,
        body: getMsg(i),
      }),
    })
    const data = await res.json()
    if (data.success) {
      setSendState(s => ({ ...s, [i]: 'sent' }))
      // Auto-mark step as sent — update sentSteps in the saved enquiry
      // You will need to pass enquiry id and an onUpdate callback into this component
    } else {
      setSendState(s => ({ ...s, [i]: 'error' }))
      alert('Send failed: ' + (data.error || 'Unknown error'))
    }
  } catch {
    setSendState(s => ({ ...s, [i]: 'error' }))
    alert('Network error.')
  }
}
```

Add a Send button inside each message card (after the Copy button):

```jsx
<button
  onClick={() => sendSms(i)}
  disabled={sendState[i] === 'sending' || sendState[i] === 'sent'}
  style={{
    fontSize: 10, fontWeight: 700, border: 'none', borderRadius: 6,
    padding: '3px 9px', cursor: 'pointer',
    background: sendState[i] === 'sent' ? '#D1FAE5' : '#E91E8C',
    color: sendState[i] === 'sent' ? '#065F46' : '#fff',
    opacity: sendState[i] === 'sending' ? 0.6 : 1,
  }}
>
  {sendState[i] === 'sending' ? 'Sending...' : sendState[i] === 'sent' ? '✓ Sent' : 'Send SMS'}
</button>
```

---

## Key Notes

- **All app logic is in one file: `src/App.jsx`.** Do not split it.
- **localStorage** stores all data. No database in Phase 1.
- **No authentication in Phase 1.** PIN screen is handled inside the app.
- **Each white-label customer = their own Vercel deployment** with their own localStorage and their own Voodoo SMS account/API key.
- **Do not change colours:** Blue #3B58A8, Pink #E91E8C, Background #F4F6FC.
- **Do not change templates or business logic.** UI changes only.
- Mobile-first. Test on 390px wide screen.

---

## Testing Checklist

- [ ] App loads on desktop and mobile browser
- [ ] PWA installs on Android Chrome home screen
- [ ] PWA installs on iPhone via Safari → Share → Add to Home Screen
- [ ] Setup wizard appears on first load (no existing settings)
- [ ] PIN screen blocks access when PIN is set in Settings
- [ ] New Enquiry — full 3-step flow works end to end
- [ ] Messages generate correctly with all variables filled
- [ ] Card/Bank payment method selector changes message content correctly
- [ ] Send SMS button fires API call and returns success confirmation
- [ ] Sent step is auto-marked as ticked after successful send
- [ ] Settings — all fields save and persist on refresh
- [ ] Settings — timetable slots can be added, edited and removed per branch
- [ ] Pending tab shows urgency colouring and correct step count

---

## Phase 2 (separate brief, after Phase 1 sign-off)

- Supabase backend replacing localStorage (multi-device sync)
- User authentication — email + password login per business
- Admin dashboard — owner manages customer accounts and access
- Automated follow-up scheduling — send follow-up messages after set time delays
- Inbound STOP handling via Voodoo SMS webhook

---

## Questions

Contact the project owner before making any assumptions. Do not change app logic, template text, or colours without approval.
