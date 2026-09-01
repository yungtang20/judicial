import { CaseContext } from './types';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const toBase64 = (bytes: Uint8Array) => {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary);
};
const fromBase64 = (value: string) => Uint8Array.from(atob(value), char => char.charCodeAt(0));

export async function encryptCaseContext(context: CaseContext, passphrase: string): Promise<string> {
  if (!passphrase || passphrase.length < 12) throw new Error('案件匯出密碼至少需要 12 個字元');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(context)));
  return JSON.stringify({ version: 1, algorithm: 'PBKDF2/AES-GCM', salt: toBase64(salt), iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) });
}

export async function decryptCaseContext(payload: string, passphrase: string): Promise<CaseContext> {
  if (!passphrase) throw new Error('請提供案件匯入密碼');
  const envelope = JSON.parse(payload);
  if (envelope?.version !== 1 || envelope?.algorithm !== 'PBKDF2/AES-GCM') throw new Error('不支援的案件匯入格式');
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: fromBase64(envelope.salt), iterations: 210000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(envelope.iv) }, key, fromBase64(envelope.ciphertext));
  const context = JSON.parse(decoder.decode(plaintext)) as CaseContext;
  if (context.schemaVersion !== 1 || !context.caseId || !context.workflowStage) throw new Error('案件資料結構無效');
  return context;
}
