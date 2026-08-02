# Elidine Account Setup — Cloud Agent Handoff

Complete all third-party account setup for **elidine.com** so the booking site, payments, email, and voice agent work in production.

## Business profile (use everywhere)

| Field | Value |
|-------|-------|
| Business name | Elidine |
| Domain | elidine.com |
| Primary email | support@elidine.com |
| Website | https://elidine.com |
| Address | 1969 Arapaho Rd, Apt 2010, Garland, TX 75044 |
| Timezone | America/Chicago |
| Industry | Beauty salon / personal services |
| Phone | (929) 202-9714 |
| Deposit amount | $50 |

## Accounts to create (in order)

### 1. Google Workspace — `support@elidine.com`
**Guide:** `GOOGLE_WORKSPACE_SETUP.md`

- [ ] Sign up at https://workspace.google.com/ (Business Starter, 1 user)
- [ ] Create user `support@elidine.com`
- [ ] Verify domain via TXT record in Cloudflare
- [ ] Add Google MX records in Cloudflare (remove Resend MX on `@` if present)
- [ ] Configure SPF: `v=spf1 include:_spf.google.com include:amazonses.com ~all`
- [ ] Enable Google DKIM
- [ ] Confirm Eldine can sign in at https://mail.google.com and https://calendar.google.com

### 2. Google Cloud — Calendar API service account
**Guide:** `GOOGLE_WORKSPACE_SETUP.md` Step 6

- [ ] Create project `elidine-booking` at https://console.cloud.google.com/
- [ ] Enable Google Calendar API
- [ ] Create service account `elidine-calendar` with JSON key
- [ ] Share `support@elidine.com` calendar with service account (Make changes to events)
- [ ] Save JSON key for `GOOGLE_SERVICE_ACCOUNT_JSON`

### 3. Stripe — production payments
**Guide:** `STRIPE_SETUP.md`

- [ ] Register at https://dashboard.stripe.com/register with support@elidine.com
- [ ] Complete business verification (elidine.com, Garland TX address)
- [ ] Verify domain in Stripe if prompted (DNS TXT in Cloudflare)
- [ ] Copy production secret key `sk_live_...`
- [ ] Create webhook: `https://elidine.com/api/stripe-webhook`
  - Event: `checkout.session.completed`
- [ ] Copy webhook signing secret `whsec_...`
- [ ] Customize receipt branding (Elidine colors)

### 4. Resend — outbound email API
**Guide:** `EMAIL_SETUP.md`

- [ ] Install Resend Vercel integration OR sign up at https://resend.com/
- [ ] Verify `elidine.com` domain (SPF/DKIM in Cloudflare — no MX if Google handles inbound)
- [ ] Copy `RESEND_API_KEY`

### 5. Vercel — environment variables
**Project:** `elidine-homepage` on Vercel

Add to **Production** environment:

| Variable | Source |
|----------|--------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Cloud JSON key (single line) |
| `GOOGLE_CALENDAR_ID` | `support@elidine.com` |
| `TIMEZONE` | `America/Chicago` |
| `ADMIN_API_KEY` | `openssl rand -hex 32` |
| `STRIPE_SECRET_KEY` | Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook |
| `SITE_URL` | `https://elidine.com` |
| `RESEND_API_KEY` | Resend |
| `SUPPORT_FROM_EMAIL` | `Elidine Support <support@elidine.com>` |
| `VAPI_PRIVATE_KEY` | Already in local env |
| `VAPI_PUBLIC_KEY` | Already in local env |
| `VAPI_WEBHOOK_SECRET` | Already in local env |

- [ ] Deploy: `vercel deploy --prod`
- [ ] Confirm `elidine.com` points to this Vercel project

### 6. Cloudflare DNS checklist

All records on `elidine.com` (DNS only / grey cloud for mail records):

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| TXT | @ | `google-site-verification=...` | Google domain verify |
| MX | @ | Google MX servers (5 records) | Gmail inbound |
| TXT | @ | SPF record (merged) | Email auth |
| TXT | google._domainkey | Google DKIM | Email auth |
| TXT | resend._domainkey | Resend DKIM | Outbound API |
| TXT | @ | Stripe verification (if required) | Stripe domain |

## Verification gates (need human input)

Pause and request from the user when you hit:

1. **SMS / phone verification** (Google, Stripe)
2. **Payment card** for Google Workspace billing (~$7.20/mo)
3. **Bank account + SSN/EIN** for Stripe identity verification
4. **Cloudflare login** if not already authenticated
5. **Vercel login** to set env vars
6. **2FA codes** for any service

## Post-setup smoke tests

```bash
# Calendar availability
curl "https://elidine.com/api/availability?date=2026-08-15&serviceId=knotless"

# Stripe checkout (browser)
# Book on site → Confirm & Pay $50 → test card 4242... in test mode

# Email send
curl -X POST https://elidine.com/api/support/send \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test","html":"<p>OK</p>"}'
```

## Deliverables

When complete, produce a summary with:

- [ ] Which accounts were created
- [ ] Which DNS records were added
- [ ] Which Vercel env vars were set (names only, not values)
- [ ] What still needs human action
- [ ] Links to each dashboard (Google Admin, Stripe, Vercel, Cloudflare)
