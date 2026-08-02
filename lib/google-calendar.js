import { google } from 'googleapis';
import { CALENDAR_ID, TIMEZONE } from './config.js';

let calendarClient = null;

function getCredentials() {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!json) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_JSON is not set. See .env.example for setup.'
    );
  }
  return JSON.parse(json);
}

export function getCalendar() {
  if (calendarClient) return calendarClient;

  const credentials = getCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  calendarClient = google.calendar({ version: 'v3', auth });
  return calendarClient;
}

/**
 * @param {Date} timeMin
 * @param {Date} timeMax
 * @returns {Promise<{ start: Date, end: Date }[]>}
 */
export async function getBusyRanges(timeMin, timeMax) {
  const calendar = getCalendar();

  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      timeZone: TIMEZONE,
      items: [{ id: CALENDAR_ID }],
    },
  });

  const busy = res.data.calendars?.[CALENDAR_ID]?.busy || [];
  return busy.map((b) => ({
    start: new Date(b.start),
    end: new Date(b.end),
  }));
}

/**
 * @param {object} booking
 */
export async function createPendingBookingEvent(booking) {
  const calendar = getCalendar();
  const {
    bookingId,
    serviceName,
    clientName,
    clientEmail,
    clientPhone,
    start,
    end,
    notes,
    hairLength,
    hairTexture,
    depositPaid,
    paymentSessionId,
    paymentIntentId,
  } = booking;

  const description = [
    `Status: PENDING — awaiting Eldine's approval`,
    depositPaid ? `Deposit: $50 paid via Stripe` : '',
    depositPaid && paymentSessionId ? `Stripe session: ${paymentSessionId}` : '',
    ``,
    `Client: ${clientName}`,
    `Email: ${clientEmail}`,
    `Phone: ${clientPhone || '—'}`,
    `Service: ${serviceName}`,
    `Hair: ${hairLength || '—'} · ${hairTexture || '—'}`,
    notes ? `Notes: ${notes}` : '',
    ``,
    `Approve or decline in the Elidine admin panel, or change this event to "Confirmed" in Google Calendar.`,
  ]
    .filter(Boolean)
    .join('\n');

  const event = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    sendUpdates: 'all',
    requestBody: {
      summary: `[PENDING] ${serviceName} — ${clientName}`,
      description,
      location: '1969 Arapaho Rd, Apt 2010, Garland, TX 75044',
      start: { dateTime: start.toISOString(), timeZone: TIMEZONE },
      end: { dateTime: end.toISOString(), timeZone: TIMEZONE },
      status: 'tentative',
      colorId: '5', // banana yellow — stands out for review
      attendees: clientEmail
        ? [{ email: clientEmail, responseStatus: 'needsAction' }]
        : undefined,
      extendedProperties: {
        private: {
          elidineBookingId: bookingId,
          elidineStatus: 'pending',
          elidineService: serviceName,
          elidineClientEmail: clientEmail || '',
          elidineClientPhone: clientPhone || '',
          ...(depositPaid
            ? {
                elidineDepositPaid: 'true',
                elidinePaymentSessionId: paymentSessionId || '',
                elidinePaymentIntentId: paymentIntentId || '',
              }
            : {}),
        },
      },
    },
  });

  return event.data;
}

/**
 * @returns {Promise<import('googleapis').calendar_v3.Schema$Event[]>}
 */
export async function listPendingBookings() {
  const calendar = getCalendar();
  const now = new Date();

  const res = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: now.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 50,
    privateExtendedProperty: 'elidineStatus=pending',
  });

  return res.data.items || [];
}

/**
 * @param {string} eventId
 * @param {'approved' | 'declined'} action
 */
export async function updateBookingStatus(eventId, action) {
  const calendar = getCalendar();

  if (action === 'declined') {
    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId,
      sendUpdates: 'all',
    });
    return { status: 'declined' };
  }

  const existing = await calendar.events.get({
    calendarId: CALENDAR_ID,
    eventId,
  });

  const event = existing.data;
  const serviceName =
    event.extendedProperties?.private?.elidineService ||
    event.summary?.replace(/^\[PENDING\]\s*/, '').split(' — ')[0] ||
    'Appointment';
  const clientName =
    event.summary?.split(' — ').pop() || 'Client';

  const description = (event.description || '')
    .replace('Status: PENDING — awaiting Eldine\'s approval', 'Status: CONFIRMED')
    .replace(
      'Approve or decline in the Elidine admin panel, or change this event to "Confirmed" in Google Calendar.',
      'Your appointment is confirmed. We look forward to seeing you!'
    );

  const updated = await calendar.events.patch({
    calendarId: CALENDAR_ID,
    eventId,
    sendUpdates: 'all',
    requestBody: {
      summary: `${serviceName} — ${clientName}`,
      description,
      status: 'confirmed',
      colorId: '10', // green
      extendedProperties: {
        private: {
          ...event.extendedProperties?.private,
          elidineStatus: 'approved',
        },
      },
    },
  });

  return { status: 'approved', event: updated.data };
}
