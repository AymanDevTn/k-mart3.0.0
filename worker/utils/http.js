/**
 * Shared HTTP helpers for the K-mart Worker.
 */

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};

export function withCors(response) {
  const headers = new Headers(response.headers);
  Object.entries(CORS_HEADERS).forEach(([k, v]) => headers.set(k, v));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers
    }
  });
}

export function error(message, status = 400, extra = {}) {
  return json({ error: message, ...extra }, status);
}

export function notFound(message = 'Not found') {
  return error(message, 404);
}

export function methodNotAllowed(allowed = []) {
  return error('Method not allowed', 405, { allowed });
}

export async function readJson(request) {
  try {
    const text = await request.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

/** Standard cache headers for API responses. */
export function cacheControl(seconds) {
  return { 'Cache-Control': `public, max-age=${seconds}, s-maxage=${seconds}` };
}
