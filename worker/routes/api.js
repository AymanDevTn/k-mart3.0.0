/**
 * K-mart Market API routes.
 * All amounts are millimes (1 TND = 1000).
 */

import { KV, keys, getJson, putJson, getList, putList, appendToList, makeId, price } from '../kv-schema.js';
import { json, error, notFound, methodNotAllowed, readJson, cacheControl } from '../utils/http.js';
import { createSession, requireUser, hashPassword, verifyPassword, rateLimit } from '../utils/auth.js';

const MAX_WISHLIST = 100;
const MAX_RECENT = 20;

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */
export async function listProducts(env, url) {
  const index = await getJson(env, KV.PRODUCTS, keys.productIndex(), { items: [] });
  let items = index.items || [];

  const q = (url.searchParams.get('q') || '').toLowerCase();
  const category = url.searchParams.get('category');
  const brand = url.searchParams.get('brand');
  const minPrice = Number(url.searchParams.get('minPrice') || 0);
  const maxPrice = Number(url.searchParams.get('maxPrice') || Number.MAX_SAFE_INTEGER);
  const minRating = Number(url.searchParams.get('minRating') || 0);
  const inStock = url.searchParams.get('inStock') === 'true';
  const onSale = url.searchParams.get('onSale') === 'true';
  const sort = url.searchParams.get('sort') || 'featured';
  const limit = Math.min(Number(url.searchParams.get('limit') || 48), 100);
  const offset = Math.max(Number(url.searchParams.get('offset') || 0), 0);

  if (q) {
    items = items.filter((p) =>
      JSON.stringify(p.name).toLowerCase().includes(q) ||
      (p.brand || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  }
  if (category && category !== 'Tous') items = items.filter((p) => p.category === category);
  if (brand) items = items.filter((p) => p.brand === brand);
  if (minPrice) items = items.filter((p) => p.price >= minPrice);
  if (maxPrice !== Number.MAX_SAFE_INTEGER) items = items.filter((p) => p.price <= maxPrice);
  if (minRating) items = items.filter((p) => (p.rating || 0) >= minRating);
  if (inStock) items = items.filter((p) => (p.stock || 0) > 0);
  if (onSale) items = items.filter((p) => p.onSale);

  switch (sort) {
    case 'low': items.sort((a, b) => a.price - b.price); break;
    case 'high': items.sort((a, b) => b.price - a.price); break;
    case 'newest': items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))); break;
    case 'topRated': items.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
    default: items.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }

  const total = items.length;
  const page = items.slice(offset, offset + limit);

  // Hydrate full product documents only for the returned page
  const full = await Promise.all(page.map((p) => getJson(env, KV.PRODUCTS, keys.product(p.id), p)));

  return json({ total, limit, offset, items: full }, 200, cacheControl(60));
}

export async function getProduct(env, id) {
  const product = await getJson(env, KV.PRODUCTS, keys.product(id), null);
  if (!product) return notFound('Product not found');
  const reviews = await getList(env, KV.REVIEWS, keys.productReviews(id));
  return json({ ...product, reviews: reviews.slice(0, 20) }, 200, cacheControl(60));
}

export async function getCategories(env) {
  const index = await getJson(env, KV.PRODUCTS, keys.productIndex(), { items: [] });
  const map = new Map();
  (index.items || []).forEach((p) => {
    if (!map.has(p.category)) map.set(p.category, { id: p.category, count: 0, brands: new Set() });
    const entry = map.get(p.category);
    entry.count++;
    if (p.brand) entry.brands.add(p.brand);
  });
  const categories = Array.from(map.values()).map((c) => ({ id: c.id, count: c.count, brands: Array.from(c.brands) }));
  return json({ items: categories }, 200, cacheControl(300));
}

