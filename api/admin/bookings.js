import { ADMIN_API_KEY } from '../../lib/config.js';
import { listPendingBookings } from '../../lib/google-calendar.js';

function checkAuth(req) {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!ADMIN_API_KEY || key !== ADMIN_API_KEY) {
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const events = await listPendingBookings();

    const bookings = events.map((event) => {
      const props = event.extendedProperties?.private || {};
      const start = event.start?.dateTime || event.start?.date;
      const end = event.end?.dateTime || event.end?.date;

      return {
        eventId: event.id,
        bookingId: props.elidineBookingId,
        summary: event.summary,
        service: props.elidineService,
        clientEmail: props.elidineClientEmail,
        clientPhone: props.elidineClientPhone,
        start,
        end,
        description: event.description,
        htmlLink: event.htmlLink,
      };
    });

    return res.status(200).json({ bookings });
  } catch (err) {
    console.error('admin list error:', err);
    return res.status(500).json({
      error: 'Could not load pending bookings',
      message: err.message,
    });
  }
}
