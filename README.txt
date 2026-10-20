K-mart Market Tunisia — V2.2 UI Preview (PWA-ready)
===================================================

This is a static UI preview to test the K-mart storefront before the full Worker + KV version. It includes the previously generated K-mart brand identity artwork, daily visit reward demo, limited-time countdown demo, and PWA install prompt.

Browser-only preview deployment
--------------------------------
1. Open Cloudflare Dashboard → Workers & Pages → Create application → Pages → Direct Upload.
2. Create a project named kmart-market-ui-preview.
3. Upload this ZIP and deploy.
4. Open the generated pages.dev HTTPS address.

Installable website
-------------------
The site includes a Web App Manifest, icons, and a service worker. On supported browsers, use the animated “Installez K-mart Market” popup and then confirm the browser's installation prompt. On iPhone/iPad, use Safari → Share → Add to Home Screen. Installation prompts depend on browser/platform support and cannot be forced by a website.

Included UI behavior
--------------------
- Product search, categories, sorting, interactive demo cart.
- Daily check-in reward: +10 demo points once per local calendar day; streak/points saved in this browser only.
- Flash promotion countdown: a five-hour browser-local demo countdown. It is NOT a real server-controlled offer deadline.
- Responsive install nudge and install instructions for Android, iOS, and Windows browsers.
- Existing generated visual identity panel is used as a brand artwork asset.

Limitations
-----------
- This is a static preview deployed to Cloudflare Pages, not the full Worker backend.
- No real products, real discounts, payment processing, login, stock reservation, seller portal, order persistence, or customer data submission.
- Daily rewards and countdown are demo-only and stored/managed in the user's browser; they are not secure or redeemable rewards.
- The later V2-B project will connect UI components to a Cloudflare Worker API and KV binding named `Kmart`.

V2.2: product photos are optimized Unsplash images (560x560, quality 68) loaded remotely to keep ZIP size small. Click a product card to open a detail popup. Internet connection is needed for photos; demo pricing and descriptions are illustrative.