export async function getBrands(env) {
  const index = await getJson(env, KV.PRODUCTS, keys.productIndex(), { items: [] });
  const brands = new Set((index.items || []).map((p) => p.brand).filter(Boolean));
  return json({ items: Array.from(brands) }, 200, cacheControl(300));
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */
export async function register(env, request) {
  const rl = await rateLimit(env, 'register', 5, 3600);
  if (!rl.allowed) return error('Too many attempts', 429);

  const body = await readJson(request);
  if (!body) return error('Invalid JSON body');
  const { email, password, name, phone, language } = body;
  if (!email || !password) return error('Email and password are required');
  if (String(password).length < 6) return error('Password must be at least 6 characters');

  const normalized = String(email).trim().toLowerCase();
  const existing = await getJson(env, KV.USERS, keys.userByEmail(normalized), null);
  if (existing) return error('An account with this email already exists', 409);

  const id = makeId('usr');
  const user = {
    id,
    email: normalized,
    name: name || normalized.split('@')[0],
    phone: phone || null,
    language: language || 'fr',
    passwordHash: await hashPassword(String(password)),
    wishlist: [],
    recentlyViewed: [],
    addresses: [],
    createdAt: Date.now(),
    lastLoginAt: Date.now()
  };

  await putJson(env, KV.USERS, keys.user(id), user);
  await putJson(env, KV.USERS, keys.userByEmail(normalized), id);
  const token = await createSession(env, id);

  const { passwordHash, ...safe } = user;
  return json({ user: safe, token }, 201);
}

export async function login(env, request) {
  const rl = await rateLimit(env, 'login', 10, 3600);
  if (!rl.allowed) return error('Too many attempts', 429);

  const body = await readJson(request);
  if (!body) return error('Invalid JSON body');
  const { email, password } = body;
  if (!email || !password) return error('Email and password are required');

  const normalized = String(email).trim().toLowerCase();
  const userId = await getJson(env, KV.USERS, keys.userByEmail(normalized), null);
  if (!userId) return error('Invalid credentials', 401);

  const user = await getJson(env, KV.USERS, keys.user(userId), null);
  if (!user) return error('Invalid credentials', 401);

  const ok = await verifyPassword(String(password), user.passwordHash);
  if (!ok) return error('Invalid credentials', 401);

  user.lastLoginAt = Date.now();
  await putJson(env, KV.USERS, keys.user(user.id), user);

  const token = await createSession(env, user.id);
  const { passwordHash, ...safe } = user;
  return json({ user: safe, token });
}

export async function logout(env, request) {
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (token) await env[KV.USERS]?.delete(keys.userByToken(token));
  return json({ ok: true });
}

/* ------------------------------------------------------------------ */
/* User                                                                */
/* ------------------------------------------------------------------ */
export async function getProfile(env, request) {
  const user = await requireUser(env, request);
  if (!user) return error('Unauthorized', 401);
  const { passwordHash, ...safe } = user;
  return json(safe);
}

export async function updateProfile(env, request) {
  const user = await requireUser(env, request);
  if (!user) return error('Unauthorized', 401);
  const body = await readJson(request);
  if (!body) return error('Invalid JSON body');

  const allowed = ['name', 'phone', 'language', 'addresses'];
  allowed.forEach((k) => {
    if (body[k] !== undefined) user[k] = body[k];
  });
  await putJson(env, KV.USERS, keys.user(user.id), user);
  const { passwordHash, ...safe } = user;
  return json(safe);
}

/* Wishlist */
export async function getWishlist(env, request) {
  const user = await requireUser(env, request);
  if (!user) return error('Unauthorized', 401);
  const ids = await getList(env, KV.USERS, keys.userWishlist(user.id));
  const products = await Promise.all(ids.map((id) => getJson(env, KV.PRODUCTS, keys.product(id), null)));
  return json({ items: products.filter(Boolean) });
}

export async function addToWishlist(env, request, productId) {
  const user = await requireUser(env, request);
  if (!user) return error('Unauthorized', 401);
  const ids = await getList(env, KV.USERS, keys.userWishlist(user.id));
  if (!ids.includes(productId)) {
    ids.unshift(productId);
    await putList(env, KV.USERS, keys.userWishlist(user.id), ids, { max: MAX_WISHLIST });
  }
  return json({ items: ids });
}

export async function removeFromWishlist(env, request, productId) {
  const user = await requireUser(env, request);
  if (!user) return error('Unauthorized', 401);
  const ids = await getList(env, KV.USERS, keys.userWishlist(user.id));
  const next = ids.filter((id) => id !== productId);
  await putList(env, KV.USERS, keys.userWishlist(user.id), next, { max: MAX_WISHLIST });
  return json({ items: next });
}

/* Recently viewed */
export async function trackViewed(env, request) {
  const user = await requireUser(env, request);
  if (!user) return error('Unauthorized', 401);
  const body = await readJson(request);
  if (!body || !body.productId) return error('productId is required');
  const ids = await getList(env, KV.USERS, keys.userRecent(user.id));
  const next = [String(body.productId), ...ids.filter((id) => id !== String(body.productId))];
  await putList(env, KV.USERS, keys.userRecent(user.id), next, { max: MAX_RECENT });
  return json({ items: next });
}

export async function getRecentlyViewed(env, request) {
  const user = await requireUser(env, request);
  if (!user) return error('Unauthorized', 401);
  const ids = await getList(env, KV.USERS, keys.userRecent(user.id));
  const products = await Promise.all(ids.map((id) => getJson(env, KV.PRODUCTS, keys.product(id), null)));
  return json({ items: products.filter(Boolean) });
}

/* Cart persistence */
export async function getCart(env, request) {
  const user = await requireUser(env, request);
  if (!user) return error('Unauthorized', 401);
  return json({ items: await getList(env, KV.USERS, keys.userCart(user.id)) });
}

export async function saveCart(env, request) {
  const user = await requireUser(env, request);
  if (!user) return error('Unauthorized', 401);
  const body = await readJson(request);
  if (!body || !Array.isArray(body.items)) return error('items array is required');
  await putList(env, KV.USERS, keys.userCart(user.id), body.items, { max: 100 });
  return json({ items: body.items });
}

/* ------------------------------------------------------------------ */
/* Reviews                                                             */
/* ------------------------------------------------------------------ */
export async function listReviews(env, productId) {
  const reviews = await getList(env, KV.REVIEWS, keys.productReviews(productId));
  return json({ items: reviews }, 200, cacheControl(60));
}

export async function createReview(env, request, productId) {
  const user = await requireUser(env, request);
  if (!user) return error('Unauthorized', 401);
  const body = await readJson(request);
  if (!body) return error('Invalid JSON body');
  const rating = Number(body.rating);
  if (!rating || rating < 1 || rating > 5) return error('rating must be between 1 and 5');

  const review = {
    id: makeId('rev'),
    productId: String(productId),
    userId: user.id,
    userName: user.name,
    rating,
    title: { fr: body.title || '', ar: body.title || '', en: body.title || '' },
    content: { fr: body.content || '', ar: body.content || '', en: body.content || '' },
    verified: !!body.verified,
    helpful: 0,
    createdAt: Date.now()
  };

  await putJson(env, KV.REVIEWS, keys.review(review.id), review);
  await appendToList(env, KV.REVIEWS, keys.productReviews(productId), review, { max: 300 });
  await appendToList(env, KV.REVIEWS, keys.userReviews(user.id), { id: review.id, productId, rating, createdAt: review.createdAt }, { max: 100 });
  return json(review, 201);
}

export async function markReviewHelpful(env, request, reviewId) {
  const review = await getJson(env, KV.REVIEWS, keys.review(reviewId), null);
  if (!review) return notFound('Review not found');
  review.helpful = (review.helpful || 0) + 1;
  await putJson(env, KV.REVIEWS, keys.review(reviewId), review);
  return json(review);
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */
export async function createOrder(env, request) {
  const user = await requireUser(env, request);
  if (!user) return error('Unauthorized', 401);
  const body = await readJson(request);
  if (!body || !Array.isArray(body.items) || !body.items.length) return error('items array is required');

  const items = [];
  for (const item of body.items) {
    const product = await getJson(env, KV.PRODUCTS, keys.product(item.id), null);
    if (!product) continue;
    const qty = Math.max(1, Math.min(Number(item.qty) || 1, product.stock || 1));
    items.push({
      id: product.id,
      name: product.name,
      price: product.price,
      qty,
      sellerId: product.sellerId || null
    });
  }
  if (!items.length) return error('No valid products in cart');

  const shippingMethod = body.shippingMethod === 'express' ? 'express' : 'standard';
  const subtotal = price.subtotal(items);
  const shipping = price.shipping(subtotal, shippingMethod);
  const order = {
    id: makeId('ord'),
    userId: user.id,
    items,
    shippingAddress: body.address || {},
    paymentMethod: body.paymentMethod || 'cod',
    shippingMethod,
    subtotal,
    shipping,
    total: subtotal + shipping,
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await putJson(env, KV.ORDERS, keys.order(order.id), order);
  await appendToList(env, KV.ORDERS, keys.userOrders(user.id), { id: order.id, total: order.total, status: order.status, createdAt: order.createdAt }, { max: 100 });

  // Decrement stock (best effort, KV is eventually consistent)
  for (const item of items) {
    const product = await getJson(env, KV.PRODUCTS, keys.product(item.id), null);
    if (product && typeof product.stock === 'number') {
      product.stock = Math.max(0, product.stock - item.qty);
      await putJson(env, KV.PRODUCTS, keys.product(product.id), product);
    }
  }

  return json(order, 201);
}

export async function listUserOrders(env, request) {
  const user = await requireUser(env, request);
  if (!user) return error('Unauthorized', 401);
  const summary = await getList(env, KV.ORDERS, keys.userOrders(user.id));
  const orders = await Promise.all(summary.map((s) => getJson(env, KV.ORDERS, keys.order(s.id), null)));
  return json({ items: orders.filter(Boolean) });
}

export async function getOrder(env, request, orderId) {
  const user = await requireUser(env, request);
  if (!user) return error('Unauthorized', 401);
  const order = await getJson(env, KV.ORDERS, keys.order(orderId), null);
  if (!order) return notFound('Order not found');
  if (order.userId !== user.id) return error('Forbidden', 403);
  return json(order);
}

/* ------------------------------------------------------------------ */
/* Seller                                                              */
/* ------------------------------------------------------------------ */
export async function getSellerDashboard(env, request) {
  const user = await requireUser(env, request);
  if (!user) return error('Unauthorized', 401);
  const sellerId = await getJson(env, KV.SELLERS, keys.sellerByUser(user.id), null);
  if (!sellerId) return error('No seller profile for this user', 404);

  const seller = await getJson(env, KV.SELLERS, keys.seller(sellerId), null);
  const productIds = await getList(env, KV.SELLERS, keys.sellerProducts(sellerId));
  const products = await Promise.all(productIds.map((id) => getJson(env, KV.PRODUCTS, keys.product(id), null)));
  const orderSummaries = await getList(env, KV.ORDERS, keys.sellerOrders(sellerId));

  const revenue = orderSummaries.reduce((sum, o) => sum + (o.total || 0), 0);
  return json({
    seller,
    stats: {
      revenue,
      orders: orderSummaries.length,
      products: products.filter(Boolean).length,
      rating: seller?.rating || 0
    },
    products: products.filter(Boolean),
    orders: orderSummaries
  });
}

export async function listSellerProducts(env, request) {
  const user = await requireUser(env, request);
  if (!user) return error('Unauthorized', 401);
  const sellerId = await getJson(env, KV.SELLERS, keys.sellerByUser(user.id), null);
  if (!sellerId) return error('No seller profile for this user', 404);
  const ids = await getList(env, KV.SELLERS, keys.sellerProducts(sellerId));
  const products = await Promise.all(ids.map((id) => getJson(env, KV.PRODUCTS, keys.product(id), null)));
  return json({ items: products.filter(Boolean) });
}

export async function createSellerProduct(env, request) {
  const user = await requireUser(env, request);
  if (!user) return error('Unauthorized', 401);
  const sellerId = await getJson(env, KV.SELLERS, keys.sellerByUser(user.id), null);
  if (!sellerId) return error('No seller profile for this user', 403);

  const body = await readJson(request);
  if (!body || !body.name || !body.price) return error('name and price are required');

  const product = {
    id: makeId('prd'),
    name: { fr: body.name, ar: body.nameAr || body.name, en: body.nameEn || body.name },
    description: { fr: body.description || '', ar: body.descriptionAr || body.description || '', en: body.descriptionEn || body.description || '' },
    category: body.category || 'Maison',
    brand: body.brand || 'K-MART',
    price: Number(body.price),
    oldPrice: body.oldPrice ? Number(body.oldPrice) : null,
    stock: Number(body.stock) || 0,
    image: body.image || '',
    rating: 0,
    reviews: 0,
    onSale: false,
    featured: false,
    sellerId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isActive: true
  };

  await putJson(env, KV.PRODUCTS, keys.product(product.id), product);
  await putJson(env, KV.PRODUCTS, keys.productSlug(product.id), product.id);
  await appendToList(env, KV.SELLERS, keys.sellerProducts(sellerId), product.id, { max: 500 });
  return json(product, 201);
}

export async function updateSellerProduct(env, request, productId) {
  const user = await requireUser(env, request);
  if (!user) return error('Unauthorized', 401);
  const sellerId = await getJson(env, KV.SELLERS, keys.sellerByUser(user.id), null);
  if (!sellerId) return error('Forbidden', 403);

  const product = await getJson(env, KV.PRODUCTS, keys.product(productId), null);
  if (!product) return notFound('Product not found');
  if (product.sellerId !== sellerId) return error('Forbidden', 403);

  const body = await readJson(request);
  if (!body) return error('Invalid JSON body');
  ['name', 'description', 'price', 'oldPrice', 'stock', 'category', 'brand', 'image', 'isActive'].forEach((k) => {
    if (body[k] !== undefined) product[k] = body[k];
  });
  product.updatedAt = Date.now();
  await putJson(env, KV.PRODUCTS, keys.product(productId), product);
  return json(product);
}

export async function deleteSellerProduct(env, request, productId) {
  const user = await requireUser(env, request);
  if (!user) return error('Unauthorized', 401);
  const sellerId = await getJson(env, KV.SELLERS, keys.sellerByUser(user.id), null);
  if (!sellerId) return error('Forbidden', 403);

  const product = await getJson(env, KV.PRODUCTS, keys.product(productId), null);
  if (!product) return notFound('Product not found');
  if (product.sellerId !== sellerId) return error('Forbidden', 403);

  product.isActive = false;
  product.updatedAt = Date.now();
  await putJson(env, KV.PRODUCTS, keys.product(productId), product);
  return json({ ok: true, id: productId });
}

export async function updateOrderStatus(env, request, orderId) {
  const user = await requireUser(env, request);
  if (!user) return error('Unauthorized', 401);
  const sellerId = await getJson(env, KV.SELLERS, keys.sellerByUser(user.id), null);
  if (!sellerId) return error('Forbidden', 403);

  const body = await readJson(request);
  if (!body || !body.status) return error('status is required');
  const allowed = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'];
  if (!allowed.includes(body.status)) return error('Invalid status');

  const order = await getJson(env, KV.ORDERS, keys.order(orderId), null);
  if (!order) return notFound('Order not found');
  order.status = body.status;
  order.updatedAt = Date.now();
  await putJson(env, KV.ORDERS, keys.order(orderId), order);
  return json(order);
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */
export async function getConfig(env, url) {
  const lang = url.searchParams.get('lang') || 'fr';
  const translations = await getJson(env, KV.CONFIG, keys.translations(lang), null);
  const settings = await getJson(env, KV.CONFIG, keys.settings(), {});
  return json({ lang, translations, settings }, 200, cacheControl(300));
}

export async function getHealth(env) {
  const bindings = Object.keys(env).filter((k) => k.startsWith('Kmart'));
  return json({ ok: true, bindings, time: Date.now() });
}
