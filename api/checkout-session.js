import { getStripe } from '../lib/stripe.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionId = req.query.session_id;
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(402).json({
        error: 'Payment not completed',
        status: session.payment_status,
      });
    }

    const meta = session.metadata || {};

    return res.status(200).json({
      status: 'paid',
      service: meta.serviceName,
      date: meta.date,
      time: meta.time,
      bookingId: meta.bookingId,
      email: meta.email,
    });
  } catch (err) {
    console.error('checkout session retrieve error:', err);
    return res.status(500).json({
      error: 'Could not verify payment',
      message: err.message,
    });
  }
}
