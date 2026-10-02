# SEO completion and launch handoff

## Completed in the project

- Angular prerenders the homepage and Finance, Marketing, Processes, and AI pages. Each generated HTML file contains Spanish content, a main heading, unique title/description, canonical URL, social sharing tags, and business structured data before JavaScript runs.
- Client navigation and EN/ES switching update metadata together. Canonicals strip query strings/fragments and use the directory URLs served by GitHub Pages.
- Preserved Claude's copy, logo, social image, sitemap, and other ongoing frontend changes.
- Login, registration, workspace, CRM, and unknown paths use `noindex`. Robots rules allow crawlers to see that directive; authentication remains responsible for data security.
- Unknown URLs show a not-found page instead of redirecting to the homepage. GitHub Pages uses the noindex CSR shell as `404.html` and retains HTTP 404.
- The deployment workflow validates generated HTML before uploading. It serves actual files for all five public routes rather than relying on the 404 fallback.
- Browser-only authentication storage and video playback are skipped during build-time rendering. No client database is read or changed for prerendering.

## Verification

From `nous-app`:

```powershell
npm ci
npm run build
npm run test:seo
npm run test:seo:browser
npm test -- --watch=false
```

The browser check uses installed Microsoft Edge by default; `PLAYWRIGHT_CHANNEL` can select another installed Chromium channel. It checks language changes, route transitions, private and missing pages, restoration of public metadata, and contact field editing. The static check runs in GitHub Actions without a browser.

## Deployment

Output: `dist/nous-app/browser`. The existing GitHub Actions workflow deploys when changes are pushed to `main`. This task prepares local changes; it does not publish them or alter DNS/accounts.

Publish the complete Angular project changes, including the pre-existing uncommitted Claude files required by the build. Review unrelated artifacts separately; do not commit `node_modules`, `dist`, credentials, or test screenshots just to deploy SEO.

Keep all generated route folders. For another static host, serve these public directory indexes first and use `index.csr.html` as the application fallback. Keep unknown URLs at HTTP 404. Do not rewrite every request to the prerendered homepage, which would return the wrong metadata.

Verified on 2026-10-02: `https://nousestrategia.com/` returns 200, and the GitHub Pages project address redirects there. Canonical/sitemap/image URLs therefore retain that domain. Once deployed, check `/finance/`, `/marketing/`, `/process/`, and `/ai/` return 200 and have their own page source.

## Steps requiring the owner's account

1. In Google Search Console, select or add `nousestrategia.com`. If it is not already verified, use the DNS TXT value supplied by Google in your domain provider account. No verification token is available in this workspace.
2. After deploying, submit `https://nousestrategia.com/sitemap.xml` in Search Console's Sitemaps screen.
3. Use URL Inspection for the homepage and four service pages, run the live test, and request indexing. Review indexing reports after Google recrawls; submission does not guarantee a date or ranking.

No Google Search Console or DNS account was connected for this task, so verification and submission were not performed.

## Language and structured-data scope

Spanish is the prerendered language. Visitors can continue using the existing EN/ES toggle and saved/browser language preference. Both languages share the same URL; no fictitious language URLs or hreflang alternates have been added. Separate indexable English pages would require a future URL/content routing change.

Business markup uses the existing contact details and Bogotá location. No street address, opening hours, ratings, or reviews were invented. Structured data does not guarantee a Google rich result.

References: [Angular static rendering](https://angular.dev/guide/ssr), [Google noindex guidance](https://developers.google.com/search/docs/crawling-indexing/block-indexing), [Search Console ownership verification](https://support.google.com/webmasters/answer/9008080), [Google recrawl requests](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).
