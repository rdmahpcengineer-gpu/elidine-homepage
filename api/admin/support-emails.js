import { ADMIN_API_KEY } from '../../lib/config.js';
import { getResend } from '../../lib/resend.js';

function checkAuth(req) {
  const key = req.headers['x-admin-key'] || req.query.key;
  return Boolean(ADMIN_API_KEY && key === ADMIN_API_KEY);
}

export default async function handler(req, res) {
  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resend = getResend();
    const emailId = req.query.id;

    if (emailId) {
      const { data, error } = await resend.emails.receiving.get(emailId);
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json(data);
    }

    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const { data, error } = await resend.emails.receiving.list({ limit });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const supportOnly = (data?.data || []).filter((email) =>
      (email.to || []).some((addr) =>
        String(addr).toLowerCase().includes('support@elidine.com'),
      ),
    );

    return res.status(200).json({
      object: 'list',
      has_more: data?.has_more ?? false,
      data: supportOnly,
    });
  } catch (err) {
    console.error('support-emails error:', err);
    return res.status(500).json({
      error: 'Could not fetch support emails',
      message: err.message,
    });
  }
}
