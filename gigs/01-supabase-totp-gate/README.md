# Gig: Supabase TOTP gate for Next.js (App Router)

**Devmarketplace title:** `Supabase TOTP MFA gate helpers (Next.js)`

Reusable helpers that decide where a user goes after password login when **TOTP 2FA is required**: enroll vs challenge vs app. Extracted during the NED × Devmarketplace hackathon from Visual AI Tutor.

## What you get

| File | Role |
|------|------|
| `mfa.ts` | `getVerifiedTotpFactor`, `destinationAfterPasswordAuth` |

## Setup

1. Supabase project with Auth → MFA (TOTP) enabled.
2. Install: `npm i @supabase/supabase-js` (and `@supabase/ssr` if you use cookie sessions).
3. Copy `mfa.ts` into your app (e.g. `lib/auth/mfa.ts`).
4. After `signInWithPassword` succeeds:

```ts
import { destinationAfterPasswordAuth } from "./mfa";

const next = await destinationAfterPasswordAuth(supabase);
router.push(next); // "/verify-2fa" or "/app"
```

5. On `/verify-2fa`, call `supabase.auth.mfa.enroll` / `challenge` / `verify` as usual until AAL2.
6. Protect `/app` routes by checking `getAuthenticatorAssuranceLevel()` — reject `aal1` when a verified factor exists.

## Credits

Built in-event for **Visual AI Tutor** (NED × Devmarketplace, Oct 2026).

| Role | Name |
|------|------|
| Auth / deploy | Uzair Ahmed |
| AI / backend | Muhammad Taha Farrukh |
| Board UX | Muhammad Uzzam Siddiqui |
| Curriculum / docs / gigs | Muhammad Saad |

Source repo: https://github.com/MTahaFarrukh/ai-tutor-devmarketplace  
Canonical path in product: `lib/auth/mfa.ts`

## Licence

MIT — reuse freely; keep credit when publishing on Devmarketplace.
