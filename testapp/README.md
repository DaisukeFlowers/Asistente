# Calendar Assistant OAuth Frontend

Minimal public-facing React (Vite) app to request Google Calendar access for a WhatsApp scheduling assistant. Designed to pass Google OAuth app verification basics (homepage, Privacy Policy, Terms, contact channel, rationale text, logout, limited scopes display via backend).

## Overview

Pages & Routes:
- `/` Public homepage with Google Sign-In button and rationale statement.
- `/dashboard` Authenticated page showing basic Google profile (name, email, picture) & logout.
- `/privacy` Placeholder Privacy Policy.
- `/terms` Placeholder Terms of Service.
- `/contact` Contact/Support page.

Auth Flow (Frontend Portion):
1. Loads Google Identity Services script with `VITE_GOOGLE_CLIENT_ID`.
2. Renders official Google Sign-In button (or fallback if script fails).
3. Session-based auth flow: GIS button triggers backend OAuth code flow; session cookie used for `/api/auth/me`.
4. User profile (name, email, picture) displayed after session established.

## Styling (Tailwind CSS)
Tailwind is integrated for rapid iteration:
- Configuration: `tailwind.config.js` (extend brand colors & gradient). 
- Global directives: `src/index.css` uses `@tailwind base; @tailwind components; @tailwind utilities;`.
- Reusable component classes: `.btn-primary`, `.card`, `.link-underline`.
- Layout components: `Navbar`, `Footer`, `Logo` in `src/components/`.
- Hero gradient: background utility via `bg-hero-gradient` and overlay mask.

Customize brand colors:
```js
// tailwind.config.js
extend: { colors: { brand: { 500: '#2563eb', 600: '#1d4ed8' } } }
```
Swap font family by editing `fontFamily.sans` in `tailwind.config.js` and updating Google Fonts link in `index.html`.

## Security & Verification Notes
- No client secret is bundled in the frontend (never expose it here).
- Backend performs OAuth Authorization Code exchange & sets httpOnly session cookie.
- ID token signature verification & refresh rotation should be implemented server-side (see backend TODOs).
- Publish full legal documents before verification.

## Environment Variables
Copy `.env.example` to `.env.development.local` and set your public Client ID:

```
VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_OAUTH_WEB_CLIENT_ID
```

Only `VITE_*` variables are exposed. All secrets (client secret, encryption keys, Redis, etc.) live exclusively in backend env or hosting platform settings.

Staging/Production: values injected via platform env (no committed production file). Create `testapp/.env.staging.local` only if you need to simulate a staging frontend locally.

## Google Cloud Console Setup (Summary)
1. Create/Select project.
2. Enable Google Calendar API.
3. Configure OAuth consent (scopes, test users, links to homepage/privacy/terms/contact).
4. Create Web OAuth Client ID (Authorized origins + redirect URI).
5. Put Client ID into `.env`.

## Development

Install dependencies:
```bash
npm install
```

Run dev server:
```bash
npm run dev
```

Start backend (from repo root):
```bash
cd backend && npm install && npm run dev
```

Build for production:
```bash
npm run build
```

Preview:
```bash
npm run preview
```

## Component Reference
- `Logo` – Placeholder emblem (replace with SVG asset). 
- `Navbar` – Sticky top bar with primary navigation and dashboard link (when authenticated).
- `Footer` – Legal & support links with data usage clarification.
- `Home` – Hero section, GIS sign-in, rationale text, feature highlight card.
- `Dashboard` – User card with avatar, email, and logout button.

## Customization Checklist Before Production
- [ ] Replace placeholder Privacy Policy text.
- [ ] Replace Terms of Service.
- [ ] Confirm support email & add escalation contacts.
- [ ] Implement backend ID token signature verification (JWKS) & refresh rotation.
- [ ] Replace feature illustration with product screenshot.
- [ ] Provide OG image `schedulink-og.png`.
- [ ] Add analytics only after consent (if needed) and update policy.
- [ ] Audit Lighthouse accessibility & performance.

## Accessibility
- Semantic headings and nav landmarks.
- High-contrast brand colors (adjust if contrast < WCAG AA).
- Focus states supplied by Tailwind + custom ring utilities.

## Tech Stack
- React 19 + Vite
- Tailwind CSS
- react-router-dom
- Google Identity Services (button)

## License
Proprietary / Internal (update if open sourcing).

---
This codebase is a foundation for a compliant OAuth onboarding surface. Extend carefully with secure backend handling for calendar operations.
