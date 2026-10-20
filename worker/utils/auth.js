/**
 * Lightweight token auth for the K-mart Worker.
 *
 * Tokens are random strings stored in the KmartUsers namespace with a TTL.
 * The User-Id is embedded in the token key so a single KV read resolves both.
 */

import { KV, keys, getJson, putJson, makeToken } from '../kv-schema.js';

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function createSession(env, userId) {
  const token = makeToken();
  await putJson(
    env,
    KV.USERS,
    keys.userByToken(token),
    { userId, createdAt: Date.now() },
    { expirationTtl: TOKEN_TTL_SECONDS }
  );
  return token;
}

export async function resolveUser(env, request) {
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return null;

  const session = await getJson(env, KV.USERS, keys.userByToken(token), null);
  if (!session || !session.userId) return null;

  const user = await getJson(env, KV.USERS, keys.user(session.userId), null);
  if (!user) return null;
  return { user, token };
}

export async function requireUser(env, request) {
  const session = await resolveUser(env, request);
  return session ? session.user : null;
}

/**
 * Password hashing using PBKDF2 (WebCrypto).
 * Format: pbkdf2$<iterations>$<saltHex>$<hashHex>
 */
export async function hashPassword(password, saltHex = null, iterations = 100000) {
  const salt = saltHex
    ? new Uint8Array(saltHex.match(/.{2}/g).map((b) => parseInt(b, 16)))
    : crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256
  );

  const toHex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2$${iterations}$${toHex(salt)}$${toHex(bits)}`;
}

export async function verifyPassword(password, stored) {
  if (!stored || !stored.startsWith('pbkdf2$')) return false;
  const [, iterations, saltHex] = stored.split('$');
  const candidate = await hashPassword(password, saltHex, Number(iterations));
  return candidate === stored;
}

/** Simple rate limiter backed by KV (best effort, eventually consistent). */
export async function rateLimit(env, bucket, limit = 20, windowSeconds = 60) {
  const key = `rl:${bucket}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
  const count = (await env[KV.USERS]?.get(key, { type: 'json' })) || 0;
  await env[KV.USERS]?.put(key, JSON.stringify(count + 1), { expirationTtl: windowSeconds * 2 });
  return { allowed: count < limit, remaining: Math.max(0, limit - count - 1) };
}
