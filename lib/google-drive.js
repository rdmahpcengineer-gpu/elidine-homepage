import { Readable } from 'stream';
import { google } from 'googleapis';
import { GOOGLE_DRIVE_FOLDER_ID } from './config.js';

let driveClient = null;

function getCredentials() {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!json) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_JSON is not set. See VAPI_SETUP.md for Drive setup.'
    );
  }
  return JSON.parse(json);
}

export function getDrive() {
  if (driveClient) return driveClient;

  const credentials = getCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

/**
 * @param {object} params
 * @param {string} params.name
 * @param {string} params.mimeType
 * @param {Buffer} params.buffer
 * @param {string} [params.description]
 */
export async function uploadFileToDrive({ name, mimeType, buffer, description }) {
  if (!GOOGLE_DRIVE_FOLDER_ID) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set');
  }

  const drive = getDrive();
  const res = await drive.files.create({
    requestBody: {
      name,
      parents: [GOOGLE_DRIVE_FOLDER_ID],
      description,
    },
    media: {
      mimeType,
      body: bufferToStream(buffer),
    },
    fields: 'id, name, webViewLink',
    supportsAllDrives: true,
  });

  return res.data;
}

/**
 * @param {object} params
 * @param {string} params.callId
 * @param {string} [params.customerNumber]
 * @param {string} [params.startedAt]
 * @param {string} [params.endedReason]
 * @param {string} [params.transcript]
 * @param {Buffer} [params.recordingBuffer]
 * @param {string} [params.recordingMimeType]
 * @param {string} [params.recordingExt]
 */
export async function archiveCallToDrive({
  callId,
  customerNumber,
  startedAt,
  endedReason,
  transcript,
  recordingBuffer,
  recordingMimeType,
  recordingExt = 'wav',
}) {
  const stamp = (startedAt || new Date().toISOString()).slice(0, 19).replace(/[:T]/g, '-');
  const caller = (customerNumber || 'unknown').replace(/\D/g, '') || 'unknown';
  const prefix = `${stamp}_${caller}_${callId.slice(0, 8)}`;
  const uploaded = [];

  if (recordingBuffer?.length) {
    const file = await uploadFileToDrive({
      name: `${prefix}-recording.${recordingExt}`,
      mimeType: recordingMimeType || 'audio/wav',
      buffer: recordingBuffer,
      description: `Elidine Vapi call ${callId}`,
    });
    uploaded.push(file);
  }

  if (transcript?.trim()) {
    const file = await uploadFileToDrive({
      name: `${prefix}-transcript.txt`,
      mimeType: 'text/plain',
      buffer: Buffer.from(transcript, 'utf8'),
      description: `Transcript for Vapi call ${callId}`,
    });
    uploaded.push(file);
  }

  const meta = {
    callId,
    customerNumber: customerNumber || null,
    startedAt: startedAt || null,
    endedReason: endedReason || null,
    archivedAt: new Date().toISOString(),
    files: uploaded.map((f) => ({ id: f.id, name: f.name, webViewLink: f.webViewLink })),
  };

  const metaFile = await uploadFileToDrive({
    name: `${prefix}-metadata.json`,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(meta, null, 2), 'utf8'),
    description: `Metadata for Vapi call ${callId}`,
  });
  uploaded.push(metaFile);

  return { callId, files: uploaded };
}

function bufferToStream(buffer) {
  return Readable.from(buffer);
}
