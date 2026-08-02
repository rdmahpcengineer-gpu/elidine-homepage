import { ADMIN_API_KEY } from '../../lib/config.js';
import { updateBookingStatus } from '../../lib/google-calendar.js';

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

  const { eventId, action } = req.body || {};

  if (!eventId || !['approved', 'declined'].includes(action)) {
    return res.status(400).json({
      error: 'eventId and action (approved|declined) required',
    });
  }

  if (req.method !== 'PATCH' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await updateBookingStatus(eventId, action);
    return res.status(200).json(result);
  } catch (err) {
    console.error('admin update error:', err);
    return res.status(500).json({
      error: 'Could not update booking',
      message: err.message,
    });
  }
}
