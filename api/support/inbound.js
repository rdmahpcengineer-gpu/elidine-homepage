import { getResend, isSupportAddress } from '../../lib/resend.js';

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
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawBody = await readRawBody(req);
    const headers = req.headers;

    if (process.env.RESEND_WEBHOOK_SECRET) {
      const resend = getResend();
      resend.webhooks.verify({
        payload: rawBody,
        headers: {
          id: headers['svix-id'],
          timestamp: headers['svix-timestamp'],
          signature: headers['svix-signature'],
        },
        webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
      });
    }

    const event = JSON.parse(rawBody);
    if (event?.type !== 'email.received') {
      return res.status(200).json({ received: true, ignored: true });
    }

    const { email_id: emailId, to = [], from, subject } = event.data || {};
    const isSupportInbox = to.some(isSupportAddress);

    if (!isSupportInbox) {
      return res.status(200).json({ received: true, routed: false });
    }

    const resend = getResend();
    const { data: email, error } = await resend.emails.receiving.get(emailId);

    if (error) {
      console.error('inbound fetch error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('support@elidine.com received:', {
      emailId,
      from,
      subject,
      to,
      preview: email?.text?.slice(0, 200) || email?.html?.slice(0, 200),
    });

    return res.status(200).json({
      received: true,
      routed: true,
      emailId,
      from,
      subject,
    });
  } catch (err) {
    console.error('inbound webhook error:', err);
    return res.status(400).json({
      error: 'Webhook verification failed',
      message: err.message,
    });
  }
}
