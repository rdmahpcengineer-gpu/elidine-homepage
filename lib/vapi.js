import { VAPI_ASSISTANT_ID } from './config.js';

function getToken() {
  const token = process.env.VAPI_PRIVATE_KEY || process.env.VAPI_TOKEN;
  if (!token) {
    throw new Error('VAPI_PRIVATE_KEY or VAPI_TOKEN is not set');
  }
  return token;
}

/**
 * @param {string} path
 * @param {RequestInit} [options]
 */
async function vapiFetch(path, options = {}) {
  const res = await fetch(`https://api.vapi.ai${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Vapi API ${res.status}: ${body}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

/**
 * @param {string} callId
 * @param {'stereo-recording' | 'mono-recording' | 'call-logs'} kind
 */
export async function downloadCallArtifact(callId, kind = 'stereo-recording') {
  const res = await fetch(`https://api.vapi.ai/call/${callId}/${kind}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
    redirect: 'follow',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Vapi artifact ${kind} ${res.status}: ${body}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  const ext =
    kind === 'call-logs'
      ? 'jsonl.gz'
      : contentType.includes('mpeg') || contentType.includes('mp3')
        ? 'mp3'
        : 'wav';

  return { buffer, contentType, ext };
}

/**
 * @param {object} [query]
 */
export async function listCalls(query = {}) {
  const params = new URLSearchParams();
  if (query.assistantId) params.set('assistantId', query.assistantId);
  if (query.limit) params.set('limit', String(query.limit));

  const qs = params.toString();
  return vapiFetch(`/call${qs ? `?${qs}` : ''}`);
}

export async function getCall(callId) {
  return vapiFetch(`/call/${callId}`);
}

export async function listLiveCalls() {
  const calls = await listCalls({
    assistantId: VAPI_ASSISTANT_ID,
    limit: 50,
  });

  const liveStatuses = new Set(['queued', 'ringing', 'in-progress', 'forwarding']);
  return (calls || []).filter((call) => liveStatuses.has(call.status));
}
