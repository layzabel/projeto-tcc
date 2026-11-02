import { pbkdf2Sync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createCredential, isValidPin, verifyCredential } from '@/platform/credential';

describe('credencial do adulto (R8, FR-043)', () => {
  it('createCredential gera PBKDF2-SHA-256, 210 000 iterações, sal 16 bytes e hash 32 bytes', async () => {
    const cred = await createCredential('1234');
    expect(cred.algorithm).toBe('PBKDF2-SHA-256');
    expect(cred.iterations).toBe(210000);
    expect(Buffer.from(cred.salt, 'base64')).toHaveLength(16);
    expect(Buffer.from(cred.hash, 'base64')).toHaveLength(32);
    const expected = pbkdf2Sync('1234', Buffer.from(cred.salt, 'base64'), 210000, 32, 'sha256');
    expect(cred.hash).toBe(expected.toString('base64'));
  });

  it('verifyCredential aceita a senha certa e recusa a errada', async () => {
    const cred = await createCredential('0042');
    await expect(verifyCredential('0042', cred)).resolves.toBe(true);
    await expect(verifyCredential('0043', cred)).resolves.toBe(false);
    await expect(verifyCredential('abcd', cred)).resolves.toBe(false);
  });

  it('gera sal novo a cada criação', async () => {
    const a = await createCredential('1234');
    const b = await createCredential('1234');
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it.each(['123', '12345', '12a4', '', ' 123', '١٢٣٤'])('rejeita senha "%s"', async (pin) => {
    expect(isValidPin(pin)).toBe(false);
    await expect(createCredential(pin)).rejects.toThrow();
  });

  it('o texto da senha não aparece no objeto', async () => {
    const cred = await createCredential('9876');
    expect(JSON.stringify(cred)).not.toContain('9876');
  });
});
