$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$files = @('assets\utils\i18n.js','assets\utils\storage.js','assets\utils\a11y.js','assets\utils\pwa.js')

foreach ($f in $files) {
  $c = Get-Content $f -Raw -Encoding UTF8

  # Strip ES module export syntax
  $c = $c -replace '(?m)^export (async )?function ', '$1function '
  $c = $c -replace '(?m)^export const ', 'const '
  $c = $c -replace '(?m)^export \{[^}]*\};\s*', ''

  Set-Content -Path $f -Value $c -Encoding UTF8 -NoNewline
}

# --- storage.js: rename generic helpers ---
$f = 'assets\utils\storage.js'
$c = Get-Content $f -Raw -Encoding UTF8
$c = $c -replace 'function get\(', 'function storageGet('
$c = $c -replace 'function set\(', 'function storageSet('
$c = $c -replace 'function remove\(', 'function storageRemove('
$c = $c -replace '(?<![\w.])get\(STORAGE_KEYS', 'storageGet(STORAGE_KEYS'
$c = $c -replace '(?<![\w.])set\(STORAGE_KEYS', 'storageSet(STORAGE_KEYS'
$c = $c -replace '(?<![\w.])remove\(STORAGE_KEYS', 'storageRemove(STORAGE_KEYS'
$c = $c -replace '(?m)^function storageGet\(key, defaultValue = null\)', 'function storageGet(key, defaultValue = null)'
Set-Content -Path $f -Value $c -Encoding UTF8 -NoNewline

# --- pwa.js: use a11y helpers + avoid global name clashes ---
$f = 'assets\utils\pwa.js'
$c = Get-Content $f -Raw -Encoding UTF8
$c = $c -replace '(?<![\w.])trapFocus\(', 'window.KMa11y.trapFocus('
$c = $c -replace '(?<![\w.])saveFocus\(\)', 'window.KMa11y.saveFocus()'
$c = $c -replace '(?<![\w.])restoreFocus\(\)', 'window.KMa11y.restoreFocus()'
$c = $c -replace 'function showToast\(message\)', 'function pwaToast(message)'
$c = $c -replace '(?<![\w.])showToast\(', 'pwaToast('
$c = $c -replace 'function pwaToast\(message\)', 'function pwaToast(message)'
$c = $c -replace "pwaToast\('K-mart", "pwaToast('K-mart"
Set-Content -Path $f -Value $c -Encoding UTF8 -NoNewline

# --- append global namespaces ---
$ns = @{
  'assets\utils\i18n.js'     = "`nwindow.KMi18n = { initI18n, setLanguage, getCurrentLanguage, getIsRTL, t, translatePage, formatNumber, formatCurrency, formatDate, pluralize, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE };`n"
  'assets\utils\storage.js'  = "`nwindow.KMStorage = { cartStorage, wishlistStorage, recentlyViewedStorage, dailyVisitStorage, flashSaleStorage, preferencesStorage, installNudgeStorage, sellerDashboardStorage, STORAGE_KEYS };`n"
  'assets\utils\a11y.js'     = "`nwindow.KMa11y = { trapFocus, saveFocus, restoreFocus, announce, createSkipLink, setExpanded, setSelected, setupArrowNavigation, prefersReducedMotion, initFocusVisible, getContrastRatio, initA11y, focusableSelectors };`n"
  'assets\utils\pwa.js'      = "`nwindow.KMPWA = { initPWA, showInstallModal, hideInstallModal, promptInstall, getInstallInstructions, queueForSync, cacheResponse, getCachedResponse, cleanupCache, isStandalone, requestNotificationPermission, subscribeToPush, getCacheEstimate, clearAllCaches, CACHE_NAME };`n"
}

foreach ($k in $ns.Keys) {
  $c = Get-Content $k -Raw -Encoding UTF8
  Add-Content -Path $k -Value $ns[$k] -Encoding UTF8 -NoNewline
}

Write-Output "Conversion complete."
