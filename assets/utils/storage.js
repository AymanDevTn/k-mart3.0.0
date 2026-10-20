/**
 * Storage Utility - localStorage persistence for K-mart Market Tunisia
 * Handles: cart, wishlist, recently viewed, user preferences, daily check-in, flash sale
 */

const STORAGE_KEYS = {
  CART: 'kmartCart',
  WISHLIST: 'kmartWishlist',
  RECENTLY_VIEWED: 'kmartRecentlyViewed',
  DAILY_VISIT: 'kmartDailyVisit',
  FLASH_SALE: 'kmartFlashEnd',
  LANGUAGE: 'kmartLanguage',
  INSTALL_NUDGE_DISMISSED: 'kmartInstallNudgeDismissed',
  USER_PREFERENCES: 'kmartUserPreferences',
  SELLER_DASHBOARD: 'kmartSellerDashboard'
};

const MAX_RECENTLY_VIEWED = 20;
const MAX_WISHLIST_ITEMS = 100;

/**
 * Generic storage helpers
 */
function get(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return defaultValue;
  }
}

function set(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`Error writing ${key} to localStorage:`, e);
    return false;
  }
}

function remove(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error(`Error removing ${key} from localStorage:`, e);
    return false;
  }
}

/**
 * Cart storage
 */
export const cartStorage = {
  get: () => get(STORAGE_KEYS.CART, {}),
  set: (cart) => set(STORAGE_KEYS.CART, cart),
  clear: () => remove(STORAGE_KEYS.CART),
  addItem: (productId, quantity = 1) => {
    const cart = cartStorage.get();
    cart[productId] = (cart[productId] || 0) + quantity;
    if (cart[productId] <= 0) delete cart[productId];
    cartStorage.set(cart);
    return cart;
  },
  removeItem: (productId) => {
    const cart = cartStorage.get();
    delete cart[productId];
    cartStorage.set(cart);
    return cart;
  },
  updateQuantity: (productId, quantity) => {
    const cart = cartStorage.get();
    if (quantity <= 0) {
      delete cart[productId];
    } else {
      cart[productId] = quantity;
    }
    cartStorage.set(cart);
    return cart;
  },
  getItemCount: () => {
    const cart = cartStorage.get();
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  },
  getTotal: (products) => {
    const cart = cartStorage.get();
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const product = products.find(p => p.id === Number(id));
      return sum + (product ? product.price * qty : 0);
    }, 0);
  }
};

/**
 * Wishlist storage
 */
export const wishlistStorage = {
  get: () => get(STORAGE_KEYS.WISHLIST, []),
  set: (wishlist) => set(STORAGE_KEYS.WISHLIST, wishlist),
  clear: () => remove(STORAGE_KEYS.WISHLIST),
  has: (productId) => wishlistStorage.get().includes(String(productId)),
  add: (productId) => {
    const wishlist = wishlistStorage.get();
    const id = String(productId);
    if (!wishlist.includes(id) && wishlist.length < MAX_WISHLIST_ITEMS) {
      wishlist.unshift(id); // Add to beginning
      wishlistStorage.set(wishlist);
      return true;
    }
    return false;
  },
  remove: (productId) => {
    const wishlist = wishlistStorage.get();
    const index = wishlist.indexOf(String(productId));
    if (index !== -1) {
      wishlist.splice(index, 1);
      wishlistStorage.set(wishlist);
      return true;
    }
    return false;
  },
  toggle: (productId) => {
    const id = String(productId);
    if (wishlistStorage.has(id)) {
      wishlistStorage.remove(id);
      return { added: false, wishlist: wishlistStorage.get() };
    } else {
      wishlistStorage.add(id);
      return { added: true, wishlist: wishlistStorage.get() };
    }
  },
  getCount: () => wishlistStorage.get().length
};

/**
 * Recently viewed storage
 */
export const recentlyViewedStorage = {
  get: () => get(STORAGE_KEYS.RECENTLY_VIEWED, []),
  set: (list) => set(STORAGE_KEYS.RECENTLY_VIEWED, list),
  clear: () => remove(STORAGE_KEYS.RECENTLY_VIEWED),
  add: (productId) => {
    const list = recentlyViewedStorage.get();
    const id = String(productId);
    // Remove if already exists
    const filtered = list.filter(item => item !== id);
    // Add to beginning
    filtered.unshift(id);
    // Limit size
    const limited = filtered.slice(0, MAX_RECENTLY_VIEWED);
    recentlyViewedStorage.set(limited);
    return limited;
  },
  remove: (productId) => {
    const list = recentlyViewedStorage.get();
    const filtered = list.filter(item => item !== String(productId));
    recentlyViewedStorage.set(filtered);
    return filtered;
  }
};

