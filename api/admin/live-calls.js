import { ADMIN_API_KEY } from '../../lib/config.js';
import { listLiveCalls } from '../../lib/vapi.js';

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
    const calls = await listLiveCalls();

    const live = calls.map((call) => ({
      id: call.id,
      status: call.status,
      type: call.type,
      startedAt: call.startedAt || call.createdAt,
      customerNumber: call.customer?.number || null,
      listenUrl: call.monitor?.listenUrl || null,
      controlUrl: call.monitor?.controlUrl || null,
      transcript: call.transcript || '',
    }));

    return res.status(200).json({ calls: live });
  } catch (err) {
    console.error('live calls error:', err);
    return res.status(500).json({
      error: 'Could not load live calls',
      message: err.message,
    });
  }
}
