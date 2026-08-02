import { buildBookingRecord, checkSlotAvailability } from '../lib/booking.js';
import { createPendingBookingEvent } from '../lib/google-calendar.js';
import { getStripe, getStripeWebhookSecret } from '../lib/stripe.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = getStripe();
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      getStripeWebhookSecret()
    );
  } catch (err) {
    console.error('webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    if (session.payment_status !== 'paid') {
      return res.status(200).json({ received: true, skipped: 'unpaid' });
    }

    const meta = session.metadata || {};
    const booking = {
      serviceId: meta.serviceId,
      service: { name: meta.serviceName, durHrs: 0 },
      date: meta.date,
      time: meta.time,
      firstName: meta.firstName,
      lastName: meta.lastName,
      email: meta.email,
      phone: meta.phone,
      hairLength: meta.hairLength,
      hairTexture: meta.hairTexture,
      notes: meta.notes,
    };

    // Re-resolve service for duration
    const { getService } = await import('../lib/config.js');
    const service = getService(meta.serviceId);
    if (service) booking.service = service;

    try {
      const { available, start, end } = await checkSlotAvailability(booking);

      if (!available) {
        console.error(
          'Slot unavailable after payment — refunding:',
          meta.bookingId
        );
        const paymentIntentId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id;

        if (paymentIntentId) {
          await stripe.refunds.create({ payment_intent: paymentIntentId });
        }

        return res.status(200).json({
          received: true,
          refunded: true,
          reason: 'slot_unavailable',
        });
      }

      const record = buildBookingRecord(booking, meta.bookingId);

      await createPendingBookingEvent({
        ...record,
        start,
        end,
        paymentSessionId: session.id,
        paymentIntentId:
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id || '',
        depositPaid: true,
      });

      return res.status(200).json({ received: true, bookingId: meta.bookingId });
    } catch (err) {
      console.error('webhook booking error:', err);
      return res.status(500).json({ error: 'Booking creation failed' });
    }
  }

  return res.status(200).json({ received: true });
}
