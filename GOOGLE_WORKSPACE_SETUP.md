# Google Workspace Setup (support@elidine.com)

Use this guide to create **Google Workspace** for `elidine.com` with a `support@elidine.com` user. Eldine signs into Google Calendar with that account to manage appointments. The Vapi phone agent and booking API write to this calendar via a service account.

## What you get

| Account | Purpose |
|---------|---------|
| `support@elidine.com` | Eldine's login — Gmail inbox, Google Calendar, appointment management |
| Service account (API) | Vapi + `/api/bookings` create pending events on the support calendar |

## Before you start

- You control **DNS for elidine.com** (currently **Cloudflare** — see `EMAIL_SETUP.md`)
- A payment method for Google Workspace (~**$7.20/user/month** on Business Starter)
- About 30–60 minutes for DNS propagation

> **Email note:** If Resend inbound MX is already on `elidine.com`, switching to Google Workspace **moves incoming mail to Gmail**. Resend can still **send** mail from `support@elidine.com` (SPF/DKIM), but Resend **receiving** webhooks will stop unless you use a subdomain. See [Coexist with Resend](#coexist-with-resend) below.

---

## Step 1 — Sign up for Google Workspace

1. Open [Google Workspace](https://workspace.google.com/)
2. Click **Get started**
3. Business name: **Elidine**
4. Number of employees: **1** (you can add more later)
5. Region: **United States**
6. Contact email: use a personal Gmail you can access (for setup verification only)
7. Choose **I have a domain** → enter `elidine.com`
8. Create the first user:
   - First name: **Elidine** (or Eldine)
   - Username: **`support`** → `support@elidine.com`
   - Strong password (save in a password manager)
9. Select **Business Starter** (includes Gmail + Calendar)
10. Complete billing

---

## Step 2 — Verify domain ownership (Cloudflare)

Google Admin will show a **TXT** verification record.

1. Sign in to [Google Admin](https://admin.google.com/) → **Account** → **Domains** → **Manage domains** → `elidine.com` → **Verify**
2. Copy the TXT record, e.g.:
   - **Type:** `TXT`
   - **Name:** `@`
   - **Value:** `google-site-verification=xxxxxxxxxxxx`
3. In **Cloudflare** → `elidine.com` → **DNS** → **Add record**:
   - Type: `TXT`
   - Name: `@`
   - Content: paste the full value from Google
   - Proxy: **DNS only** (grey cloud)
4. Back in Google Admin → **Verify**

Propagation usually takes 5–30 minutes.

---

## Step 3 — Activate Gmail (MX records)

After verification, Google prompts you to set up Gmail. Add these **MX** records in Cloudflare:

| Priority | Mail server |
|----------|-------------|
| 1 | `ASPMX.L.GOOGLE.COM` |
| 5 | `ALT1.ASPMX.L.GOOGLE.COM` |
| 5 | `ALT2.ASPMX.L.GOOGLE.COM` |
| 10 | `ALT3.ASPMX.L.GOOGLE.COM` |
| 10 | `ALT4.ASPMX.L.GOOGLE.COM` |

In Cloudflare for each record:
- Type: `MX`
- Name: `@`
- Mail server: value from table
- Priority: as shown
- Proxy: **DNS only**

**Remove** any existing MX records pointing to Resend (or other providers) on `@`, or Google won't receive mail.

In Google Admin → **Gmail** → **Activate** and confirm MX setup.

---

## Step 4 — Email authentication (SPF + DKIM)

### SPF (one TXT record on `@`)

Merge Google and Resend so both can send:

```txt
v=spf1 include:_spf.google.com include:amazonses.com ~all
```

(`amazonses.com` is Resend's SPF include — confirm in [Resend DNS docs](https://resend.com/docs/dashboard/domains/introduction) if it changes.)

If you only use Google for sending, use:

```txt
v=spf1 include:_spf.google.com ~all
```

### DKIM (Google)

1. Google Admin → **Apps** → **Google Workspace** → **Gmail** → **Authenticate email**
2. Generate DKIM for `elidine.com`
3. Add the **TXT** record Google provides in Cloudflare
4. Click **Start authentication** in Admin after DNS propagates

Keep Resend's DKIM records (`resend._domainkey` etc.) if you still send via Resend API.

---

## Step 5 — Sign in and open Calendar

1. Go to [https://calendar.google.com](https://calendar.google.com)
2. Sign in as **`support@elidine.com`**
3. Confirm you see the primary calendar **Elidine** / **support@elidine.com**

Optional — dedicated booking calendar:

1. Calendar → **+** next to **Other calendars** → **Create new calendar**
2. Name: **Elidine Appointments**
3. Time zone: **(GMT-06:00) Central Time**
4. After creating, open calendar **Settings** → **Integrate calendar** → copy **Calendar ID** (use this as `GOOGLE_CALENDAR_ID` if not using the primary calendar)

For most setups, use the primary calendar ID: **`support@elidine.com`**

---

## Step 6 — Connect the booking API (service account)

The website/Vapi integration uses a **Google Cloud service account** — not Eldine's password.

### 6a. Google Cloud project

1. [Google Cloud Console](https://console.cloud.google.com/) → create or select project **elidine-booking**
2. **APIs & Services** → **Library** → enable **Google Calendar API**
3. **IAM & Admin** → **Service Accounts** → **Create**
   - Name: `elidine-calendar`
   - Role: none required at project level
4. Open the service account → **Keys** → **Add key** → **JSON** → download the file

### 6b. Share calendar with the service account

1. In Google Calendar (logged in as `support@elidine.com`), open calendar settings
2. **Share with specific people** → add the service account email:
   - `elidine-calendar@YOUR-PROJECT.iam.gserviceaccount.com`
3. Permission: **Make changes to events**
4. Save

### 6c. Vercel environment variables

In Vercel → **elidine-homepage** → **Settings** → **Environment Variables**:

| Variable | Value |
|----------|-------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Entire JSON key file contents (single line) |
| `GOOGLE_CALENDAR_ID` | `support@elidine.com` |
| `TIMEZONE` | `America/Chicago` |

Redeploy after saving.

### 6d. Test

```bash
curl "https://elidine.com/api/availability?date=2026-08-15&serviceId=knotless"
```

You should get available slots (not a 500 error).

---

## Step 7 — Eldine's daily workflow

1. **Phone bookings** — Vapi creates yellow `[PENDING]` events on the calendar
2. **Review** — [calendar.google.com](https://calendar.google.com) as `support@elidine.com`, or `/project/admin.html` on the site
3. **Approve** — confirm in admin or change event to **Confirmed** in Calendar
4. **Client invite** — Google sends calendar invite to the client's email when approved

---

## Coexist with Resend

| Feature | After Workspace |
|---------|-----------------|
| Eldine reads `support@` mail | **Gmail** (workspace.google.com or mail.google.com) |
| App sends via Resend API | **Still works** if SPF/DKIM include both Google and Resend |
| Resend inbound webhook (`/api/support/inbound`) | **Stops** unless you use a subdomain for Resend MX |
| Stripe / transactional email | Keep using Resend `SUPPORT_FROM_EMAIL` |

**Recommended:** Use Google Workspace for `support@` inbox + calendar. Use Resend only for **outbound** API sends (receipts, notifications). Remove Resend MX on `@` when Google MX is active.

---

## Optional aliases

In Google Admin → **Users** → `support@elidine.com` → **Add alternate email**:

| Alias | Use |
|-------|-----|
| `hello@elidine.com` | Public-facing contact on the website |
| `bookings@elidine.com` | Calendar invites / booking notifications |

All deliver to the same `support@` inbox.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "GOOGLE_SERVICE_ACCOUNT_JSON is not set" | Add env var in Vercel and redeploy |
| API returns 403 / calendar not found | Share calendar with service account email; check `GOOGLE_CALENDAR_ID` |
| Mail not arriving at support@ | Confirm Google MX records; remove conflicting MX |
| Calendar events not visible to Eldine | Sign in as `support@elidine.com`, not a personal Gmail |
| Domain verification stuck | Wait 30 min; ensure TXT is DNS-only in Cloudflare |

---

## Checklist

- [ ] Google Workspace account created
- [ ] `support@elidine.com` user exists
- [ ] Domain verified in Google Admin
- [ ] Google MX records in Cloudflare
- [ ] SPF/DKIM configured
- [ ] Eldine can sign in at calendar.google.com
- [ ] Service account created + Calendar API enabled
- [ ] Calendar shared with service account
- [ ] `GOOGLE_CALENDAR_ID=support@elidine.com` in Vercel
- [ ] `/api/availability` returns slots successfully
