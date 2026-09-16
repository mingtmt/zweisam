# Zweisam Phase 3: Core UI Screens (Design Spec)

**Date:** 2026-09-16
**Status:** Approved

## 1. Goal

Build the core authenticated UI for Zweisam: a bottom navbar and three screens — **Home (Quests)**, **Store (Rewards)**, and **Profile**. This replaces the current placeholder welcome card on `/`.

## 2. Scope

- Bottom navigation bar shared across authenticated screens.
- Home screen: quest list with partner progress.
- Store screen: reward list with claim actions.
- Profile screen: user info, points, pairing status, sign out.
- Auth state lifted into a shared client-side context.

Out of scope: realtime listeners, FCM push, quest/reward creation UI, pairing flow (non-invite-code), device testing.

## 3. Architecture

### Route structure

```
app/
├── layout.tsx            # Root layout (unchanged: fonts, metadata, PWA)
├── login/page.tsx        # Unchanged, no navbar
└── (main)/
    ├── layout.tsx        # Auth guard + shared layout mounting <BottomNav>
    ├── page.tsx          # Home/Quests at "/" (replaces old app/page.tsx)
    ├── store/page.tsx    # Rewards
    └── profile/page.tsx  # User info, pairing, sign out
```

- Login lives outside the `(main)` group, so it never renders the navbar.
- `app/page.tsx` (old home placeholder) is removed; Home is the `(main)` route-group index at `/`.

### Auth context

New `lib/auth-context.tsx` — client-side context providing:
- `firebaseUser: firebase/auth User | null`
- `userDoc: lib/types User | null` (Firestore doc, including points/partnerId/inviteCode)
- `loading: boolean`

Provider in `app/(main)/layout.tsx`:
- On mount, subscribes to `onAuthStateChanged`.
- While loading → full-screen "Loading..." state.
- If unauthenticated → redirects to `/login`.
- On authenticated user → fetches `users/{uid}` snapshot into context.

All three screens consume this context; no repeated auth logic.

### Bottom nav

New `components/BottomNav.tsx`:
- Fixed-position bar at bottom of viewport.
- `env(safe-area-inset-bottom)` padding for standalone PWA.
- Three links via `next/navigation` `usePathname` + `Link`:
  - Home → `/`
  - Store → `/store`
  - Profile → `/profile`
- Active tab: `rose-600`; inactive: `zinc-400`.
- Icons via inline SVG (no icon library dependency).

## 4. Screen designs

### Home (Quests)

- Header: avatar thumbnail, paired display name, points badge (rose pill).
- Partner progress card: reads partner user doc (via `userDoc.partnerId`), shows partner's completed/active quest count for today as a progress bar + percentage.
- Quest grid (2 columns) of active quests from `quests` collection (`active === true`), grouped:
  - "Self-care" and "Connection" sections derived from quest title keywords.
  - Each card: title, points, schedule badge (`daily`/`weekly`), status.
- Tapping an incomplete quest cycles status `pending → active → completed`. Completing awards points to the current user's doc (Firestore transaction: increment points, set quest status).
- If `userDoc.partnerId` is null, Home shows a pairing-prompt card (invite code) in place of the quest grid; the nav tabs themselves always render.

### Store (Rewards)

- Available rewards: cards from `rewards` collection (`status === "available"`, `active`-equivalent filtering where present) with title, description, point cost, and **Claim** button.
- Claim disabled when `userDoc.points < pointCost` (button greyed out).
- Claim action: decrements user points and sets reward `status = "claimed"` (Firestore transaction).
- "Claimed" rewards listed in a muted section below.

### Profile

- Photo, display name, email.
- Large points balance.
- Pairing block:
  - If `partnerId` → show paired partner display name.
  - Else → show invite code with copy-to-clipboard button.
  - (Pairing-by-code submission is out of scope; the existing `inviteCode` is displayed read-only.)
- Sign out button (existing `logOut()` from `lib/auth.ts`).

## 5. Visual style

- Mobile-first, max-width container (`max-w-md mx-auto`) for app-like feel.
- White cards, subtle borders/shadows, rounded-xl.
- Brand `rose-600 #e11d48` for active nav, points badges, and primary actions.
- `zinc` scale for secondary text.
- Dark mode via existing `prefers-color-scheme` media query in globals.css.

## 6. Data flow

- All reads: Firestore `getDocs` / `doc` snapshots on mount.
- All writes:
  - Complete quest → `runTransaction`: check status still valued, increment `users/{uid}.points += quest.points`, set `quests/{id}.status = "completed"`.
  - Claim reward → `runTransaction`: check `points >= pointCost`, decrement points, set `rewards/{id}.status = "claimed"`.
- No realtime listeners in this phase (Phase 4 adds them).

## 7. Error handling

- Loading states on every screen while initial Firestore reads resolve.
- Empty states: "No quests today" / "No rewards available" with friendly text.
- Failed reads → error message + retry button.
- Failed writes → inline toast/error near the action; state unchanged.

## 8. Testing

- Type-check via `npm run build` (Next 16 + TS strict).
- Lint via `npm run lint`.
- Manual: sign in, complete quest, confirm points increment; claim a reward, confirm points decrement and reward moves to claimed; verify navbar active states and auth redirect.
- No automated test framework configured; not added in this phase.

## 9. Files touched

- New: `app/(main)/layout.tsx`, `app/(main)/page.tsx`, `app/(main)/store/page.tsx`, `app/(main)/profile/page.tsx`, `components/BottomNav.tsx`, `lib/auth-context.tsx`.
- Modified: `app/layout.tsx` (only if needed for route group; expected minimal), `app/page.tsx` removed (replaced by `(main)/page.tsx`).
- Unchanged: `lib/firebase.ts`, `lib/auth.ts`, `lib/types.ts`, `app/login/page.tsx`, manifest, globals.css (except possible font-family fix).

## 10. Roadmap impact

Completes **Phase 3** of the README roadmap (core UI screens). Phase 4 (service worker, realtime sync, FCM) builds on this structure.