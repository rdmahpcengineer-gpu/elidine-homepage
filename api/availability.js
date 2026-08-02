import { getService } from '../../lib/config.js';
import { getBusyRanges } from '../../lib/google-calendar.js';
import {
  filterAvailableSlots,
  formatDateKey,
  getSlotTemplatesForDate,
  parseDateOnly,
} from '../../lib/slots.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const dateStr = req.query.date;
    const serviceId = req.query.serviceId;
    const durationHrs = req.query.durationHrs
      ? parseFloat(req.query.durationHrs)
      : null;

    if (!dateStr) {
      return res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' });
    }

    const service = serviceId ? getService(serviceId) : null;
    const duration = durationHrs || service?.durHrs || 6;

    const date = parseDateOnly(dateStr);
    const slots = getSlotTemplatesForDate(date);

    if (slots.length === 0) {
      return res.status(200).json({ date: dateStr, slots: [], closed: true });
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const busyRanges = await getBusyRanges(dayStart, dayEnd);
    const available = filterAvailableSlots(slots, busyRanges, duration);

    return res.status(200).json({
      date: dateStr,
      slots: available,
      closed: false,
      durationHrs: duration,
    });
  } catch (err) {
    console.error('availability error:', err);
    return res.status(500).json({
      error: 'Could not load availability',
      message: err.message,
    });
  }
}
