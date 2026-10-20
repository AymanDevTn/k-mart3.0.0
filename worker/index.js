/**
 * K-mart Market Tunisia — Cloudflare Worker (API + static assets)
 *
 * Routing:
 *   /api/*        -> JSON API backed by Workers KV
 *   everything else -> static assets from the Pages/Workers asset binding
 */

import { withCors, json, error, notFound, methodNotAllowed } from './utils/http.js';
import * as api from './routes/api.js';

const ASSET_CACHE = 31536000; // 1 year for fingerprinted assets
const HTML_CACHE = 0;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // --- Security headers ---
    if (url.pathname.startsWith('/api/')) {
      const response = await handleApi(request, env, url, ctx);
      return withCors(response);
    }

    // --- Static assets ---
    if (env.ASSETS) {
      const response = await env.ASSETS.fetch(request);
      const headers = new Headers(response.headers);
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      headers.set('X-Frame-Options', 'SAMEORIGIN');
      headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

      if (url.pathname === '/' || url.pathname.endsWith('.html')) {
        headers.set('Cache-Control', `public, max-age=${HTML_CACHE}, must-revalidate`);
      } else if (/\.(png|jpg|jpeg|svg|webp|avif|ico|woff2?)$/.test(url.pathname)) {
        headers.set('Cache-Control', `public, max-age=${ASSET_CACHE}, immutable`);
      } else {
        headers.set('Cache-Control', 'public, max-age=300');
      }
      return new Response(response.body, { status: response.status, headers });
    }

    return new Response('K-mart Market Worker — no ASSETS binding configured', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  },

  /**
   * Scheduled handler — nightly housekeeping on the KV namespaces.
   * Cloudflare free tier allows one cron trigger.
   */
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runHousekeeping(env));
  }
};

/**
 * Housekeeping: drop expired carts/tokens and refresh the product index.
 */
async function runHousekeeping(env) {
  try {
    const { KV, keys, getJson, putJson, getList } = await import('./kv-schema.js');

    // Refresh the product index from the individual product documents
    const index = await getJson(env, KV.PRODUCTS, keys.productIndex(), { items: [] });
    if (index.items && index.items.length) {
      const refreshed = [];
      for (const entry of index.items) {
        const product = await getJson(env, KV.PRODUCTS, keys.product(entry.id), null);
        if (product) {
          refreshed.push({
            id: product.id,
            slug: entry.slug,
            name: product.name,
            category: product.category,
            brand: product.brand,
            price: product.price,
            stock: product.stock,
            rating: product.rating,
            onSale: !!product.onSale,
            featured: !!product.featured,
            createdAt: product.createdAt
          });
        }
      }
      await putJson(env, KV.PRODUCTS, keys.productIndex(), { items: refreshed, updatedAt: Date.now() });
    }

    // Trim long-lived lists (wishlists, recently viewed) for every known user
    const users = await getList(env, KV.USERS, 'index:users');
    for (const userId of users.slice(0, 500)) {
      const wishlist = await getList(env, KV.USERS, keys.userWishlist(userId));
      if (wishlist.length > 100) {
        await putJson(env, KV.USERS, keys.userWishlist(userId), { items: wishlist.slice(0, 100), updatedAt: Date.now() });
      }
    }
  } catch (err) {
    console.error('housekeeping failed:', err);
  }
}

/**
 * API router
 */
async function handleApi(request, env, url, ctx) {
  const path = url.pathname.replace(/^\/api/, '') || '/';
  const method = request.method;
  const segments = path.split('/').filter(Boolean);

  try {
    // Health
    if (path === '/health') {
      return await api.getHealth(env);
    }

    // Config / translations
    if (path === '/config' && method === 'GET') {
      return await api.getConfig(env, url);
    }

    // Products
    if (segments[0] === 'products') {
      if (segments.length === 1 && method === 'GET') {
        return await api.listProducts(env, url);
      }
      if (segments.length === 2 && method === 'GET') {
        return await api.getProduct(env, segments[1]);
      }
      if (segments.length === 3 && segments[2] === 'reviews' && method === 'GET') {
        return await api.listReviews(env, segments[1]);
      }
      if (segments.length === 3 && segments[2] === 'reviews' && method === 'POST') {
        return await api.createReview(env, request, segments[1]);
      }
    }

    // Reviews
    if (segments[0] === 'reviews' && segments.length === 2 && method === 'POST') {
      return await api.markReviewHelpful(env, request, segments[1]);
    }

    // Categories / brands
    if (path === '/categories' && method === 'GET') return await api.getCategories(env);
    if (path === '/brands' && method === 'GET') return await api.getBrands(env);

    // Auth
    if (path === '/auth/register' && method === 'POST') return await api.register(env, request);
    if (path === '/auth/login' && method === 'POST') return await api.login(env, request);
    if (path === '/auth/logout' && method === 'POST') return await api.logout(env, request);

    // User
    if (segments[0] === 'user') {
      if (path === '/user/profile' && method === 'GET') return await api.getProfile(env, request);
      if (path === '/user/profile' && method === 'PUT') return await api.updateProfile(env, request);
      if (path === '/user/wishlist' && method === 'GET') return await api.getWishlist(env, request);
      if (path === '/user/wishlist' && method === 'POST') return await api.addToWishlist(env, request, (await request.clone().json())?.productId);
      if (segments[1] === 'wishlist' && segments.length === 3 && method === 'DELETE') return await api.removeFromWishlist(env, request, segments[2]);
      if (path === '/user/recently-viewed' && method === 'GET') return await api.getRecentlyViewed(env, request);
      if (path === '/user/recently-viewed' && method === 'POST') return await api.trackViewed(env, request);
      if (path === '/user/cart' && method === 'GET') return await api.getCart(env, request);
      if (path === '/user/cart' && method === 'PUT') return await api.saveCart(env, request);
      if (segments[1] === 'orders' && method === 'GET') return await api.listUserOrders(env, request);
      if (segments[1] === 'orders' && segments.length === 3 && method === 'GET') return await api.getOrder(env, request, segments[2]);
    }

    // Orders
    if (path === '/orders' && method === 'POST') return await api.createOrder(env, request);

    // Seller
    if (segments[0] === 'seller') {
      if (path === '/seller/dashboard' && method === 'GET') return await api.getSellerDashboard(env, request);
      if (path === '/seller/products' && method === 'GET') return await api.listSellerProducts(env, request);
      if (path === '/seller/products' && method === 'POST') return await api.createSellerProduct(env, request);
      if (segments[1] === 'products' && segments.length === 3 && method === 'PUT') return await api.updateSellerProduct(env, request, segments[2]);
      if (segments[1] === 'products' && segments.length === 3 && method === 'DELETE') return await api.deleteSellerProduct(env, request, segments[2]);
      if (segments[1] === 'orders' && segments.length === 3 && method === 'PUT') return await api.updateOrderStatus(env, request, segments[2]);
    }

    return notFound('Unknown API route');
  } catch (err) {
    console.error('API error:', err);
    return error('Internal server error', 500);
  }
}
