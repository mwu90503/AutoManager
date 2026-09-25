import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getKey() {
  const keyB64 = process.env.ESPN_COOKIE_ENCRYPTION_KEY;
  if (!keyB64) {
    throw new Error('Missing ESPN_COOKIE_ENCRYPTION_KEY environment variable');
  }
  const key = Buffer.from(keyB64, 'base64');
  if (key.length !== 32) {
    throw new Error('ESPN_COOKIE_ENCRYPTION_KEY must decode to 32 bytes');
  }
  return key;
}

// AES-256-GCM: a fresh random IV per value, auth tag included so
// tampering/corruption is detected on decrypt rather than silently
// producing garbage. Output is a single base64 blob: iv || authTag ||
// ciphertext.
export function encrypt(plaintext) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

export function decrypt(encoded) {
  const data = Buffer.from(encoded, 'base64');
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = data.subarray(IV_LENGTH + 16);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
