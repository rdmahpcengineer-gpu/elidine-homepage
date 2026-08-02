import { Resend } from 'resend';

export const SUPPORT_FROM =
  process.env.SUPPORT_FROM_EMAIL || 'Elidine Support <support@elidine.com>';

let client;

export function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  if (!client) {
    client = new Resend(apiKey);
  }
  return client;
}

export function isSupportAddress(address) {
  if (!address) return false;
  const normalized = String(address).toLowerCase();
  return (
    normalized.includes('support@elidine.com') ||
    normalized.includes('hello@elidine.com')
  );
}
