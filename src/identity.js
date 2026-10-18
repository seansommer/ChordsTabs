export function normalizeNickname(value='') {
  return String(value).normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}
export function validateIdentity(nickname, phrase) {
  const n = String(nickname).trim();
  if (n.length < 2 || n.length > 30 || !/[\p{L}\p{N}]/u.test(n)) throw new Error('Use a nickname with 2–30 characters and at least one letter or number.');
  if (typeof phrase !== 'string' || !phrase.trim() || phrase.length > 512) throw new Error('Enter a Secret Word or Phrase (up to 512 characters).');
}
const bytes = value => new TextEncoder().encode(value);
const hex = value => Array.from(new Uint8Array(value), b => b.toString(16).padStart(2,'0')).join('');
export async function digest(value) { return hex(await crypto.subtle.digest('SHA-256',bytes(value))); }
// Firebase handles the authenticated session and server-side password verification.
// No phrase, derived password, or login lookup is saved in the public database.
// Nicknames identify accounts; case and every space in the phrase are significant.
export async function credentials(nickname, phrase, projectId) {
  validateIdentity(nickname, phrase);
  const identity = await digest(`music-center-v1|${normalizeNickname(nickname)}`);
  const key = await crypto.subtle.importKey('raw',bytes(phrase),'PBKDF2',false,['deriveBits']);
  const derived = await crypto.subtle.deriveBits({name:'PBKDF2',salt:bytes(`music-center-v1|${projectId}|${identity}`),iterations:600000,hash:'SHA-256'},key,256);
  return {email:`${identity}@users.musiccenter.invalid`,password:`${hex(derived)}Aa1!`};
}
export function createMessageId() {
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), b=>alphabet[b&31]).join('');
}
export const messageKey = (id,nickname) => digest(`music-message-v1|${String(id).trim().toUpperCase()}|${normalizeNickname(nickname)}`);
