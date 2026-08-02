# Stripe Payment Setup (Production)

The Elidine booking flow charges a **$50 deposit** via Stripe Checkout before creating a pending calendar appointment.

## How it works

1. Client fills out the booking form and clicks **Confirm & Pay $50**
2. They are redirected to **Stripe Checkout** (hosted, PCI-compliant payment page)
3. After successful payment, Stripe sends a webhook to your server
4. The webhook creates a **pending** Google Calendar event with deposit info
5. Client returns to the site and sees a confirmation modal
6. Eldine approves/declines via the admin panel as usual

If the time slot becomes unavailable between checkout start and payment completion, the deposit is **automatically refunded**.

---

## 1. Create your Stripe account

1. Go to [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Sign up with **support@elidine.com**
3. Business name: **Elidine**
4. Website: **https://elidine.com**
5. Business type: Individual or LLC (as applicable)
6. Industry: Personal services / Beauty salon

### Activate your account

Complete Stripe's verification checklist:

| Item | Value |
|------|-------|
| Business email | support@elidine.com |
| Business website | https://elidine.com |
| Support phone | Your studio phone |
| Business address | 1969 Arapaho Rd, Apt 2010, Garland, TX 75044 |
| Bank account | Your business checking account for payouts |

Stripe may ask you to verify domain ownership for **elidine.com**. Add the DNS record they provide in Cloudflare (same place you configured Resend).

---

## 2. Get API keys

1. Open [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/apikeys)
2. Toggle **View test data** OFF for production keys
3. Copy:
   - **Publishable key** (`pk_live_...`) — not needed for Checkout redirect flow
   - **Secret key** (`sk_live_...`) — required

> Keep your secret key private. Never commit it to git.

---

## 3. Create webhook endpoint

After deploying to Vercel with the new API routes:

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Endpoint URL: `https://elidine.com/api/stripe-webhook`
4. Select events:
   - `checkout.session.completed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (`whsec_...`)

---

## 4. Environment variables

Add these in **Vercel → Project Settings → Environment Variables** (Production):

| Variable | Value |
|----------|-------|
| `STRIPE_SECRET_KEY` | `sk_live_...` from step 2 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from step 3 |
| `SITE_URL` | `https://elidine.com` |

For local testing, add to `.env.local`:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SITE_URL=http://localhost:3000
```

Use **test mode** keys (`sk_test_`, `whsec_` from test webhook) during development.

---

## 5. Test locally

Install the [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
brew install stripe/stripe-cli/stripe
stripe login
```

In one terminal, run the dev server:

```bash
cd elidine-homepage
npm run dev
```

In another terminal, forward webhooks:

```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

Copy the webhook signing secret printed by `stripe listen` into `.env.local` as `STRIPE_WEBHOOK_SECRET`.

Test a payment with card `4242 4242 4242 4242`, any future expiry, any CVC.

---

## 6. Deploy

```bash
cd elidine-homepage
npm install
vercel deploy --prod
```

After deploy:

1. Confirm the webhook endpoint URL in Stripe Dashboard points to production
2. Make a real $50 test booking (you can refund it from the Stripe Dashboard)
3. Verify the pending event appears in Google Calendar with "Deposit: $50 paid via Stripe"

---

## API endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/create-checkout-session` | POST | Validates booking, returns Stripe Checkout URL |
| `/api/stripe-webhook` | POST | Handles payment completion, creates calendar event |
| `/api/checkout-session?session_id=` | GET | Verifies payment on return from Checkout |

---

## Refunds & cancellations

- **Client cancels before paying**: No booking created, no charge
- **Slot taken during checkout**: Auto-refund on webhook
- **Client cancels after paying**: Refund manually from [Stripe Dashboard → Payments](https://dashboard.stripe.com/payments), then delete the calendar event in admin
- **Eldine declines booking**: Refund deposit from Stripe Dashboard

---

## Customer receipts

Stripe automatically emails receipts to the client's email. You can customize receipt branding in **Stripe Dashboard → Settings → Branding** with Elidine colors and logo.
