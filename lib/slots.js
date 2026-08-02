import { TIMEZONE } from './config.js';

/** Day-of-week slot templates: [timeLabel, subLabel, hour24, minute] */
const SLOT_TEMPLATES = {
  0: [['10:00 AM', 'By appointment', 10, 0]], // Sunday
  1: [], // Monday — closed
  6: [
    ['08:00 AM', 'Early chair', 8, 0],
    ['10:30 AM', 'Mid morning', 10, 30],
    ['01:00 PM', 'Afternoon', 13, 0],
  ],
  default: [
    ['09:30 AM', 'Early chair', 9, 30],
    ['11:30 AM', 'Late morning', 11, 30],
    ['02:00 PM', 'Afternoon', 14, 0],
    ['04:30 PM', 'Evening', 16, 30],
  ],
};

/**
 * @param {Date} date
 * @returns {{ time: string, label: string, start: Date, end: Date }[]}
 */
export function getSlotTemplatesForDate(date) {
  const dow = date.getDay();
  if (dow === 1) return [];

  const templates = SLOT_TEMPLATES[dow] ?? SLOT_TEMPLATES.default;
  return templates.map(([time, label, hour, minute]) => {
    const start = new Date(date);
    start.setHours(hour, minute, 0, 0);
    return { time, label, start, end: null };
  });
}

/**
 * @param {Date} start
 * @param {number} durationHrs
 */
export function slotEndTime(start, durationHrs) {
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + durationHrs * 60);
  return end;
}

/**
 * @param {Date} aStart
 * @param {Date} aEnd
 * @param {Date} bStart
 * @param {Date} bEnd
 */
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * @param {{ time: string, label: string, start: Date }[]} slots
 * @param {{ start: Date, end: Date }[]} busyRanges
 * @param {number} durationHrs
 */
export function filterAvailableSlots(slots, busyRanges, durationHrs) {
  const now = new Date();

  return slots
    .map((slot) => {
      const end = slotEndTime(slot.start, durationHrs);
      return { ...slot, end };
    })
    .filter((slot) => {
      if (slot.start <= now) return false;
      return !busyRanges.some((busy) =>
        rangesOverlap(slot.start, slot.end, busy.start, busy.end)
      );
    })
    .map(({ time, label }) => ({ time, label }));
}

/**
 * @param {string} dateStr YYYY-MM-DD
 */
export function parseDateOnly(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * @param {string} timeLabel e.g. "09:30 AM"
 * @param {Date} date
 */
export function parseTimeOnDate(timeLabel, date) {
  const match = timeLabel.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) throw new Error(`Invalid time: ${timeLabel}`);

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();

  if (meridiem === 'PM' && hour !== 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;

  const start = new Date(date);
  start.setHours(hour, minute, 0, 0);
  return start;
}

export function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export { TIMEZONE };
