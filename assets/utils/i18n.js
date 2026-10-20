/**
 * i18n Utility - Multi-language support for K-mart Market Tunisia
 * Supports: French (fr), Arabic (ar), English (en)
 * Arabic uses RTL layout
 */

const I18N_STORAGE_KEY = 'kmartLanguage';
const SUPPORTED_LANGUAGES = ['fr', 'ar', 'en'];
const DEFAULT_LANGUAGE = 'fr';

let currentLanguage = DEFAULT_LANGUAGE;
let translations = {};
let isRTL = false;

/**
 * Load translation file for a language
 * @param {string} lang - Language code (fr, ar, en)
 * @returns {Promise<Object>} Translation object
 */
async function loadTranslations(lang) {
  try {
    const response = await fetch(`/assets/i18n/${lang}.json`);
    if (!response.ok) throw new Error(`Failed to load ${lang}.json`);
    return await response.json();
  } catch (error) {
    console.error(`Error loading translations for ${lang}:`, error);
    // Fallback to French if available
    if (lang !== 'fr') {
      return loadTranslations('fr');
    }
    return {};
  }
}

/**
 * Initialize i18n system
 * @param {string} [initialLang] - Optional initial language
 * @returns {Promise<void>}
 */
export async function initI18n(initialLang) {
  // Determine language: parameter > localStorage > browser > default
  const storedLang = localStorage.getItem(I18N_STORAGE_KEY);
  const browserLang = navigator.language.split('-')[0].toLowerCase();
  const lang = initialLang || storedLang || (SUPPORTED_LANGUAGES.includes(browserLang) ? browserLang : DEFAULT_LANGUAGE);

  await setLanguage(lang);
  setupLanguageSwitcher();
  applyRTL();
  translatePage();
}

/**
 * Set current language and load translations
 * @param {string} lang - Language code
 * @returns {Promise<void>}
 */
export async function setLanguage(lang) {
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    console.warn(`Unsupported language: ${lang}, falling back to ${DEFAULT_LANGUAGE}`);
    lang = DEFAULT_LANGUAGE;
  }

  currentLanguage = lang;
  isRTL = lang === 'ar';

  // Load translations
  translations = await loadTranslations(lang);

  // Persist
  localStorage.setItem(I18N_STORAGE_KEY, lang);

  // Update HTML attributes
  document.documentElement.lang = lang;
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';

  // Update language switcher UI
  updateLanguageSwitcherUI();

  // Re-translate page
  translatePage();

  // Dispatch custom event for other modules
  window.dispatchEvent(new CustomEvent('languagechange', { detail: { language: lang, isRTL } }));
}

/**
 * Get current language
 * @returns {string}
 */
export function getCurrentLanguage() {
  return currentLanguage;
}

/**
 * Check if current language is RTL
 * @returns {boolean}
 */
export function getIsRTL() {
  return isRTL;
}

/**
 * Get translation by key path (e.g., 'header.searchPlaceholder')
 * @param {string} key - Dot-notation key path
 * @param {Object} [params] - Parameters for interpolation
 * @returns {string}
 */
export function t(key, params = {}) {
  const keys = key.split('.');
  let value = translations;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      console.warn(`Translation missing for key: ${key}`);
      return key; // Return key as fallback
    }
  }

  if (typeof value !== 'string') {
    return key;
  }

  // Interpolate parameters
  return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
    if (paramKey === 'plural') {
      // Handle pluralization: {count} item{plural}
      const count = params.count || 0;
      return count > 1 ? 's' : '';
    }
    return params[paramKey] !== undefined ? params[paramKey] : match;
  });
}

/**
 * Translate all elements with data-i18n attribute
 */
