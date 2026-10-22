# 01 — Live on Vercel

Blocked by: None

## What we are building
The baseline Next.js 16 app deployed to Vercel and accessible on a public URL. When any user opens the link on their smartphone or laptop, they see the clean OWTA shell with header, responsive navigation, and project title.

## Why this slice
Proves the deployment pipeline (GitHub -> Vercel) works end-to-end on day one before adding database logic. Prevents deployment surprises later.

## Steps
1. Verify git repository is linked to GitHub `https://github.com/dropoflife13/owta.git` on branch `main`.
2. Confirm Vercel detects commits to `main` and creates a successful production build.
3. Record the live production URL at the top of `README.md`.

## How to test on localhost
1. Run `npm run dev`.
2. Open `http://localhost:3000` in your browser.
3. Verify the page loads cleanly with zero console errors.

## How to test on the live site
1. Push `main` to GitHub: `git push origin main`.
2. Open the live Vercel URL on your mobile phone (over cellular data, not local WiFi).
3. Confirm the page renders responsively at 375px mobile width.

## Done looks like
- [ ] Vercel dashboard shows a green "Ready" production deployment.
- [ ] The live URL is documented in `README.md`.
- [ ] The site opens on a mobile phone without errors.

