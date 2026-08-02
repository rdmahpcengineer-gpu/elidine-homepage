import { getResend, SUPPORT_FROM } from '../../lib/resend.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, html, text, replyTo } = req.body || {};

    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({
        error: 'Missing required fields: to, subject, and html or text',
      });
    }

    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: SUPPORT_FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      replyTo: replyTo || SUPPORT_FROM,
      tags: [{ name: 'source', value: 'elidine-support' }],
    });

    if (error) {
      console.error('support send error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ id: data.id, status: 'sent' });
  } catch (err) {
    console.error('support send error:', err);
    return res.status(500).json({
      error: 'Could not send email',
      message: err.message,
    });
  }
}
