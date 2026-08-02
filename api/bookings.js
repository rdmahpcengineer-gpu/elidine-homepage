import { randomUUID } from 'crypto';
import { getService } from '../lib/config.js';
import {
  createPendingBookingEvent,
  getBusyRanges,
} from '../lib/google-calendar.js';
import {
  filterAvailableSlots,
  getSlotTemplatesForDate,
  parseDateOnly,
  parseTimeOnDate,
  slotEndTime,
} from '../lib/slots.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      serviceId,
      date,
      time,
      firstName,
      lastName,
      email,
      phone,
      hairLength,
      hairTexture,
      notes,
    } = req.body || {};

    if (!serviceId || !date || !time || !firstName || !email) {
      return res.status(400).json({
        error: 'Missing required fields: serviceId, date, time, firstName, email',
      });
    }

    const service = getService(serviceId);
    if (!service) {
      return res.status(400).json({ error: 'Unknown service' });
    }

    const bookingDate = parseDateOnly(date);
    const start = parseTimeOnDate(time, bookingDate);
    const end = slotEndTime(start, service.durHrs);

    // Re-check availability before booking
    const slots = getSlotTemplatesForDate(bookingDate);
    const dayStart = new Date(bookingDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(bookingDate);
    dayEnd.setHours(23, 59, 59, 999);
    const busyRanges = await getBusyRanges(dayStart, dayEnd);
    const available = filterAvailableSlots(slots, busyRanges, service.durHrs);
    const stillAvailable = available.some((s) => s.time === time);

    if (!stillAvailable) {
      return res.status(409).json({
        error: 'That time is no longer available. Please pick another slot.',
      });
    }

    const bookingId = randomUUID();
    const clientName = [firstName, lastName].filter(Boolean).join(' ');

    const event = await createPendingBookingEvent({
      bookingId,
      serviceName: service.name,
      clientName,
      clientEmail: email,
      clientPhone: phone,
      start,
      end,
      notes,
      hairLength,
      hairTexture,
    });

    return res.status(201).json({
      bookingId,
      eventId: event.id,
      status: 'pending',
      message:
        'Your request has been submitted. Eldine will review and confirm within 24 hours.',
      service: service.name,
      date,
      time,
    });
  } catch (err) {
    console.error('booking error:', err);
    return res.status(500).json({
      error: 'Could not submit booking request',
      message: err.message,
    });
  }
}
