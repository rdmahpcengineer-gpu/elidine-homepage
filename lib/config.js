/** @typedef {{ id: string, name: string, durHrs: number }} Service */

/** @type {Service[]} */
export const SERVICES = [
  { id: 'knotless', name: 'Knotless Braids', durHrs: 6 },
  { id: 'box', name: 'Box Braids', durHrs: 6 },
  { id: 'goddess', name: 'Goddess Locs', durHrs: 7 },
  { id: 'fulani', name: 'Fulani / Tribal', durHrs: 5 },
  { id: 'cornrows', name: 'Classic Cornrows', durHrs: 2 },
  { id: 'stitch', name: 'Stitch Cornrows', durHrs: 3 },
  { id: 'twists', name: 'Passion / Senegalese', durHrs: 5 },
  { id: 'faux', name: 'Faux Locs', durHrs: 7 },
  { id: 'bridal', name: 'Bridal Crown', durHrs: 6 },
  { id: 'kids', name: 'Little Crowns (Children)', durHrs: 2 },
];

export const TIMEZONE = process.env.TIMEZONE || 'America/Chicago';
export const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';
export const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';
export const STUDIO_ADDRESS = '1969 Arapaho Rd, Apt 2010, Garland, TX 75044';
export const SITE_URL = process.env.SITE_URL || 'https://elidine.com';
export const VAPI_ASSISTANT_ID =
  process.env.VAPI_ASSISTANT_ID || '6e3b77b0-9bca-4acd-997b-b0d1d8ea9620';
export const VAPI_WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET || '';
export const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

export function getService(id) {
  return SERVICES.find((s) => s.id === id) || null;
}
