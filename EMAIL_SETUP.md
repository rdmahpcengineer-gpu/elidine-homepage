# Support Email Setup (support@elidine.com)

Elidine uses **Google Workspace** for `support@elidine.com` (Gmail inbox + Google Calendar). See **[GOOGLE_WORKSPACE_SETUP.md](GOOGLE_WORKSPACE_SETUP.md)** for Workspace signup and DNS.

The **Resend for Vercel** integration can still send transactional email *from* `support@elidine.com` (deposit receipts, notifications). Inbound mail to `support@` is handled by **Gmail** once Google MX records are active — not Resend webhooks.

## 1. Google Workspace (primary)

Follow **[GOOGLE_WORKSPACE_SETUP.md](GOOGLE_WORKSPACE_SETUP.md)** to:

- Create `support@elidine.com`
- Set up Google Calendar for appointments
- Configure Cloudflare DNS (TXT, MX, SPF, DKIM)

## 2. Resend (optional — outbound API only)

Use Resend when the app needs to send email programmatically (Stripe receipts, support replies from `/api/support/send`).

1. Open [Resend for Vercel](https://vercel.com/integrations/resend) in the Vercel Marketplace.
2. Click **Install** and select the `elidine-homepage` project.
3. This creates a Resend account (or links an existing one) and adds `RESEND_API_KEY` to your Vercel environment variables automatically.

> **Important:** Google Workspace MX on `@` replaces Resend inbound receiving. Eldine reads support mail in Gmail. Keep Resend for sending only, or remove Resend MX records before adding Google MX.

## 3. Verify elidine.com in Resend (sending only)

`elidine.com` uses **Cloudflare** nameservers. Add Resend's SPF/DKIM records in Cloudflare for outbound API sends. **Do not add Resend MX** if Google Workspace handles inbound mail.

1. Go to [Resend Domains](https://resend.com/domains) → **Add Domain** → enter `elidine.com`.
2. Copy the DNS records Resend provides (SPF, DKIM — skip MX if using Google Workspace).
3. In **Cloudflare** → `elidine.com` → **DNS** → add sending records only.
4. Merge SPF with Google — see `GOOGLE_WORKSPACE_SETUP.md`.

## 4. Inbound receiving (skip if using Google Workspace)

If you use Google Workspace for `support@`, **skip Resend inbound**. Eldine reads mail in Gmail.

Only enable Resend receiving if you are **not** using Google MX on `@`:

1. Toggle **Receiving** on in Resend.
2. Add Resend's MX record in Cloudflare.
3. Configure webhook below.

## 5. Add webhook for inbound processing (Resend only)

After deploying this project:

1. Go to [Resend Webhooks](https://resend.com/webhooks) → **Add Webhook**.
2. URL: `https://elidine-homepage.vercel.app/api/support/inbound`
   - Once `elidine.com` is moved to this project, use `https://elidine.com/api/support/inbound` instead.
   - Currently `elidine.com` is assigned to the `copy-of-hairstylist` project — move it in Vercel → Domains if you want the API on the apex domain.
3. Event: `email.received`.
4. Copy the **Signing Secret** and add it to Vercel as `RESEND_WEBHOOK_SECRET`.

## 6. Environment variables

Add these in Vercel → Project → Settings → Environment Variables:

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Auto-added by Resend integration |
| `RESEND_WEBHOOK_SECRET` | From Resend webhook signing secret |
| `SUPPORT_FROM_EMAIL` | `Elidine Support <support@elidine.com>` |
| `ADMIN_API_KEY` | For admin API access (existing) |

## API endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/support/send` | POST | Send email from support@elidine.com |
| `/api/support/inbound` | POST | Resend webhook for incoming mail |
| `/api/admin/support-emails` | GET | List received support emails (requires `x-admin-key`) |
| `/api/admin/support-emails?id=<email_id>` | GET | Get full email content |

### Send example

```bash
curl -X POST https://elidine.com/api/support/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "customer@example.com",
    "subject": "Re: Your appointment",
    "html": "<p>Thank you for contacting Elidine support.</p>"
  }'
```

### List received emails (admin)

```bash
curl "https://elidine.com/api/admin/support-emails?limit=20" \
  -H "x-admin-key: YOUR_ADMIN_API_KEY"
```

## Viewing emails

- **Inbox (Workspace):** [Gmail](https://mail.google.com) as `support@elidine.com`
- **Sent via API:** [Resend → Emails → Sent](https://resend.com/emails)
- **Received via Resend** (only if Resend MX enabled): [Resend → Receiving](https://resend.com/emails/receiving)
