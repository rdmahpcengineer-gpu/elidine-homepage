import { VAPI_WEBHOOK_SECRET } from '../lib/config.js';
import { archiveCallToDrive } from '../lib/google-drive.js';
import { downloadCallArtifact } from '../lib/vapi.js';

function verifyWebhook(req) {
  if (!VAPI_WEBHOOK_SECRET) return true;
  const secret =
    req.headers['x-vapi-secret'] ||
    req.headers['x-vapi-signature'] ||
    '';
  return secret === VAPI_WEBHOOK_SECRET;
}

/**
 * @param {import('http').IncomingMessage & { body?: unknown }} req
 */
async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!verifyWebhook(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    console.error('vapi webhook parse error:', err);
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const message = body?.message;
  const type = message?.type;

  if (type === 'status-update') {
    return res.status(200).json({ received: true });
  }

  if (type !== 'end-of-call-report') {
    return res.status(200).json({ received: true, ignored: type || 'unknown' });
  }

  const call = message.call || {};
  const callId = call.id;
  if (!callId) {
    return res.status(200).json({ received: true, skipped: 'no-call-id' });
  }

  try {
    const transcript =
      message.artifact?.transcript ||
      call.transcript ||
      formatMessages(message.artifact?.messages || call.messages);

    let recordingBuffer = null;
    let recordingMimeType = 'audio/wav';
    let recordingExt = 'wav';

    try {
      const recording = await downloadCallArtifact(callId, 'stereo-recording');
      recordingBuffer = recording.buffer;
      recordingMimeType = recording.contentType;
      recordingExt = recording.ext;
    } catch (recordingErr) {
      console.warn('stereo recording unavailable, trying mono:', recordingErr.message);
      try {
        const recording = await downloadCallArtifact(callId, 'mono-recording');
        recordingBuffer = recording.buffer;
        recordingMimeType = recording.contentType;
        recordingExt = recording.ext;
      } catch (monoErr) {
        console.warn('mono recording unavailable:', monoErr.message);
      }
    }

    const result = await archiveCallToDrive({
      callId,
      customerNumber: call.customer?.number,
      startedAt: call.startedAt,
      endedReason: message.endedReason || call.endedReason,
      transcript,
      recordingBuffer,
      recordingMimeType,
      recordingExt,
    });

    return res.status(200).json({
      received: true,
      archived: true,
      callId,
      driveFiles: result.files.map((f) => ({
        id: f.id,
        name: f.name,
        webViewLink: f.webViewLink,
      })),
    });
  } catch (err) {
    console.error('vapi archive error:', err);
    return res.status(500).json({
      error: 'Could not archive call to Google Drive',
      message: err.message,
    });
  }
}

/**
 * @param {Array<{ role?: string, message?: string }>} messages
 */
function formatMessages(messages) {
  if (!Array.isArray(messages) || !messages.length) return '';
  return messages
    .filter((m) => m.message && m.role !== 'system')
    .map((m) => {
      const speaker =
        m.role === 'assistant' || m.role === 'bot' ? 'Elidine' : 'Caller';
      return `${speaker}: ${m.message}`;
    })
    .join('\n');
}
