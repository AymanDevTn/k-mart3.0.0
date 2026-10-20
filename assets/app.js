/**
 * K-mart Market Tunisia — Main Application (V2.3)
 * Integrates: i18n (FR/AR/EN + RTL), wishlist, reviews, advanced filters,
 * recently viewed, multi-step checkout, seller dashboard, a11y and PWA features.
 */
(function () {
  'use strict';

  const { products, categories, brands, governorates, paymentMethods, shippingRates } = window.KMData;
  const S = window.KMStorage;
  const I18N = window.KMi18n;
  const A11Y = window.KMa11y;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const state = {
    lang: 'fr',
    activeCategory: 'Tous',
    searchText: '',
    sort: 'featured',
    filters: {
      minPrice: null,
      maxPrice: null,
      minRating: 0,
      brands: [],
      inStockOnly: false,
      onSaleOnly: false
    },
    cart: S.cartStorage.get(),
    wishlist: S.wishlistStorage.get(),
    recentlyViewed: S.recentlyViewedStorage.get(),
    checkout: {
      step: 1,
      address: { firstName: '', lastName: '', phone: '', address: '', city: '', postalCode: '' },
      paymentMethod: 'cod',
      shippingMethod: 'standard',
      termsAccepted: false
    },
    sellerTab: 'overview',
    auth: { user: null, mode: 'login' }
  };

  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function money(n) {
    if (I18N && I18N.formatCurrency) return I18N.formatCurrency(n);
    return (n / 1000).toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' TND';
  }

  function t(key, params) {
    return I18N ? I18N.t(key, params) : key;
  }

  function lang() {
    return state.lang;
  }

  function productName(p) {
    return (p.name && p.name[state.lang]) || p.name.fr;
  }

  function productDescription(p) {
    return (p.description && p.description[state.lang]) || p.description.fr;
  }

  function categoryName(id) {
    const c = categories.find(x => x.id === id);
    if (!c) return id;
    return (c.name && c.name[state.lang]) || c.name.fr;
  }

  const HTML_ESCAPES = {
    '&': '&' + 'amp;',
    '<': '&' + 'lt;',
    '>': '&' + 'gt;',
    '"': '&' + 'quot;',
    "'": '&' + '#39;'
  };

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
  }

  function showToast(text) {
    const t = $('toast');
    if (!t) return;
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
    if (A11Y) A11Y.announce(text);
  }

  function openModal(title, text) {
    const m = $('demoModal');
    if (!m) return;
    $('modalTitle').textContent = title;
    $('modalText').textContent = text;
    m.classList.add('open');
    m.setAttribute('aria-hidden', 'false');
    if (A11Y) { A11Y.saveFocus(); A11Y.trapFocus(m); }
    setTimeout(() => $('modalOk')?.focus(), 60);
  }

  function closeModal() {
    const m = $('demoModal');
    if (!m) return;
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
    if (A11Y) A11Y.restoreFocus();
  }

  // ---------------------------------------------------------------------------
  // Product list filtering
  // ---------------------------------------------------------------------------
  function filteredProducts() {
    const f = state.filters;
    const q = state.searchText.trim().toLowerCase();

    let list = products.filter(p => {
      if (state.activeCategory !== 'Tous' && p.category !== state.activeCategory) return false;
      if (q) {
        const haystack = (productName(p) + ' ' + p.brand + ' ' + p.category).toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (f.minPrice != null && p.price < f.minPrice) return false;
      if (f.maxPrice != null && p.price > f.maxPrice) return false;
      if (f.minRating && p.rating < f.minRating) return false;
      if (f.brands.length && !f.brands.includes(p.brand)) return false;
      if (f.inStockOnly && p.stock <= 0) return false;
      if (f.onSaleOnly && !p.onSale) return false;
      return true;
    });

    switch (state.sort) {
      case 'low': list.sort((a, b) => a.price - b.price); break;
      case 'high': list.sort((a, b) => b.price - a.price); break;
      case 'newest': list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
      case 'topRated': list.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews); break;
      default: list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.reviews - a.reviews);
    }
    return list;
  }

  function activeFilterCount() {
    const f = state.filters;
    let n = 0;
    if (f.minPrice != null) n++;
    if (f.maxPrice != null) n++;
    if (f.minRating) n++;
    if (f.brands.length) n += f.brands.length;
    if (f.inStockOnly) n++;
    if (f.onSaleOnly) n++;
    return n;
  }

  // ---------------------------------------------------------------------------
  // Renderers
  // ---------------------------------------------------------------------------
  function productCardHtml(p) {
    const wished = state.wishlist.includes(String(p.id));
    const discount = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
    const lowStock = p.stock > 0 && p.stock <= 8;
    return `
    <article class="product-card" data-product="${p.id}" tabindex="0" role="article"
             aria-label="${escapeHtml(productName(p))}">
      <div class="product-image" style="background:${p.bg}">
        <img loading="lazy" src="${p.image}" alt="${escapeHtml(productName(p))}">
        <span class="badge">${escapeHtml(t(`products.productCard.badges.${p.badge}`) === `products.productCard.badges.${p.badge}` ? p.badge : t(`products.productCard.badges.${p.badge}`))}</span>
        <button class="wishlist-btn${wished ? ' active' : ''}" data-wish="${p.id}"
                aria-pressed="${wished}"
                aria-label="${escapeHtml(wished ? t('wishlist.removeAriaLabel') : t('wishlist.addAriaLabel'))} — ${escapeHtml(productName(p))}">
          ${wished ? '♥' : '♡'}
        </button>
        ${discount > 0 ? `<span class="discount-chip">-${discount}%</span>` : ''}
      </div>
      <div class="product-info">
        <div class="product-category">${escapeHtml(categoryName(p.category))} · ${escapeHtml(p.brand)}</div>
        <h3>${escapeHtml(productName(p))}</h3>
        <div class="rating" aria-label="${p.rating} / 5 — ${p.reviews} avis">
          <span aria-hidden="true">★ ★ ★ ★ ★</span>
          <span>${p.rating} (${p.reviews})</span>
        </div>
        <div class="price-row">
          <div class="price">
            ${money(p.price)}
            ${p.oldPrice ? `<small class="old-price">${money(p.oldPrice)}</small>` : ''}
          </div>
          <button class="add-button" aria-label="${escapeHtml(t('products.productCard.addToCart'))} — ${escapeHtml(productName(p))}" data-add="${p.id}">+</button>
        </div>
        ${lowStock ? `<p class="stock-warning">${p.stock} en stock</p>` : ''}
        <button class="details-link" data-product="${p.id}">${escapeHtml(t('products.productCard.viewDetails'))}</button>
      </div>
    </article>`;
  }

  function renderProducts() {
    const list = filteredProducts();
    const grid = $('productGrid');
    if (grid) grid.innerHTML = list.map(productCardHtml).join('');

    const empty = $('emptyState');
    if (empty) {
      empty.hidden = list.length > 0;
      empty.innerHTML = `${escapeHtml(t('products.emptyState'))}
        <button class="text-button" id="emptyResetBtn">${escapeHtml(t('products.clearFilters'))} →</button>`;
    }

    const label = $('resultLabel');
    if (label) {
      label.dataset.category = state.activeCategory;
      label.dataset.count = String(list.length);
      label.textContent = state.activeCategory === 'Tous'
        ? t('products.resultLabel.all')
        : t('products.resultLabel.category', { category: categoryName(state.activeCategory), count: list.length });
    }

    $$('.nav-category').forEach(b => {
      const isActive = b.dataset.category === state.activeCategory;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-current', isActive ? 'true' : 'false');
    });

    const count = $('filterCount');
    if (count) {
      const n = activeFilterCount();
      count.textContent = n ? String(n) : '';
      count.hidden = n === 0;
    }

    renderFilterDrawer();
    renderRecentlyViewed();
  }

  function renderCart() {
    const items = Object.entries(state.cart)
      .map(([id, qty]) => ({ p: products.find(x => x.id === Number(id)), qty }))
      .filter(x => x.p);

    const count = items.reduce((s, x) => s + x.qty, 0);
    const total = items.reduce((s, x) => s + x.p.price * x.qty, 0);

    const cc = $('cartCount');
    if (cc) {
      cc.textContent = count;
      cc.setAttribute('aria-label', String(count));
    }
    const ct = $('cartTotal');
    if (ct) ct.textContent = money(total);

    const cartBtn = $('cartOpen');
    if (cartBtn) cartBtn.setAttribute('aria-label', `${t('header.cartBtn')} (${count})`);

    const holder = $('cartItems');
    if (holder) {
      holder.innerHTML = items.length
        ? items.map(({ p, qty }) => `
          <div class="cart-line">
            <div class="cart-emoji" style="background:${p.bg}" aria-hidden="true">${p.emoji}</div>
            <div class="cart-line-info">
              <b>${escapeHtml(productName(p))}</b>
              <small>${money(p.price)}</small>
              <div class="qty-controls">
                <button data-qty="${p.id}" data-delta="-1" aria-label="${escapeHtml(t('cart.qtyDecrease'))} — ${escapeHtml(productName(p))}">−</button>
                <span aria-live="polite">${qty}</span>
                <button data-qty="${p.id}" data-delta="1" aria-label="${escapeHtml(t('cart.qtyIncrease'))} — ${escapeHtml(productName(p))}">+</button>
              </div>
            </div>
            <button class="remove-line" data-remove="${p.id}" aria-label="${escapeHtml(t('cart.removeAriaLabel'))} — ${escapeHtml(productName(p))}">×</button>
          </div>`).join('')
        : `<div class="cart-empty">${t('cart.empty')}</div>`;
    }
    S.cartStorage.set(state.cart);
  }

  function renderWishlist() {
    const holder = $('wishlistItems');
    if (!holder) return;
    const items = state.wishlist.map(id => products.find(p => p.id === Number(id))).filter(Boolean);
    const countEl = $('wishlistCount');
    if (countEl) {
      countEl.textContent = items.length;
      countEl.hidden = items.length === 0;
    }
    const wlBtn = $('wishlistOpen');
    if (wlBtn) wlBtn.setAttribute('aria-label', `${t('wishlist.title')} (${items.length})`);

    holder.innerHTML = items.length
      ? `<div class="wishlist-grid">${items.map(p => `
          <article class="product-card" data-product="${p.id}">
            <div class="product-image" style="background:${p.bg}">
              <img loading="lazy" src="${p.image}" alt="${escapeHtml(productName(p))}">
              <button class="wishlist-btn active" data-wish="${p.id}" aria-pressed="true"
                      aria-label="${escapeHtml(t('wishlist.removeAriaLabel'))} — ${escapeHtml(productName(p))}">♥</button>
            </div>
            <div class="product-info">
              <h3>${escapeHtml(productName(p))}</h3>
              <div class="price-row">
                <div class="price">${money(p.price)}</div>
                <button class="add-button" data-add="${p.id}" aria-label="${escapeHtml(t('products.productCard.addToCart'))} — ${escapeHtml(productName(p))}">+</button>
              </div>
            </div>
          </article>`).join('')}</div>`
      : `<div class="cart-empty">${t('wishlist.empty')}</div>`;
  }

  function renderRecentlyViewed() {
    const rail = $('recentlyViewedRail');
    if (!rail) return;
    const items = state.recentlyViewed.map(id => products.find(p => p.id === Number(id))).filter(Boolean);
    const section = $('recentlyViewedSection');
    if (section) section.hidden = items.length === 0;
    rail.innerHTML = items.map(p => `
      <article class="mini-card" data-product="${p.id}" tabindex="0" role="button"
               aria-label="${escapeHtml(productName(p))}">
        <img loading="lazy" src="${p.image}" alt="${escapeHtml(productName(p))}">
        <span>${escapeHtml(productName(p))}</span>
        <b>${money(p.price)}</b>
      </article>`).join('');
  }

  function renderCheckin() {
    const daily = S.dailyVisitStorage.get();
    const pointsEl = $('pointsValue');
    const streakEl = $('streakLabel');
    const btn = $('dailyClaimBtn');
    if (pointsEl) { pointsEl.textContent = daily.points || 0; pointsEl.dataset.points = String(daily.points || 0); }
    if (streakEl) { streakEl.textContent = t('dailyCheckin.streakLabel', { count: daily.streak || 0 }); streakEl.dataset.streak = String(daily.streak || 0); }
    if (btn) {
      const claimed = !S.dailyVisitStorage.canClaim();
      btn.disabled = claimed;
      btn.textContent = claimed ? t('dailyCheckin.claimedBtn') : t('dailyCheckin.claimBtn');
    }
    $$('#streakDays span').forEach((el, i) => el.classList.toggle('done', i < Math.min(daily.streak || 0, 7)));
  }

  // ---------------------------------------------------------------------------
  // Product detail modal
  // ---------------------------------------------------------------------------
  let activeProductId = null;

  function openProductDetails(id) {
    const p = products.find(x => x.id === Number(id));
    if (!p) return;
    activeProductId = p.id;

    $('productDetailTitle').textContent = productName(p);
    $('productDetailImage').src = p.image;
    $('productDetailImage').alt = productName(p);
    $('productDetailPrice').innerHTML = `${money(p.price)}${p.oldPrice ? ` <small class="old-price">${money(p.oldPrice)}</small>` : ''}`;
    $('productDetailDescription').textContent = productDescription(p);
    $('productDetailAdd').dataset.add = p.id;

    const wished = state.wishlist.includes(String(p.id));
    const wb = $('productDetailWish');
    if (wb) {
      wb.textContent = wished ? '♥' : '♡';
      wb.classList.toggle('active', wished);
      wb.setAttribute('aria-pressed', String(wished));
      wb.setAttribute('aria-label', `${wished ? t('wishlist.removeAriaLabel') : t('wishlist.addAriaLabel')} — ${productName(p)}`);
    }

    const stockEl = $('productDetailStock');
    if (stockEl) stockEl.textContent = p.stock > 0 ? `${p.stock} en stock` : 'Rupture de stock';

    renderReviews(p.id);

    const modal = $('productDetailModal');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    if (A11Y) { A11Y.saveFocus(); A11Y.trapFocus(modal); }

    // Track recently viewed
    state.recentlyViewed = S.recentlyViewedStorage.add(p.id);
    renderRecentlyViewed();
  }

  function closeProductDetails() {
    const modal = $('productDetailModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    activeProductId = null;
    if (A11Y) A11Y.restoreFocus();
  }

  // ---------------------------------------------------------------------------
  // Reviews
  // ---------------------------------------------------------------------------
  function userReviews() {
    try { return JSON.parse(localStorage.getItem('kmartUserReviews') || '[]'); } catch (e) { return []; }
  }

  function getReviews(productId) {
    const seed = window.KMReviews.getForProduct(productId);
    const mine = userReviews().filter(r => r.productId === Number(productId));
    return mine.concat(seed);
  }

  function renderReviews(productId) {
    const holder = $('reviewList');
    if (!holder) return;
    const list = getReviews(productId);
    const countEl = $('reviewCount');
    if (countEl) countEl.textContent = String(list.length);

    const p = products.find(x => x.id === Number(productId));
    const breakdown = window.KMReviews.getBreakdown(productId);
    const total = list.length || 1;

    const summary = $('reviewSummary');
    if (summary) {
      summary.innerHTML = `
        <div class="review-score">
          <b>${p ? p.rating : '—'}</b>
          <div>
            <div class="rating" aria-hidden="true">★ ★ ★ ★ ★</div>
            <small>${list.length} ${t('products.detailModal.reviewsTab', { count: list.length }).replace(/\(.*\)/, '').trim()}</small>
          </div>
        </div>
        <div class="review-bars">
          ${[5, 4, 3, 2, 1].map(star => {
            const n = breakdown[star] || 0;
            const pct = Math.round((n / total) * 100);
            return `<div class="review-bar-row">
              <span>${star} ★</span>
              <div class="bar"><i style="width:${pct}%"></i></div>
              <small>${n}</small>
            </div>`;
          }).join('')}
        </div>`;
    }

    holder.innerHTML = list.length ? list.map(r => {
      const title = (r.title && r.title[state.lang]) || r.title?.fr || '';
      const content = (r.content && r.content[state.lang]) || r.content?.fr || '';
      return `
      <article class="review-item">
        <header>
          <span class="review-avatar" aria-hidden="true">${escapeHtml(r.userName.charAt(0))}</span>
          <div>
            <b>${escapeHtml(r.userName)}</b>
            <div class="rating" aria-label="${r.rating} / 5">${'★'.repeat(r.rating)}<span class="dim">${'★'.repeat(5 - r.rating)}</span></div>
          </div>
          ${r.verified ? `<span class="verified-badge">✓ ${escapeHtml(t('products.detailModal.verifiedPurchase'))}</span>` : ''}
        </header>
        <h4>${escapeHtml(title)}</h4>
        <p>${escapeHtml(content)}</p>
        <footer>
          <small>${escapeHtml(r.date || '')}</small>
          <button class="helpful-btn" data-helpful="${escapeHtml(r.id)}">👍 ${escapeHtml(t('products.detailModal.helpful', { count: r.helpful || 0 }))}</button>
        </footer>
      </article>`;
    }).join('') : `<p class="muted">${escapeHtml(t('products.detailModal.noReviews'))}</p>`;
  }

  function submitReview(form) {
    if (!activeProductId) return;
    const rating = Number(form.querySelector('[name="rating"]').value);
    const title = form.querySelector('[name="reviewTitle"]').value.trim();
    const content = form.querySelector('[name="reviewContent"]').value.trim();
    if (!rating || !title || !content) {
      showToast(t('common.required'));
      return;
    }
    const reviews = userReviews();
    reviews.unshift({
      id: 'u-' + Date.now(),
      productId: activeProductId,
      userName: state.auth.user ? state.auth.user.name : 'Moi',
      rating,
      title: { fr: title, ar: title, en: title },
      content: { fr: content, ar: content, en: content },
      verified: false,
      helpful: 0,
      date: new Date().toISOString().slice(0, 10)
    });
    localStorage.setItem('kmartUserReviews', JSON.stringify(reviews));
    form.reset();
    renderReviews(activeProductId);
    showToast('✓ ' + t('reviews.submitBtn'));
  }

  // ---------------------------------------------------------------------------
  // Filters drawer
  // ---------------------------------------------------------------------------
  function renderFilterDrawer() {
    const holder = $('filterBody');
    if (!holder) return;
    const f = state.filters;
    const priceMax = Math.max(...products.map(p => p.price));
    const min = f.minPrice != null ? f.minPrice : 0;
    const max = f.maxPrice != null ? f.maxPrice : priceMax;

    holder.innerHTML = `
      <fieldset class="filter-group">
        <legend>${escapeHtml(t('filters.priceRange'))}</legend>
        <div class="price-inputs">
          <label>${escapeHtml(t('filters.minPrice'))}
            <input type="number" id="filterMin" min="0" step="1000" value="${min}" inputmode="numeric">
          </label>
          <label>${escapeHtml(t('filters.maxPrice'))}
            <input type="number" id="filterMax" min="0" step="1000" value="${max}" inputmode="numeric">
          </label>
        </div>
        <input type="range" id="filterRange" min="0" max="${priceMax}" step="1000" value="${max}"
               aria-label="${escapeHtml(t('filters.priceRange'))}">
      </fieldset>

      <fieldset class="filter-group">
        <legend>${escapeHtml(t('filters.rating'))}</legend>
        <div class="rating-options" role="radiogroup" aria-label="${escapeHtml(t('filters.rating'))}">
          ${[4, 3, 2, 0].map(r => `
            <label class="rating-option">
              <input type="radio" name="minRating" value="${r}" ${f.minRating === r ? 'checked' : ''}>
              <span>${r ? '★'.repeat(r) + ' ' + '★'.repeat(5 - r) : t('common.filter') + ' ★'}</span>
            </label>`).join('')}
        </div>
      </fieldset>

      <fieldset class="filter-group">
        <legend>${escapeHtml(t('filters.brands'))}</legend>
        <div class="brand-options">
          ${brands.map(b => `
            <label class="check-option">
              <input type="checkbox" name="brand" value="${escapeHtml(b)}" ${f.brands.includes(b) ? 'checked' : ''}>
              <span>${escapeHtml(b)}</span>
            </label>`).join('')}
        </div>
      </fieldset>

      <fieldset class="filter-group">
        <legend>${escapeHtml(t('filters.availability'))}</legend>
        <label class="check-option">
          <input type="checkbox" id="filterInStock" ${f.inStockOnly ? 'checked' : ''}>
          <span>${escapeHtml(t('filters.inStock'))}</span>
        </label>
        <label class="check-option">
          <input type="checkbox" id="filterOnSale" ${f.onSaleOnly ? 'checked' : ''}>
          <span>${escapeHtml(t('filters.onSale'))}</span>
        </label>
      </fieldset>`;

    const applyBtn = $('filterApply');
    if (applyBtn) applyBtn.textContent = t('filters.apply', { count: activeFilterCount() });
  }

  function applyFilters() {
    const minInput = $('filterMin');
    const maxInput = $('filterMax');
    const rangeInput = $('filterRange');

    if (minInput) {
      const v = parseInt(minInput.value, 10);
      state.filters.minPrice = isNaN(v) ? null : v;
    }
    if (maxInput) {
      const v = parseInt(maxInput.value, 10);
      state.filters.maxPrice = isNaN(v) ? null : v;
    }
    if (rangeInput && state.filters.maxPrice == null) {
      state.filters.maxPrice = parseInt(rangeInput.value, 10);
    }
    const ratingInput = document.querySelector('input[name="minRating"]:checked');
    state.filters.minRating = ratingInput ? Number(ratingInput.value) : 0;
    state.filters.brands = $$('input[name="brand"]:checked').map(i => i.value);
    state.filters.inStockOnly = ($('filterInStock') || {}).checked === true;
    state.filters.onSaleOnly = ($('filterOnSale') || {}).checked === true;

    renderProducts();
    closeFilterDrawer();
    showToast(t('filters.resultsCount', { count: filteredProducts().length }));
  }

  function clearFilters() {
    state.filters = { minPrice: null, maxPrice: null, minRating: 0, brands: [], inStockOnly: false, onSaleOnly: false };
    state.activeCategory = 'Tous';
    state.searchText = '';
    const si = $('searchInput');
    if (si) si.value = '';
    renderProducts();
  }

  function openFilterDrawer() {
    const d = $('filterDrawer');
    if (!d) return;
    renderFilterDrawer();
    d.classList.add('open');
    d.setAttribute('aria-hidden', 'false');
    $('overlay')?.classList.add('show');
    if (A11Y) { A11Y.saveFocus(); A11Y.trapFocus(d); }
  }

  function closeFilterDrawer() {
    const d = $('filterDrawer');
    if (!d) return;
    d.classList.remove('open');
    d.setAttribute('aria-hidden', 'true');
    $('overlay')?.classList.remove('show');
    if (A11Y) A11Y.restoreFocus();
  }

  // ---------------------------------------------------------------------------
  // Cart / checkout
  // ---------------------------------------------------------------------------
  function openCart() {
    $('overlay')?.classList.add('show');
    $('cartDrawer')?.classList.add('open');
    $('cartDrawer')?.setAttribute('aria-hidden', 'false');
    if (A11Y) { A11Y.saveFocus(); A11Y.trapFocus($('cartDrawer')); }
  }

  function closeCart() {
    $('overlay')?.classList.remove('show');
    $('cartDrawer')?.classList.remove('open');
    $('cartDrawer')?.setAttribute('aria-hidden', 'true');
    if (A11Y) A11Y.restoreFocus();
  }

  function openWishlist() {
    renderWishlist();
    $('overlay')?.classList.add('show');
    $('wishlistDrawer')?.classList.add('open');
    $('wishlistDrawer')?.setAttribute('aria-hidden', 'false');
    if (A11Y) { A11Y.saveFocus(); A11Y.trapFocus($('wishlistDrawer')); }
  }

  function closeWishlist() {
    $('overlay')?.classList.remove('show');
    $('wishlistDrawer')?.classList.remove('open');
    $('wishlistDrawer')?.setAttribute('aria-hidden', 'true');
    if (A11Y) A11Y.restoreFocus();
  }

  function cartItems() {
    return Object.entries(state.cart)
      .map(([id, qty]) => ({ p: products.find(x => x.id === Number(id)), qty }))
      .filter(x => x.p);
  }

  function shippingCost() {
    const rate = shippingRates.find(r => r.id === state.checkout.shippingMethod) || shippingRates[0];
    const subtotal = cartItems().reduce((s, x) => s + x.p.price * x.qty, 0);
    return subtotal >= 200000 ? 0 : rate.price; // Free shipping above 200 TND
  }

  function renderCheckout() {
    const step = state.checkout.step;
    const steps = $('checkoutSteps');
    if (steps) {
      steps.innerHTML = [1, 2, 3, 4].map(n => `
        <li class="${n === step ? 'current' : ''} ${n < step ? 'done' : ''}"
            ${n === step ? 'aria-current="step"' : ''}>
          <span class="step-num">${n < step ? '✓' : n}</span>
          <span class="step-label">${escapeHtml(t(`checkout.step${n}`))}</span>
        </li>`).join('');
    }

    const body = $('checkoutBody');
    if (!body) return;

    if (step === 1) {
      const items = cartItems();
      body.innerHTML = `
        <div class="checkout-list">
          ${items.length ? items.map(({ p, qty }) => `
            <div class="checkout-line">
              <span class="cart-emoji" style="background:${p.bg}" aria-hidden="true">${p.emoji}</span>
              <div>
                <b>${escapeHtml(productName(p))}</b>
                <small>${qty} × ${money(p.price)}</small>
              </div>
              <strong>${money(p.price * qty)}</strong>
            </div>`).join('') : `<p class="muted">${escapeHtml(t('cart.empty'))}</p>`}
        </div>
        <div class="checkout-summary">
          <div class="total-row"><span>${escapeHtml(t('cart.subtotal'))}</span><b id="coSubtotal">${money(cartItems().reduce((s, x) => s + x.p.price * x.qty, 0))}</b></div>
          <div class="total-row"><span>${escapeHtml(t('filters.shipping')) || 'Livraison'}</span><b id="coShipping">${money(shippingCost())}</b></div>
          <div class="total-row total-grand"><span>${escapeHtml(t('cart.subtotal'))}</span><b id="coTotal">${money(cartItems().reduce((s, x) => s + x.p.price * x.qty, 0) + shippingCost())}</b></div>
        </div>`;
    } else if (step === 2) {
      const a = state.checkout.address;
      body.innerHTML = `
        <h3 class="checkout-title">${escapeHtml(t('checkout.shippingTitle'))}</h3>
        <p class="muted">${escapeHtml(t('checkout.shippingSubtitle'))}</p>
        <div class="form-grid">
          <label>${escapeHtml(t('checkout.firstName'))}
            <input type="text" name="firstName" value="${escapeHtml(a.firstName)}" autocomplete="given-name" required>
          </label>
          <label>${escapeHtml(t('checkout.lastName'))}
            <input type="text" name="lastName" value="${escapeHtml(a.lastName)}" autocomplete="family-name" required>
          </label>
          <label>${escapeHtml(t('checkout.phone'))}
            <input type="tel" name="phone" value="${escapeHtml(a.phone)}" autocomplete="tel" placeholder="+216" required>
          </label>
          <label>${escapeHtml(t('checkout.city'))}
            <select name="city" required>
              <option value="">—</option>
              ${governorates.map(g => `<option value="${g.value}" ${a.city === g.value ? 'selected' : ''}>${escapeHtml(g.label[state.lang] || g.label.fr)}</option>`).join('')}
            </select>
          </label>
          <label class="full">${escapeHtml(t('checkout.address'))}
            <input type="text" name="address" value="${escapeHtml(a.address)}" autocomplete="street-address" required>
          </label>
          <label>${escapeHtml(t('checkout.postalCode'))}
            <input type="text" name="postalCode" value="${escapeHtml(a.postalCode)}" autocomplete="postal-code" inputmode="numeric">
          </label>
          <label>${escapeHtml(t('filters.shipping'))}
            <select name="shippingMethod">
              ${shippingRates.map(r => `<option value="${r.id}" ${state.checkout.shippingMethod === r.id ? 'selected' : ''}>${escapeHtml(r.label[state.lang] || r.label.fr)} — ${money(r.price)}</option>`).join('')}
            </select>
          </label>
        </div>
        <label class="check-option"><input type="checkbox" id="saveAddress"> <span>${escapeHtml(t('checkout.saveAddress'))}</span></label>`;
    } else if (step === 3) {
      body.innerHTML = `
        <h3 class="checkout-title">${escapeHtml(t('checkout.paymentTitle'))}</h3>
        <p class="muted">${escapeHtml(t('checkout.paymentSubtitle'))}</p>
        <div class="payment-options" role="radiogroup" aria-label="${escapeHtml(t('checkout.paymentTitle'))}">
          ${paymentMethods.map(m => `
            <label class="payment-option${state.checkout.paymentMethod === m.id ? ' selected' : ''}">
              <input type="radio" name="paymentMethod" value="${m.id}" ${state.checkout.paymentMethod === m.id ? 'checked' : ''}>
              <span class="pay-icon" aria-hidden="true">${m.icon}</span>
              <span class="pay-text">
                <b>${escapeHtml(t(`checkout.paymentMethods.${m.id}.label`))}</b>
                <small>${escapeHtml(t(`checkout.paymentMethods.${m.id}.description`))}</small>
              </span>
            </label>`).join('')}
        </div>
        <div class="checkout-summary">
          <div class="total-row"><span>${escapeHtml(t('cart.subtotal'))}</span><b>${money(cartItems().reduce((s, x) => s + x.p.price * x.qty, 0))}</b></div>
          <div class="total-row"><span>${escapeHtml(t('filters.shipping'))}</span><b>${money(shippingCost())}</b></div>
          <div class="total-row total-grand"><span>${escapeHtml(t('cart.subtotal'))}</span><b>${money(cartItems().reduce((s, x) => s + x.p.price * x.qty, 0) + shippingCost())}</b></div>
        </div>`;
    } else {
      const a = state.checkout.address;
      const pm = paymentMethods.find(m => m.id === state.checkout.paymentMethod);
      const ship = shippingRates.find(r => r.id === state.checkout.shippingMethod);
      const gov = governorates.find(g => g.value === a.city);
      body.innerHTML = `
        <h3 class="checkout-title">${escapeHtml(t('checkout.reviewTitle'))}</h3>
        <div class="review-blocks">
          <div class="review-block">
            <b>${escapeHtml(t('checkout.shippingTitle'))}</b>
            <p>${escapeHtml([a.firstName, a.lastName].filter(Boolean).join(' '))}<br>
               ${escapeHtml(a.address || '—')}<br>
               ${escapeHtml(gov ? (gov.label[state.lang] || gov.label.fr) : (a.city || '—'))}
               ${a.postalCode ? ' · ' + escapeHtml(a.postalCode) : ''}<br>
               ${escapeHtml(a.phone || '')}</p>
            <small>${escapeHtml(ship ? (ship.label[state.lang] || ship.label.fr) : '')} — ${money(shippingCost())}</small>
          </div>
          <div class="review-block">
            <b>${escapeHtml(t('checkout.paymentTitle'))}</b>
            <p>${pm ? pm.icon + ' ' + escapeHtml(t(`checkout.paymentMethods.${pm.id}.label`)) : '—'}</p>
          </div>
          <div class="review-block">
            <b>${escapeHtml(t('cart.subtotal'))}</b>
            <p>${money(cartItems().reduce((s, x) => s + x.p.price * x.qty, 0))} + ${money(shippingCost())}</p>
          </div>
        </div>
        <label class="check-option terms">
          <input type="checkbox" id="acceptTerms" ${state.checkout.termsAccepted ? 'checked' : ''}>
          <span>${escapeHtml(t('checkout.termsLabel'))}</span>
        </label>`;
    }

    const prev = $('checkoutPrev');
    const next = $('checkoutNext');
    if (prev) prev.hidden = step === 1;
    if (next) {
      if (step === 4) {
        next.textContent = t('checkout.placeOrder');
        next.classList.add('confirm');
      } else {
        next.textContent = state.lang === 'ar' ? 'التالي →' : state.lang === 'en' ? 'Next →' : 'Suivant →';
        next.classList.remove('confirm');
      }
    }
    const closeBtn = $('checkoutClose');
    if (closeBtn) closeBtn.setAttribute('aria-label', t('common.close'));
  }

  function openCheckout() {
    if (!cartItems().length) {
      showToast(t('cart.empty').replace(/<[^>]+>/g, ''));
      return;
    }
    state.checkout.step = 1;
    renderCheckout();
    const m = $('checkoutModal');
    m.classList.add('open');
    m.setAttribute('aria-hidden', 'false');
    $('overlay')?.classList.add('show');
    if (A11Y) { A11Y.saveFocus(); A11Y.trapFocus(m); }
  }

  function closeCheckout() {
    const m = $('checkoutModal');
    if (!m) return;
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
    $('overlay')?.classList.remove('show');
    if (A11Y) A11Y.restoreFocus();
  }

  function collectAddress(form) {
    const a = state.checkout.address;
    a.firstName = form.querySelector('[name="firstName"]')?.value.trim() || '';
    a.lastName = form.querySelector('[name="lastName"]')?.value.trim() || '';
    a.phone = form.querySelector('[name="phone"]')?.value.trim() || '';
    a.address = form.querySelector('[name="address"]')?.value.trim() || '';
    a.city = form.querySelector('[name="city"]')?.value || '';
    a.postalCode = form.querySelector('[name="postalCode"]')?.value.trim() || '';
    const ship = form.querySelector('[name="shippingMethod"]');
    if (ship) state.checkout.shippingMethod = ship.value;
    return a;
  }

  function validateAddress(a) {
    return !!(a.firstName && a.lastName && a.phone && a.address && a.city);
  }

  function nextCheckoutStep() {
    const step = state.checkout.step;
    const body = $('checkoutBody');

    if (step === 2) {
      const a = collectAddress(body);
      if (!validateAddress(a)) {
        showToast(t('common.required'));
        const firstInvalid = body.querySelector(':invalid');
        firstInvalid?.focus();
        return;
      }
    }
    if (step === 3) {
      const checked = body.querySelector('input[name="paymentMethod"]:checked');
      if (checked) state.checkout.paymentMethod = checked.value;
    }
    if (step === 4) {
      const terms = $('acceptTerms');
      state.checkout.termsAccepted = terms ? terms.checked : false;
      if (!state.checkout.termsAccepted) {
        showToast(t('checkout.termsLabel'));
        terms?.focus();
        return;
      }
      placeOrder();
      return;
    }
    state.checkout.step = Math.min(4, step + 1);
    renderCheckout();
  }

  function prevCheckoutStep() {
    state.checkout.step = Math.max(1, state.checkout.step - 1);
    renderCheckout();
  }

  function placeOrder() {
    const items = cartItems();
    const subtotal = items.reduce((s, x) => s + x.p.price * x.qty, 0);
    const shipping = shippingCost();
    const orderId = 'KM-' + Date.now().toString().slice(-6);
    const order = {
      id: orderId,
      items: items.map(({ p, qty }) => ({ productId: p.id, name: productName(p), qty, price: p.price })),
      address: state.checkout.address,
      paymentMethod: state.checkout.paymentMethod,
      shippingMethod: state.checkout.shippingMethod,
      subtotal,
      shipping,
      total: subtotal + shipping,
      status: 'confirmed',
      createdAt: Date.now()
    };

    // Demo persistence only (localStorage). Production: POST /api/orders
    try {
      const orders = JSON.parse(localStorage.getItem('kmartOrders') || '[]');
      orders.unshift(order);
      localStorage.setItem('kmartOrders', JSON.stringify(orders));
    } catch (e) { /* ignore */ }

    S.sellerDashboardStorage.addOrder({
      id: orderId,
      customer: [state.checkout.address.firstName, state.checkout.address.lastName].filter(Boolean).join(' ') || 'Client',
      items: order.items.length,
      total: order.total,
      status: 'pending',
      createdAt: Date.now()
    });

    state.cart = {};
    S.cartStorage.set({});
    renderCart();

    $('checkoutBody').innerHTML = `
      <div class="checkout-success">
        <span class="success-icon" aria-hidden="true">✓</span>
        <h3>${escapeHtml(t('checkout.successTitle'))}</h3>
        <p>${escapeHtml(t('checkout.successMessage', { orderId }))}</p>
        <p class="muted">${escapeHtml(t('checkout.orderNumber'))}: <b>${escapeHtml(orderId)}</b></p>
        <button class="primary-button" id="checkoutDoneBtn">${escapeHtml(t('products.detailModal.continueShopping'))}</button>
      </div>`;
    $('checkoutPrev').hidden = true;
    $('checkoutNext').hidden = true;
    $('checkoutSteps').innerHTML = '';
    showToast('✓ ' + t('checkout.successTitle'));
  }

  // ---------------------------------------------------------------------------
  // Seller dashboard
  // ---------------------------------------------------------------------------
  function sellerDemoData() {
    const data = S.sellerDashboardStorage.get();
    if (!data.products.length) {
      data.products = products.slice(0, 6).map(p => ({
        id: 'sp-' + p.id,
        name: productName(p),
        price: p.price,
        stock: p.stock,
        status: p.stock > 0 ? 'active' : 'outOfStock',
        createdAt: Date.now() - Math.random() * 1e9
      }));
      if (!data.orders.length) {
        data.orders = [
          { id: 'ORD-1042', customer: 'Amine B.', items: 2, total: 259800, status: 'shipped', createdAt: Date.now() - 86400000 },
          { id: 'ORD-1041', customer: 'Sarra M.', items: 1, total: 129900, status: 'confirmed', createdAt: Date.now() - 172800000 },
          { id: 'ORD-1040', customer: 'Yassine F.', items: 3, total: 398700, status: 'pending', createdAt: Date.now() - 259200000 },
          { id: 'ORD-1039', customer: 'Nour T.', items: 1, total: 45900, status: 'delivered', createdAt: Date.now() - 345600000 }
        ];
      }
      S.sellerDashboardStorage.set(data);
    }
    return data;
  }

  function renderSellerDashboard() {
    const body = $('sellerBody');
    if (!body) return;
    const data = sellerDemoData();
    const tab = state.sellerTab;

    const tabs = ['overview', 'products', 'orders', 'analytics', 'settings'];
    const nav = $('sellerTabs');
    if (nav) {
      nav.innerHTML = tabs.map(tb => `
        <button role="tab" id="sellerTab-${tb}" data-seller-tab="${tb}"
                aria-selected="${tb === tab}" tabindex="${tb === tab ? '0' : '-1'}"
                class="${tb === tab ? 'active' : ''}">${escapeHtml(t(`sellerDashboard.tabs.${tb}`))}</button>`).join('');
      if (A11Y) A11Y.setupArrowNavigation(nav, 'horizontal');
    }

    if (tab === 'overview') {
      const revenue = data.orders.reduce((s, o) => s + o.total, 0);
      body.innerHTML = `
        <div class="stat-grid">
          <div class="stat-card"><span class="stat-icon">💰</span><b>${money(revenue)}</b><small>${escapeHtml(t('sellerDashboard.stats.revenue'))}</small></div>
          <div class="stat-card"><span class="stat-icon">📦</span><b>${data.orders.length}</b><small>${escapeHtml(t('sellerDashboard.stats.orders'))}</small></div>
          <div class="stat-card"><span class="stat-icon">🏷️</span><b>${data.products.length}</b><small>${escapeHtml(t('sellerDashboard.stats.products'))}</small></div>
          <div class="stat-card"><span class="stat-icon">⭐</span><b>4.7</b><small>${escapeHtml(t('sellerDashboard.stats.rating'))}</small></div>
        </div>
        <h3 class="seller-sub">${escapeHtml(t('sellerDashboard.recentOrders'))}</h3>
        ${sellerOrdersTable(data.orders.slice(0, 5))}`;
    } else if (tab === 'products') {
      body.innerHTML = `
        <div class="seller-toolbar">
          <input type="search" id="sellerProductSearch" placeholder="${escapeHtml(t('common.search'))}" aria-label="${escapeHtml(t('common.search'))}">
          <button class="primary-button" id="sellerAddProduct">+ ${escapeHtml(t('sellerDashboard.addProduct'))}</button>
        </div>
        <div class="table-scroll">
          <table class="seller-table">
            <caption class="sr-only">${escapeHtml(t('sellerDashboard.tabs.products'))}</caption>
            <thead><tr>
              <th scope="col">${escapeHtml(t('sellerDashboard.productsTable.name'))}</th>
              <th scope="col">${escapeHtml(t('sellerDashboard.productsTable.price'))}</th>
              <th scope="col">${escapeHtml(t('sellerDashboard.productsTable.stock'))}</th>
              <th scope="col">${escapeHtml(t('sellerDashboard.productsTable.status'))}</th>
              <th scope="col">${escapeHtml(t('sellerDashboard.productsTable.actions'))}</th>
            </tr></thead>
            <tbody>${data.products.map(p => `
              <tr>
                <td>${escapeHtml(p.name)}</td>
                <td>${money(p.price)}</td>
                <td>${p.stock}</td>
                <td><span class="status-pill status-${p.status}">${escapeHtml(t(`sellerDashboard.status.${p.status}`))}</span></td>
                <td class="row-actions">
                  <button data-seller-edit="${p.id}" aria-label="${escapeHtml(t('sellerDashboard.editProduct'))} — ${escapeHtml(p.name)}">✎</button>
                  <button data-seller-delete="${p.id}" aria-label="${escapeHtml(t('sellerDashboard.deleteProduct'))} — ${escapeHtml(p.name)}">🗑</button>
                </td>
              </tr>`).join('')}</tbody>
          </table>
        </div>`;
    } else if (tab === 'orders') {
      body.innerHTML = sellerOrdersTable(data.orders);
    } else if (tab === 'analytics') {
      const max = Math.max(...data.orders.map(o => o.total), 1);
      body.innerHTML = `
        <div class="chart" role="img" aria-label="${escapeHtml(t('sellerDashboard.tabs.analytics'))}">
          ${data.orders.map(o => `
            <div class="bar-col">
              <div class="bar-fill" style="height:${Math.round((o.total / max) * 100)}%" title="${money(o.total)}"></div>
              <small>${escapeHtml(o.id.slice(-4))}</small>
            </div>`).join('')}
        </div>
        <div class="stat-grid compact">
          <div class="stat-card"><b>${data.orders.length}</b><small>${escapeHtml(t('sellerDashboard.stats.orders'))}</small></div>
          <div class="stat-card"><b>${money(data.orders.reduce((s, o) => s + o.total, 0))}</b><small>${escapeHtml(t('sellerDashboard.stats.revenue'))}</small></div>
          <div class="stat-card"><b>${Math.round(data.orders.reduce((s, o) => s + o.total, 0) / Math.max(data.orders.length, 1))}</b><small>Panier moyen</small></div>
          <div class="stat-card"><b>${data.orders.filter(o => o.status === 'delivered').length}</b><small>Livrées</small></div>
        </div>`;
    } else {
      body.innerHTML = `
        <div class="form-grid">
          <label>${escapeHtml(t('auth.name'))}<input type="text" value="K-mart Store" readonly></label>
          <label>${escapeHtml(t('auth.email'))}<input type="email" value="seller@kmart.tn" readonly></label>
          <label>${escapeHtml(t('auth.phone'))}<input type="tel" value="+216 20 000 000" readonly></label>
          <label>Langue<select><option>Français</option><option>العربية</option><option>English</option></select></label>
        </div>
        <p class="muted">${escapeHtml(t('auth.demoNote'))}</p>`;
    }
  }

  function sellerOrdersTable(orders) {
    if (!orders.length) return `<p class="muted">${escapeHtml(t('sellerDashboard.noOrders'))}</p>`;
    return `
      <div class="table-scroll">
        <table class="seller-table">
          <caption class="sr-only">${escapeHtml(t('sellerDashboard.tabs.orders'))}</caption>
          <thead><tr>
            <th scope="col">#</th><th scope="col">Client</th><th scope="col">Articles</th>
            <th scope="col">Total</th><th scope="col">Statut</th>
          </tr></thead>
          <tbody>${orders.map(o => `
            <tr>
              <td>${escapeHtml(o.id)}</td>
              <td>${escapeHtml(o.customer || '—')}</td>
              <td>${o.items}</td>
              <td>${money(o.total)}</td>
              <td><select class="status-select" data-order-status="${escapeHtml(o.id)}" aria-label="${escapeHtml(t('sellerDashboard.tabs.orders'))} ${escapeHtml(o.id)}">
                ${['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${escapeHtml(t(`sellerDashboard.status.${s}`) || s)}</option>`).join('')}
              </select></td>
            </tr>`).join('')}</tbody>
        </table>
      </div>`;
  }

  function openSellerDashboard() {
    state.sellerTab = 'overview';
    renderSellerDashboard();
    const m = $('sellerModal');
    m.classList.add('open');
    m.setAttribute('aria-hidden', 'false');
    $('overlay')?.classList.add('show');
    if (A11Y) { A11Y.saveFocus(); A11Y.trapFocus(m); }
  }

  function closeSellerDashboard() {
    const m = $('sellerModal');
    if (!m) return;
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
    $('overlay')?.classList.remove('show');
    if (A11Y) A11Y.restoreFocus();
  }

  // ---------------------------------------------------------------------------
  // Auth (demo)
  // ---------------------------------------------------------------------------
  function openAuth(mode) {
    state.auth.mode = mode;
    const m = $('authModal');
    const title = $('authTitle');
    const submit = $('authSubmit');
    if (title) title.textContent = mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle');
    if (submit) submit.textContent = mode === 'login' ? t('auth.loginBtn') : t('auth.registerBtn');
    const nameField = $('authNameField');
    if (nameField) nameField.hidden = mode === 'login';
    m.classList.add('open');
    m.setAttribute('aria-hidden', 'false');
    $('overlay')?.classList.add('show');
    if (A11Y) { A11Y.saveFocus(); A11Y.trapFocus(m); }
  }

  function closeAuth() {
    const m = $('authModal');
    if (!m) return;
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
    $('overlay')?.classList.remove('show');
    if (A11Y) A11Y.restoreFocus();
  }

  function submitAuth(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.querySelector('[name="email"]').value.trim();
    const password = form.querySelector('[name="password"]').value;
    const name = form.querySelector('[name="name"]')?.value.trim();
    if (!email || !password) { showToast(t('common.required')); return; }
    if (state.auth.mode === 'register' && password.length < 6) { showToast(t('common.required')); return; }

    state.auth.user = { id: 'u-' + Date.now(), email, name: name || email.split('@')[0], language: state.lang };
    try { localStorage.setItem('kmartUser', JSON.stringify(state.auth.user)); } catch (err) { /* ignore */ }

    closeAuth();
    const acct = $('accountBtn');
    if (acct) acct.innerHTML = `♙ <span>${escapeHtml(state.auth.user.name)}</span>`;
    showToast('✓ ' + (state.auth.mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')));
  }

  // ---------------------------------------------------------------------------
  // Countdown
  // ---------------------------------------------------------------------------
  function updateCountdown() {
    const left = S.flashSaleStorage.getTimeLeft();
    const h = Math.floor(left / 3600000);
    const m = Math.floor(left % 3600000 / 60000);
    const s = Math.floor(left % 60000 / 1000);
    const set = (id, v) => { const el = $(id); if (el) el.textContent = String(v).padStart(2, '0'); };
    set('countHours', h); set('countMinutes', m); set('countSeconds', s);
  }

  // ---------------------------------------------------------------------------
  // Global event delegation
  // ---------------------------------------------------------------------------
  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) {
      e.stopPropagation();
      const id = add.dataset.add;
      state.cart = S.cartStorage.addItem(id, 1);
      renderCart();
      showToast(t('toast.addedToCart'));
      return;
    }

    const wish = e.target.closest('[data-wish]');
    if (wish) {
      e.stopPropagation();
      const id = wish.dataset.wish;
      const res = S.wishlistStorage.toggle(id);
      state.wishlist = res.wishlist;
      renderProducts();
      renderWishlist();
      if (activeProductId === Number(id)) {
        const wb = $('productDetailWish');
        if (wb) {
          wb.textContent = res.added ? '♥' : '♡';
          wb.classList.toggle('active', res.added);
          wb.setAttribute('aria-pressed', String(res.added));
        }
      }
      showToast(res.added ? t('wishlist.toastAdded') : t('wishlist.toastRemoved'));
      return;
    }

    const product = e.target.closest('[data-product]');
    if (product) { openProductDetails(product.dataset.product); return; }

    const cat = e.target.closest('[data-category]');
    if (cat) {
      state.activeCategory = cat.dataset.category;
      renderProducts();
      $('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const qty = e.target.closest('[data-qty]');
    if (qty) {
      const id = qty.dataset.qty;
      const current = state.cart[id] || 0;
      state.cart = S.cartStorage.updateQuantity(id, current + Number(qty.dataset.delta));
      renderCart();
      return;
    }

    const rem = e.target.closest('[data-remove]');
    if (rem) {
      state.cart = S.cartStorage.removeItem(rem.dataset.remove);
      renderCart();
      showToast(t('toast.removedFromCart'));
      return;
    }

    const st = e.target.closest('[data-seller-tab]');
    if (st) {
      state.sellerTab = st.dataset.sellerTab;
      renderSellerDashboard();
      return;
    }

    const del = e.target.closest('[data-seller-delete]');
    if (del) {
      S.sellerDashboardStorage.deleteProduct(del.dataset.sellerDelete);
      renderSellerDashboard();
      showToast(t('common.delete'));
      return;
    }

    const ed = e.target.closest('[data-seller-edit]');
    if (ed) {
      const data = sellerDemoData();
      const p = data.products.find(x => x.id === ed.dataset.sellerEdit);
      if (p) {
        const nextStock = prompt(t('sellerDashboard.productsTable.stock'), p.stock);
        if (nextStock !== null && !isNaN(nextStock)) {
          S.sellerDashboardStorage.updateProduct(p.id, { stock: Number(nextStock), status: Number(nextStock) > 0 ? 'active' : 'outOfStock' });
          renderSellerDashboard();
        }
      }
      return;
    }
  });

  document.addEventListener('change', (e) => {
    const statusSel = e.target.closest('[data-order-status]');
    if (statusSel) {
      S.sellerDashboardStorage.updateOrderStatus(statusSel.dataset.orderStatus, statusSel.value);
      showToast('✓ ' + statusSel.value);
      return;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeCart();
      closeWishlist();
      closeProductDetails();
      closeCheckout();
      closeSellerDashboard();
      closeAuth();
      closeFilterDrawer();
    }
    // Enter/Space on product cards
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.product-card, .mini-card')) {
      e.preventDefault();
      openProductDetails(e.target.dataset.product);
    }
  });

  // ---------------------------------------------------------------------------
  // Wiring
  // ---------------------------------------------------------------------------
  function wire() {
    $('searchForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      state.searchText = $('searchInput').value.trim();
      state.activeCategory = 'Tous';
      renderProducts();
      $('products')?.scrollIntoView({ behavior: 'smooth' });
    });

    $('searchInput')?.addEventListener('input', () => {
      state.searchText = $('searchInput').value.trim();
      renderProducts();
    });

    $('sortSelect')?.addEventListener('change', (e) => {
      state.sort = e.target.value;
      renderProducts();
    });

    $('clearFilters')?.addEventListener('click', clearFilters);
    $('emptyResetBtn')?.addEventListener('click', clearFilters);
    $('shopNow')?.addEventListener('click', () => $('products')?.scrollIntoView({ behavior: 'smooth' }));
    $('flashShopBtn')?.addEventListener('click', () => {
      $('products')?.scrollIntoView({ behavior: 'smooth' });
      state.filters.onSaleOnly = true;
      renderProducts();
    });

    // Cart
    $('cartOpen')?.addEventListener('click', openCart);
    $('cartClose')?.addEventListener('click', closeCart);
    $('checkoutBtn')?.addEventListener('click', openCheckout);

    // Wishlist
    $('wishlistOpen')?.addEventListener('click', openWishlist);
    $('wishlistClose')?.addEventListener('click', closeWishlist);

    // Filters
    $('filterOpen')?.addEventListener('click', openFilterDrawer);
    $('filterClose')?.addEventListener('click', closeFilterDrawer);
    $('filterApply')?.addEventListener('click', applyFilters);
    $('filterClear')?.addEventListener('click', () => { clearFilters(); renderFilterDrawer(); });
    $('filterMin')?.addEventListener('change', applyFilters);
    $('filterMax')?.addEventListener('change', applyFilters);

    // Recently viewed
    $('clearRecent')?.addEventListener('click', () => {
      if (!confirm(t('recentlyViewed.clearConfirm'))) return;
      S.recentlyViewedStorage.clear();
      state.recentlyViewed = [];
      renderRecentlyViewed();
    });

    // Checkout
    $('checkoutNext')?.addEventListener('click', nextCheckoutStep);
    $('checkoutPrev')?.addEventListener('click', prevCheckoutStep);
    $('checkoutClose')?.addEventListener('click', closeCheckout);
    $('checkoutBody')?.addEventListener('click', (e) => {
      if (e.target.id === 'checkoutDoneBtn') { closeCheckout(); $('products')?.scrollIntoView({ behavior: 'smooth' }); }
    });

    // Product detail
    $('productDetailClose')?.addEventListener('click', closeProductDetails);
    $('productDetailDone')?.addEventListener('click', closeProductDetails);
    $('productDetailModal')?.addEventListener('click', (e) => { if (e.target === $('productDetailModal')) closeProductDetails(); });
    $('reviewForm')?.addEventListener('submit', (e) => { e.preventDefault(); submitReview(e.target); });
    $('productDetailTabs')?.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-detail-tab]');
      if (!tab) return;
      $$('[data-detail-tab]').forEach(b => {
        const on = b === tab;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', String(on));
      });
      $$('.detail-tab-panel').forEach(p => { p.hidden = p.dataset.detailPanel !== tab.dataset.detailTab; });
    });

    // Modals
    $('modalClose')?.addEventListener('click', closeModal);
    $('modalOk')?.addEventListener('click', closeModal);
    $('demoModal')?.addEventListener('click', (e) => { if (e.target === $('demoModal')) closeModal(); });

    // Seller
    $('sellerBtn')?.addEventListener('click', openSellerDashboard);
    $('sellerClose')?.addEventListener('click', closeSellerDashboard);
    $('sellerModal')?.addEventListener('click', (e) => { if (e.target === $('sellerModal')) closeSellerDashboard(); });
    $('sellerAddProduct')?.addEventListener('click', () => {
      S.sellerDashboardStorage.addProduct({
        name: 'Nouveau produit démo', price: 49900, stock: 10, status: 'active'
      });
      renderSellerDashboard();
      showToast('✓ ' + t('sellerDashboard.addProduct'));
    });
    $('sellerProductSearch')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      $$('#sellerBody tbody tr').forEach(tr => {
        tr.hidden = !tr.textContent.toLowerCase().includes(q);
      });
    });

    // Auth
    $('accountBtn')?.addEventListener('click', () => {
      if (state.auth.user) {
        openModal(state.auth.user.name, state.auth.user.email);
      } else {
        openAuth('login');
      }
    });
    $('authClose')?.addEventListener('click', closeAuth);
    $('authForm')?.addEventListener('submit', submitAuth);
    $('authSwitch')?.addEventListener('click', () => {
      openAuth(state.auth.mode === 'login' ? 'register' : 'login');
    });

    // Daily check-in
    $('dailyClaimBtn')?.addEventListener('click', () => {
      const res = S.dailyVisitStorage.claim();
      renderCheckin();
      showToast(res.success ? t('dailyCheckin.toastClaimed') : t('dailyCheckin.toastAlreadyClaimed'));
    });

    // Newsletter
    $('newsletterForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      openModal(t('newsletter.successTitle'), t('newsletter.successMessage'));
      e.target.reset();
    });

    // Footer demo links
    $$('.demo-link').forEach(a => a.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(t('modals.demoTitle'), t('modals.demoText'));
    }));

    // Install flow
    $('installNudgeBtn')?.addEventListener('click', () => window.KMPWA.showInstallModal());
    $('installNudgeClose')?.addEventListener('click', () => {
      $('installNudge').style.display = 'none';
      S.installNudgeStorage.dismiss();
    });
    $('installMainBtn')?.addEventListener('click', async () => {
      const outcome = await window.KMPWA.promptInstall();
      if (!outcome) {
        const note = $('installPlatformNote');
        if (note) note.textContent = window.KMPWA.getInstallInstructions();
        showToast(window.KMPWA.getInstallInstructions());
      }
    });
    $('installModalClose')?.addEventListener('click', () => window.KMPWA.hideInstallModal());
    $('installLaterBtn')?.addEventListener('click', () => window.KMPWA.hideInstallModal());

    $('overlay')?.addEventListener('click', () => {
      closeCart(); closeWishlist(); closeProductDetails();
      closeCheckout(); closeSellerDashboard(); closeAuth(); closeFilterDrawer();
    });
  }

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  async function boot() {
    // Restore demo user
    try {
      const saved = JSON.parse(localStorage.getItem('kmartUser') || 'null');
      if (saved) {
        state.auth.user = saved;
        const acct = $('accountBtn');
        if (acct) acct.innerHTML = `♙ <span>${escapeHtml(saved.name)}</span>`;
      }
    } catch (e) { /* ignore */ }

    if (A11Y) A11Y.initA11y();
    if (I18N) {
      await I18N.initI18n();
      state.lang = I18N.getCurrentLanguage();
      window.addEventListener('languagechange', (e) => {
        state.lang = e.detail.language;
        renderAll();
      });
    }

    wire();
    renderAll();

    if (window.KMPWA) {
      window.KMPWA.initPWA().catch(() => {});
    }

    setInterval(updateCountdown, 1000);
    updateCountdown();
  }

  function renderAll() {
    renderProducts();
    renderCart();
    renderWishlist();
    renderCheckin();
    renderRecentlyViewed();
    if (state.checkout.step) renderCheckout();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.KMApp = { state, renderAll, openProductDetails, openCheckout, openSellerDashboard };
})();
