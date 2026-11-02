// Senha do adulto em forma derivada não reversível (R8, FR-043): PBKDF2-SHA-256 da Web Crypto.
// A senha digitada nunca é gravada nem registrada.

import { PBKDF2_ITERATIONS, type Credential } from '../domain/model';

const PIN_RE = /^\d{4}$/;
const SALT_BYTES = 16;
const HASH_BITS = 256;

export function isValidPin(pin: string): boolean {
  return PIN_RE.test(pin);
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}

function encodePin(pin: string): Uint8Array {
  return Uint8Array.from(pin, (c) => c.charCodeAt(0));
}

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    encodePin(pin) as BufferSource,
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    HASH_BITS,
  );
  return new Uint8Array(bits);
}

// Comparação em tempo constante: percorre sempre todos os bytes.
function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

export async function createCredential(pin: string): Promise<Credential> {
  if (!isValidPin(pin)) {
    throw new Error('A senha deve ter exatamente 4 números.');
  }
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(pin, salt, PBKDF2_ITERATIONS);
  return {
    algorithm: 'PBKDF2-SHA-256',
    iterations: PBKDF2_ITERATIONS,
    salt: toBase64(salt),
    hash: toBase64(hash),
  };
}

export async function verifyCredential(pin: string, credential: Credential): Promise<boolean> {
  if (!isValidPin(pin)) {
    return false;
  }
  const hash = await derive(pin, fromBase64(credential.salt), credential.iterations);
  return sameBytes(hash, fromBase64(credential.hash));
}
