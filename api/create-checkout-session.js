import {
  buildBookingRecord,
  checkSlotAvailability,
  validateBookingRequest,
} from '../lib/booking.js';
import {
  DEPOSIT_AMOUNT_CENTS,
  DEPOSIT_AMOUNT_DISPLAY,
  getSiteUrl,
  getStripe,
} from '../lib/stripe.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const validation = validateBookingRequest(req.body);
    if (validation.error) {
      return res.status(validation.status).json({ error: validation.error });
    }

    const { booking } = validation;
    const { available } = await checkSlotAvailability(booking);

    if (!available) {
      return res.status(409).json({
        error: 'That time is no longer available. Please pick another slot.',
      });
    }

    const record = buildBookingRecord(booking);
    const stripe = getStripe();
    const siteUrl = getSiteUrl(req);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: booking.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: DEPOSIT_AMOUNT_CENTS,
            product_data: {
              name: 'Elidine Appointment Deposit',
              description: `${booking.service.name} · ${booking.date} at ${booking.time}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId: record.bookingId,
        serviceId: record.serviceId,
        serviceName: record.serviceName,
        date: record.date,
        time: record.time,
        firstName: booking.firstName,
        lastName: booking.lastName,
        email: record.clientEmail,
        phone: record.clientPhone,
        hairLength: record.hairLength,
        hairTexture: record.hairTexture,
        notes: record.notes,
      },
      success_url: `${siteUrl}/project/elidine.html?booking=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/project/elidine.html?booking=cancelled`,
    });

    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
      deposit: DEPOSIT_AMOUNT_DISPLAY,
    });
  } catch (err) {
    console.error('checkout session error:', err);
    return res.status(500).json({
      error: 'Could not start payment',
      message: err.message,
    });
  }
}
