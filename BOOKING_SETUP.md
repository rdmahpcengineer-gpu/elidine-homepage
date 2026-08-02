# Google Calendar Booking Setup

Appointments are booked by **phone** at **(929) 202-9714** via the Vapi voice agent. The website directs clients to call — it does not accept online bookings.

The Google Calendar API backs voice booking: the Vapi agent checks availability and creates pending calendar events for Eldine to approve.

## How it works

1. **Caller phones** (929) 202-9714 → Vapi agent collects style, date, time, and contact info
2. **Pending event** is created on Google Calendar (yellow, labeled `[PENDING]`)
3. **Eldine reviews** via the admin panel (`/project/admin.html`) or directly in Google Calendar
4. **Approve** → event confirmed (green); client receives calendar invite
5. **Decline** → event removed; slot opens again

## Setup (one-time)

**Start here:** [`GOOGLE_WORKSPACE_SETUP.md`](GOOGLE_WORKSPACE_SETUP.md) — create `support@elidine.com` in Google Workspace and connect Calendar.

### 1. Google Workspace + Calendar

1. Sign up at [Google Workspace](https://workspace.google.com/) for `elidine.com`
2. Create user **`support@elidine.com`** (Eldine's calendar login)
3. Add DNS records in Cloudflare (verification TXT + Google MX)
4. Sign in at [calendar.google.com](https://calendar.google.com) as `support@elidine.com`

### 2. Google Cloud service account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or use an existing one)
3. Enable the **Google Calendar API**
4. Create a **Service Account** (IAM & Admin → Service Accounts)
5. Create a JSON key for the service account and download it

### 3. Share calendar with service account

1. In Google Calendar (as `support@elidine.com`), open calendar settings
2. **Share with specific people** → add the **service account email** (e.g. `elidine-calendar@project.iam.gserviceaccount.com`)
3. Permission: **Make changes to events**

### 4. Environment variables (Vercel)

| Variable | Value |
|----------|-------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Full JSON key contents (paste as one line) |
| `GOOGLE_CALENDAR_ID` | `support@elidine.com` |
| `TIMEZONE` | `America/Chicago` |
| `ADMIN_API_KEY` | Random secret (e.g. `openssl rand -hex 32`) |

For local development, copy `.env.example` to `.env` and fill in the values.

### 5. Vapi voice agent

See `VAPI_SETUP.md` and `scripts/vapi-elidine-prompt.txt` for phone agent configuration.

## Admin panel

Open `/project/admin.html` on your deployed site. Enter your `ADMIN_API_KEY` to view and approve/decline pending bookings.

## API endpoints (used by Vapi)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/availability?date=YYYY-MM-DD&serviceId=knotless` | GET | Open slots for a date |
| `/api/bookings` | POST | Create a pending booking request |
| `/api/admin/bookings` | GET | List pending bookings (requires `X-Admin-Key` header) |
| `/api/admin/update-booking` | PATCH | Approve or decline (requires `X-Admin-Key` header) |

## Business hours (configured in `lib/slots.js`)

- **Monday**: Closed
- **Tuesday–Friday**: 9:30 AM, 11:30 AM, 2:00 PM, 4:30 PM
- **Saturday**: 8:00 AM, 10:30 AM, 1:00 PM
- **Sunday**: 10:00 AM (by appointment)