/**
 * Daily visit reward storage
 */
export const dailyVisitStorage = {
  get: () => get(STORAGE_KEYS.DAILY_VISIT, { points: 0, streak: 0, lastDay: '' }),
  set: (state) => set(STORAGE_KEYS.DAILY_VISIT, state),
  getLocalDay: () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },
  canClaim: () => {
    const state = dailyVisitStorage.get();
    return state.lastDay !== dailyVisitStorage.getLocalDay();
  },
  claim: () => {
    const state = dailyVisitStorage.get();
    const today = dailyVisitStorage.getLocalDay();
    if (state.lastDay === today) return { success: false, state };

    const yesterday = new Date(Date.now() - 86400000);
    const y = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    state.streak = state.lastDay === y ? (state.streak || 0) + 1 : 1;
    state.points = (state.points || 0) + 10;
    state.lastDay = today;

    dailyVisitStorage.set(state);
    return { success: true, state };
  }
};

/**
 * Flash sale countdown storage
 */
export const flashSaleStorage = {
  getEndTime: () => {
    const stored = localStorage.getItem(STORAGE_KEYS.FLASH_SALE);
    let endTime = stored ? Number(stored) : 0;
    const now = Date.now();
    if (!endTime || endTime < now) {
      endTime = now + 5 * 60 * 60 * 1000; // 5 hours from now
      localStorage.setItem(STORAGE_KEYS.FLASH_SALE, String(endTime));
    }
    return endTime;
  },
  reset: () => {
    const endTime = Date.now() + 5 * 60 * 60 * 1000;
    localStorage.setItem(STORAGE_KEYS.FLASH_SALE, String(endTime));
    return endTime;
  },
  getTimeLeft: () => Math.max(0, flashSaleStorage.getEndTime() - Date.now())
};

/**
 * User preferences storage
 */
export const preferencesStorage = {
  get: () => get(STORAGE_KEYS.USER_PREFERENCES, {
    theme: 'light',
    notifications: true,
    emailUpdates: false,
    currency: 'TND'
  }),
  set: (prefs) => set(STORAGE_KEYS.USER_PREFERENCES, prefs),
  update: (key, value) => {
    const prefs = preferencesStorage.get();
    prefs[key] = value;
    preferencesStorage.set(prefs);
    return prefs;
  }
};

/**
 * Install nudge dismissed storage
 */
export const installNudgeStorage = {
  isDismissed: () => localStorage.getItem(STORAGE_KEYS.INSTALL_NUDGE_DISMISSED) === '1',
  dismiss: () => localStorage.setItem(STORAGE_KEYS.INSTALL_NUDGE_DISMISSED, '1'),
  reset: () => localStorage.removeItem(STORAGE_KEYS.INSTALL_NUDGE_DISMISSED)
};

/**
 * Seller dashboard demo storage
 */
export const sellerDashboardStorage = {
  get: () => get(STORAGE_KEYS.SELLER_DASHBOARD, {
    products: [],
    orders: [],
    analytics: { views: 0, sales: 0, revenue: 0 }
  }),
  set: (data) => set(STORAGE_KEYS.SELLER_DASHBOARD, data),
  addProduct: (product) => {
    const data = sellerDashboardStorage.get();
    product.id = product.id || Date.now().toString();
    product.createdAt = Date.now();
    data.products.unshift(product);
    sellerDashboardStorage.set(data);
    return product;
  },
  updateProduct: (productId, updates) => {
    const data = sellerDashboardStorage.get();
    const index = data.products.findIndex(p => p.id === productId);
    if (index !== -1) {
      data.products[index] = { ...data.products[index], ...updates, updatedAt: Date.now() };
      sellerDashboardStorage.set(data);
      return data.products[index];
    }
    return null;
  },
  deleteProduct: (productId) => {
    const data = sellerDashboardStorage.get();
    data.products = data.products.filter(p => p.id !== productId);
    sellerDashboardStorage.set(data);
    return true;
  },
  addOrder: (order) => {
    const data = sellerDashboardStorage.get();
    order.id = order.id || `ORD-${Date.now()}`;
    order.createdAt = Date.now();
    order.status = order.status || 'pending';
    data.orders.unshift(order);
    data.analytics.sales++;
    data.analytics.revenue += order.total || 0;
    sellerDashboardStorage.set(data);
    return order;
  },
  updateOrderStatus: (orderId, status) => {
    const data = sellerDashboardStorage.get();
    const order = data.orders.find(o => o.id === orderId);
    if (order) {
      order.status = status;
      order.updatedAt = Date.now();
      sellerDashboardStorage.set(data);
      return order;
    }
    return null;
  }
};

export { STORAGE_KEYS };