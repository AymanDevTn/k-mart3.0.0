/**
 * K-mart Market Tunisia — Workers KV schema & helpers
 *
 * Design goals (Cloudflare free tier):
 *  - Favour single-key GETs (KV LIST is expensive: 1 op + 1 read per key)
 *  - Keep every namespace < 25 MB (hard limit per key is 25 MB)
 *  - Store collections as JSON documents, sharded when they grow
 */

export const KV = {
  PRODUCTS: 'KmartProducts',
  USERS: 'KmartUsers',
  ORDERS: 'KmartOrders',
  SELLERS: 'KmartSellers',
  REVIEWS: 'KmartReviews',
  CONFIG: 'KmartConfig'
};

/* ------------------------------------------------------------------ */
/* Key builders                                                         */
/* ------------------------------------------------------------------ */

export const keys = {
  /* Products */
  product: (id) => `product:${id}`,
  productSlug: (slug) => `slug:${slug}`,
  productIndex: () => 'index:products',
  productByCategory: (category) => `cat:${category}`,
  productByBrand: (brand) => `brand:${brand}`,
  featuredProducts: () => 'index:featured',
  flashSaleProducts: () => 'index:flash',

  /* Users */
  user: (id) => `user:${id}`,
  userByEmail: (email) => `email:${email}`,
  userByToken: (token) => `token:${token}`,
  userWishlist: (userId) => `wishlist:${userId}`,
  userRecent: (userId) => `recent:${userId}`,
  userCart: (userId) => `cart:${userId}`,
  userAddresses: (userId) => `addresses:${userId}`,

  /* Orders */
  order: (id) => `order:${id}`,
  userOrders: (userId) => `orders:user:${userId}`,
  sellerOrders: (sellerId) => `orders:seller:${sellerId}`,
  orderIndex: () => 'index:orders',

  /* Sellers */
  seller: (id) => `seller:${id}`,
  sellerByUser: (userId) => `seller:user:${userId}`,
  sellerProducts: (sellerId) => `products:seller:${sellerId}`,

  /* Reviews */
  review: (id) => `review:${id}`,
  productReviews: (productId) => `reviews:product:${productId}`,
  userReviews: (userId) => `reviews:user:${userId}`,

  /* Config */
  config: (key) => `config:${key}`,
  translations: (lang) => `i18n:${lang}`,
  settings: () => 'config:settings'
};

/* ------------------------------------------------------------------ */
/* Document helpers                                                     */
/* ------------------------------------------------------------------ */

export async function getJson(env, binding, key, fallback = null) {
  if (!env[binding]) return fallback;
  const raw = await env[binding].get(key, { type: 'json' });
  return raw === null || raw === undefined ? fallback : raw;
}

export async function putJson(env, binding, key, value, options = {}) {
  if (!env[binding]) return null;
  return env[binding].put(key, JSON.stringify(value), options);
}

export async function deleteKey(env, binding, key) {
  if (!env[binding]) return null;
  return env[binding].delete(key);
}

/**
 * Read a list document, tolerating a missing key.
 * Lists are stored as { items: [], updatedAt }
 */
export async function getList(env, binding, key) {
  const doc = await getJson(env, binding, key, { items: [] });
  return Array.isArray(doc) ? doc : (doc.items || []);
}

/**
 * Write a list document, capping the number of retained items.
 */
export async function putList(env, binding, key, items, { max = 200, ttl } = {}) {
  const trimmed = items.slice(0, max);
  return putJson(env, binding, key, { items: trimmed, updatedAt: Date.now() }, ttl ? { expirationTtl: ttl } : undefined);
}

/**
 * Append an item to a capped list document (read-modify-write).
 * Note: KV is eventually consistent — use Durable Objects if strict ordering matters.
 */
export async function appendToList(env, binding, key, item, { max = 200, ttl } = {}) {
  const items = await getList(env, binding, key);
  items.unshift(item);
  await putList(env, binding, key, items, { max, ttl });
  return items;
}

/**
 * Remove an item (by id) from a capped list document.
 */
export async function removeFromList(env, binding, key, id, { max = 200, ttl } = {}) {
  const items = await getList(env, binding, key);
  const next = items.filter((i) => i.id !== id);
  await putList(env, binding, key, next, { max, ttl });
  return next;
}

/**
 * Paginated key scan helper (KV LIST is metered, so keep limits tight).
 */
export async function scanKeys(env, binding, prefix, { limit = 100, cursor } = {}) {
  if (!env[binding]) return { keys: [], listComplete: true, cursor: '' };
  const res = await env[binding].list({ prefix, limit, cursor });
  return {
    keys: res.keys.map((k) => k.name),
    listComplete: res.list_complete,
    cursor: res.cursor
  };
}

/* ------------------------------------------------------------------ */
/* ID generators                                                        */
/* ------------------------------------------------------------------ */

export function makeId(prefix) {
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

export function makeToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/* ------------------------------------------------------------------ */
/* Domain helpers                                                       */
/* ------------------------------------------------------------------ */

/** Price helpers — all amounts are stored in millimes (1 TND = 1000). */
export const price = {
  format: (millimes, locale = 'fr-TN') =>
    (millimes / 1000).toLocaleString(locale, { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' TND',
  subtotal: (items) => items.reduce((sum, i) => sum + i.price * i.qty, 0),
  shipping: (subtotal, method = 'standard') => {
    if (subtotal >= 200000) return 0; // free over 200 TND
    return method === 'express' ? 1500 : 700;
  },
  total: (items, method) => {
    const sub = price.subtotal(items);
    return sub + price.shipping(sub, method);
  }
};

/**
 * Seed the product namespace from the static catalog shipped with the site.
 * Called once via `wrangler dev --local` or the admin endpoint.
 */
export async function seedProducts(env, products) {
  const index = [];
  for (const p of products) {
    await putJson(env, KV.PRODUCTS, keys.product(p.id), p);
    await putJson(env, KV.PRODUCTS, keys.productSlug(p.slug || `product-${p.id}`), p.id);
    index.push({
      id: p.id,
      slug: p.slug || `product-${p.id}`,
      name: p.name,
      category: p.category,
      brand: p.brand,
      price: p.price,
      stock: p.stock,
      rating: p.rating,
      onSale: !!p.onSale,
      featured: !!p.featured,
      createdAt: p.createdAt
    });
  }
  await putJson(env, KV.PRODUCTS, keys.productIndex(), { items: index, updatedAt: Date.now() });
  return index.length;
}