export function translatePage() {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.dataset.i18n;
    const translation = t(key);

    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      if (element.hasAttribute('placeholder')) {
        element.placeholder = translation;
      } else {
        element.value = translation;
      }
    } else if (element.tagName === 'OPTION') {
      element.textContent = translation;
    } else {
      // Handle HTML content (like hero title with <em>)
      if (key.includes('title') || key.includes('subtitle') || key.includes('description')) {
        element.innerHTML = translation;
      } else {
        element.textContent = translation;
      }
    }
  });

  // Translate elements with data-i18n-attr for attributes
  document.querySelectorAll('[data-i18n-attr]').forEach(element => {
    const attrs = element.dataset.i18nAttr.split(',');
    attrs.forEach(attr => {
      const [attrName, key] = attr.split(':');
      if (attrName && key) {
        element.setAttribute(attrName.trim(), t(key.trim()));
      }
    });
  });

  // Update dynamic content that needs re-rendering
  updateDynamicContent();
}

/**
 * Update dynamic content that depends on current language
 */
function updateDynamicContent() {
  // Update streak label in daily check-in
  const streakLabel = document.getElementById('streakLabel');
  if (streakLabel) {
    const streak = parseInt(streakLabel.dataset.streak || '0', 10);
    streakLabel.textContent = t('dailyCheckin.streakLabel', { count: streak });
  }

  // Update points value
  const pointsValue = document.getElementById('pointsValue');
  if (pointsValue) {
    const points = parseInt(pointsValue.dataset.points || '0', 10);
    pointsValue.textContent = t('dailyCheckin.points', { count: points });
  }

  // Update cart count aria-label
  const cartBtn = document.getElementById('cartOpen');
  if (cartBtn) {
    const count = cartBtn.querySelector('b')?.textContent || '0';
    cartBtn.setAttribute('aria-label', `${t('header.cartBtn')} (${count} ${t('common.optional')})`);
  }

  // Update sort select options
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    const options = sortSelect.querySelectorAll('option');
    const sortKeys = ['featured', 'low', 'high', 'newest', 'topRated'];
    options.forEach((opt, i) => {
      if (sortKeys[i]) {
        opt.textContent = t(`products.sortOptions.${sortKeys[i]}`);
      }
    });
  }

  // Update category nav buttons
  document.querySelectorAll('.nav-category').forEach(btn => {
    const category = btn.dataset.category;
    const categoryMap = {
      'Tous': 'allCategories',
      'Électronique': 'electronics',
      'Maison': 'home',
      'Mode': 'fashion',
      'Beauté': 'beauty',
      'Sport & loisirs': 'sports'
    };
    if (categoryMap[category]) {
      btn.textContent = t(`nav.${categoryMap[category]}`);
    }
  });

  // Update category tiles
  document.querySelectorAll('.category-tile').forEach(tile => {
    const category = tile.dataset.category;
    const categoryMap = {
      'Électronique': 'tech',
      'Maison': 'home',
      'Mode': 'fashion',
      'Beauté': 'beauty'
    };
    if (categoryMap[category]) {
      const catKey = categoryMap[category];
      const titleEl = tile.querySelector('b');
      const subtitleEl = tile.querySelector('small');
      if (titleEl) titleEl.textContent = t(`products.categories.${catKey}.title`);
      if (subtitleEl) subtitleEl.textContent = t(`products.categories.${catKey}.subtitle`);
    }
  });

  // Update result label
  const resultLabel = document.getElementById('resultLabel');
  if (resultLabel && resultLabel.dataset.category) {
    const category = resultLabel.dataset.category;
    const count = parseInt(resultLabel.dataset.count || '0', 10);
    if (category === 'Tous') {
      resultLabel.textContent = t('products.resultLabel.all');
    } else {
      resultLabel.textContent = t('products.resultLabel.category', { category, count });
    }
  }
}

/**
 * Setup language switcher button
 */
