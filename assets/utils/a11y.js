/**
 * Accessibility Utility - WCAG 2.1 AA compliance helpers for K-mart Market Tunisia
 */

let lastFocusedElement = null;
const focusableSelectors = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Trap focus within a container (for modals, drawers)
 * @param {HTMLElement} container - Container to trap focus in
 * @returns {Function} Cleanup function to remove trap
 */
export function trapFocus(container) {
  const focusableElements = container.querySelectorAll(focusableSelectors);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  function handleTabKey(e) {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }

  container.addEventListener('keydown', handleTabKey);
  firstElement?.focus();

  return () => {
    container.removeEventListener('keydown', handleTabKey);
  };
}

/**
 * Save current focus and restore later
 */
export function saveFocus() {
  lastFocusedElement = document.activeElement;
}

export function restoreFocus() {
  if (lastFocusedElement && lastFocusedElement.focus) {
    lastFocusedElement.focus();
  }
}

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 * @param {string} [priority='polite'] - 'polite' or 'assertive'
 */
export function announce(message, priority = 'polite') {
  const announcer = getOrCreateAnnouncer(priority);
  announcer.textContent = message;
  // Clear after announcement to allow repeated messages
  setTimeout(() => { announcer.textContent = ''; }, 1000);
}

function getOrCreateAnnouncer(priority) {
  const id = `a11y-announcer-${priority}`;
  let announcer = document.getElementById(id);
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = id;
    announcer.setAttribute('role', priority === 'assertive' ? 'alert' : 'status');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    document.body.appendChild(announcer);
  }
  return announcer;
}

/**
 * Skip to main content link
 */
export function createSkipLink() {
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.className = 'skip-link';
  skipLink.textContent = 'Aller au contenu principal';
  skipLink.style.cssText = `
    position: absolute;
    top: -100%;
    left: 50%;
    transform: translateX(-50%);
    background: var(--navy);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    z-index: 1000;
    text-decoration: none;
    font-weight: 600;
  `;
  skipLink.addEventListener('focus', () => {
    skipLink.style.top = '10px';
  });
  skipLink.addEventListener('blur', () => {
    skipLink.style.top = '-100%';
  });
  document.body.insertBefore(skipLink, document.body.firstChild);
  return skipLink;
}

/**
 * Manage ARIA attributes for expanded/collapsed state
 * @param {HTMLElement} trigger - Button that toggles
 * @param {HTMLElement} target - Element that expands/collapses
 * @param {boolean} expanded - Whether expanded
 */
export function setExpanded(trigger, target, expanded) {
  trigger.setAttribute('aria-expanded', expanded);
  if (target) {
    target.setAttribute('aria-hidden', !expanded);
  }
}

/**
 * Set selected state for tabs, options, etc.
 * @param {HTMLElement} element - Element to mark as selected
 * @param {boolean} selected - Whether selected
 */
export function setSelected(element, selected) {
  element.setAttribute('aria-selected', selected);
  if (selected) {
    element.setAttribute('tabindex', '0');
  } else {
    element.setAttribute('tabindex', '-1');
  }
}

/**
 * Handle keyboard navigation for horizontal lists (tabs, carousels)
 * @param {HTMLElement} container - Container with focusable children
 * @param {string} [orientation='horizontal'] - 'horizontal' or 'vertical'
 */
export function setupArrowNavigation(container, orientation = 'horizontal') {
  const items = container.querySelectorAll('[role="tab"], [role="option"], [role="menuitem"]');
  const itemArray = Array.from(items);

  container.addEventListener('keydown', (e) => {
    const currentIndex = itemArray.indexOf(document.activeElement);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    const isHorizontal = orientation === 'horizontal';
    const isRTL = document.documentElement.dir === 'rtl';

    switch (e.key) {
      case 'ArrowRight':
        nextIndex = isRTL ? currentIndex - 1 : currentIndex + 1;
        break;
      case 'ArrowLeft':
        nextIndex = isRTL ? currentIndex + 1 : currentIndex - 1;
        break;
      case 'ArrowDown':
        if (!isHorizontal) nextIndex = currentIndex + 1;
        break;
      case 'ArrowUp':
        if (!isHorizontal) nextIndex = currentIndex - 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = itemArray.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    nextIndex = (nextIndex + itemArray.length) % itemArray.length;
    itemArray[nextIndex].focus();
  });
}

/**
 * Reduce motion support
 * @returns {boolean} Whether user prefers reduced motion
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Add focus-visible polyfill behavior
 */
export function initFocusVisible() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-nav');
    }
  });

  document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-nav');
  });
}

/**
 * Check color contrast (simplified - for development)
 * @param {string} foreground - Foreground color
 * @param {string} background - Background color
 * @returns {number} Contrast ratio
 */
export function getContrastRatio(foreground, background) {
  // Simplified - in production use a proper library
  const getLuminance = (color) => {
    const rgb = hexToRgb(color);
    if (!rgb) return 0;
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Initialize all accessibility features
 */
export function initA11y() {
  createSkipLink();
  initFocusVisible();

  // Add main content landmark if missing
  if (!document.getElementById('main-content')) {
    const main = document.querySelector('main');
    if (main) main.id = 'main-content';
  }

  // Announce page changes for SPA navigation
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      announce('Page content updated');
    }
  }).observe(document, { subtree: true, childList: true });
}

export { focusableSelectors };