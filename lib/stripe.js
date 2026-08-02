import Stripe from 'stripe';

/** Deposit amount in cents ($50) */
export const DEPOSIT_AMOUNT_CENTS = 5000;

export const DEPOSIT_AMOUNT_DISPLAY = '$50';

let stripeClient = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set. See STRIPE_SETUP.md for setup.'
    );
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export function getStripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET is not set. See STRIPE_SETUP.md for setup.'
    );
  }
  return secret;
}

export function getSiteUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}
