import { randomUUID } from 'crypto';
import { getService } from './config.js';
import { getBusyRanges } from './google-calendar.js';
import {
  filterAvailableSlots,
  getSlotTemplatesForDate,
  parseDateOnly,
  parseTimeOnDate,
  slotEndTime,
} from './slots.js';

/**
 * @param {object} body
 * @returns {{ error: string, status: number } | { booking: object }}
 */
export function validateBookingRequest(body) {
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
  } = body || {};

  if (!serviceId || !date || !time || !firstName || !email) {
    return {
      error:
        'Missing required fields: serviceId, date, time, firstName, email',
      status: 400,
    };
  }

  const service = getService(serviceId);
  if (!service) {
    return { error: 'Unknown service', status: 400 };
  }

  return {
    booking: {
      serviceId,
      service,
      date,
      time,
      firstName: firstName.trim(),
      lastName: (lastName || '').trim(),
      email: email.trim(),
      phone: (phone || '').trim(),
      hairLength: hairLength || '',
      hairTexture: hairTexture || '',
      notes: (notes || '').trim(),
    },
  };
}

/**
 * @param {object} booking
 * @returns {Promise<{ available: boolean, start: Date, end: Date }>}
 */
export async function checkSlotAvailability(booking) {
  const { service, date, time } = booking;
  const bookingDate = parseDateOnly(date);
  const start = parseTimeOnDate(time, bookingDate);
  const end = slotEndTime(start, service.durHrs);

  const slots = getSlotTemplatesForDate(bookingDate);
  const dayStart = new Date(bookingDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(bookingDate);
  dayEnd.setHours(23, 59, 59, 999);
  const busyRanges = await getBusyRanges(dayStart, dayEnd);
  const available = filterAvailableSlots(slots, busyRanges, service.durHrs);
  const stillAvailable = available.some((s) => s.time === time);

  return { available: stillAvailable, start, end };
}

/**
 * @param {object} booking
 * @param {string} [bookingId]
 */
export function buildBookingRecord(booking, bookingId = randomUUID()) {
  const clientName = [booking.firstName, booking.lastName]
    .filter(Boolean)
    .join(' ');

  return {
    bookingId,
    serviceName: booking.service.name,
    clientName,
    clientEmail: booking.email,
    clientPhone: booking.phone,
    notes: booking.notes,
    hairLength: booking.hairLength,
    hairTexture: booking.hairTexture,
    date: booking.date,
    time: booking.time,
    serviceId: booking.serviceId,
  };
}