function setupLanguageSwitcher() {
  const langBtn = document.getElementById('languageBtn');
  if (!langBtn) return;

  // Create dropdown menu
  const dropdown = document.createElement('div');
  dropdown.className = 'language-dropdown';
  dropdown.setAttribute('role', 'menu');
  dropdown.innerHTML = `
    <button class="lang-option" data-lang="fr" role="menuitem">
      <span class="lang-flag">🇫🇷</span>
      <span class="lang-name">Français</span>
    </button>
    <button class="lang-option" data-lang="ar" role="menuitem">
      <span class="lang-flag">🇹🇳</span>
      <span class="lang-name">العربية</span>
    </button>
    <button class="lang-option" data-lang="en" role="menuitem">
      <span class="lang-flag">🇬🇧</span>
      <span class="lang-name">English</span>
    </button>
  `;

  // Insert dropdown after button
  langBtn.insertAdjacentElement('afterend', dropdown);

  // Toggle dropdown
  langBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
    langBtn.setAttribute('aria-expanded', dropdown.classList.contains('open'));
  });

  // Handle language selection
  dropdown.querySelectorAll('.lang-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      setLanguage(lang);
      dropdown.classList.remove('open');
      langBtn.setAttribute('aria-expanded', 'false');
    });
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!langBtn.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('open');
      langBtn.setAttribute('aria-expanded', 'false');
    }
  });

  // Keyboard navigation
  langBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dropdown.classList.remove('open');
      langBtn.setAttribute('aria-expanded', 'false');
      langBtn.focus();
    }
  });
}

/**
 * Update language switcher button text
 */
function updateLanguageSwitcherUI() {
  const langBtn = document.getElementById('languageBtn');
  if (!langBtn) return;

  const langNames = { fr: 'FR', ar: 'عربي', en: 'EN' };
  langBtn.textContent = langNames[currentLanguage] || currentLanguage.toUpperCase();
  langBtn.setAttribute('aria-label', t('header.languageBtnAriaLabel'));
}

/**
 * Apply RTL styles for Arabic
 */
function applyRTL() {
  if (isRTL) {
    document.documentElement.setAttribute('dir', 'rtl');
    document.documentElement.classList.add('rtl');
    document.body.classList.add('rtl');
  } else {
    document.documentElement.setAttribute('dir', 'ltr');
    document.documentElement.classList.remove('rtl');
    document.body.classList.remove('rtl');
  }
}

/**
 * Format number according to current locale
 * @param {number} value - Number to format
 * @param {Object} [options] - Intl.NumberFormat options
 * @returns {string}
 */
export function formatNumber(value, options = {}) {
  const locales = { fr: 'fr-TN', ar: 'ar-TN', en: 'en-TN' };
  return new Intl.NumberFormat(locales[currentLanguage] || 'fr-TN', options).format(value);
}

/**
 * Format currency (TND) according to current locale
 * @param {number} millimes - Amount in millimes (1 TND = 1000 millimes)
 * @returns {string}
 */
export function formatCurrency(millimes) {
  const dinars = millimes / 1000;
  const locales = { fr: 'fr-TN', ar: 'ar-TN', en: 'en-TN' };
  return new Intl.NumberFormat(locales[currentLanguage] || 'fr-TN', {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  }).format(dinars);
}

/**
 * Format date according to current locale
 * @param {Date|number} date - Date to format
 * @param {Object} [options] - Intl.DateTimeFormat options
 * @returns {string}
 */
export function formatDate(date, options = {}) {
  const locales = { fr: 'fr-TN', ar: 'ar-TN', en: 'en-TN' };
  const defaultOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  return new Intl.DateTimeFormat(locales[currentLanguage] || 'fr-TN', { ...defaultOptions, ...options }).format(new Date(date));
}

/**
 * Get plural form for count (simplified for supported languages)
 * @param {number} count - Count
 * @param {Object} forms - { one: string, other: string }
 * @returns {string}
 */
export function pluralize(count, forms) {
  if (currentLanguage === 'ar') {
    // Arabic has complex pluralization, simplified here
    if (count === 0) return forms.zero || forms.other;
    if (count === 1) return forms.one;
    if (count === 2) return forms.two || forms.other;
    if (count >= 3 && count <= 10) return forms.few || forms.other;
    return forms.other;
  }
  // French and English: singular vs plural
  return count === 1 ? forms.one : forms.other;
}

export { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE };