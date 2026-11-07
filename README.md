# [Zweisam] - Gamified Couple App (PWA)

## 1. Project Overview
**[Project Name]** is a gamified application designed exclusively for couples to turn daily habits and interactions into engaging quests. 

**Core Features:**
- Complete **Daily/Weekly Quests** to accumulate **Points**.
- Reach milestones and spend points to claim **Rewards** from your partner.

## 2. Platform: Progressive Web App (PWA)
We chose the PWA approach over a native mobile app for several strategic reasons:
- **No Store Friction:** Bypasses strict App Store (iOS) and Google Play review processes.
- **Native Feel:** Supports "Add to Home Screen" for a standalone, app-like experience.
- **Push Notifications:** Fully supports Web Push Notifications (Android and iOS 16.4+).
- **Instant Updates:** Seamless deployment of new features without requiring users to download app updates.

## 3. Tech Stack
### Frontend (UI & Logic)
- **Next.js (React) & TypeScript:** Handles routing, performance optimization, and strict type-checking.
- **Tailwind CSS:** Rapid, flexible, and utility-first UI styling.
- **Native PWA Support:** Utilizing Next.js built-in metadata/manifest generation for the "Add to Home Screen" capability, keeping the bundle lightweight without third-party PWA libraries.

### Backend & Database (Data & Real-time)
- **Firebase:** Chosen for its generous free tier, zero "cold start" latency, and fast response times.
  - *Cloud Firestore:* NoSQL database to store Users, Quests, and Rewards data.
  - *Firebase Authentication:* Secure user login and pairing.
  - *Firebase Cloud Messaging (FCM):* Handled via a Custom Service Worker to deliver Web Push Notifications.

### Deployment
- **Vercel:** Free hosting, automated CI/CD via GitHub integration, and built-in SSL (which is mandatory for PWAs).

## 4. Feature Breakdown
### Quest System
- **Self-care Quests:** Hydration, reading, exercising, organizing workspace, etc.
- **Connection Quests:** Sending a sweet text, cooking a meal, giving compliments, etc.

### Reward System
- **Tier 1 (Easy):** Making a cup of coffee, 15-minute massage.
- **Tier 2 (Medium):** Picking the weekend movie, a day off from household chores.
- **Tier 3 (Hard):** Buying a small gift, fully planning and paying for a date night.

### Real-time Sync
- Points, quest statuses, and reward claims are synced instantly between both partners' devices using Firestore's real-time listeners.

## 5. Development Roadmap
- [x] **Phase 1:** Initialize the Next.js project, install Tailwind CSS, and configure Next.js metadata (Manifest/Icons) for PWA installation.
- [x] **Phase 2:** Set up the Firebase project, design the Firestore database schema, and integrate Authentication.
- [x] **Phase 3:** Build the core UI screens: Home (Quests), Store (Rewards), and Profile.
- [ ] **Phase 4:** ~~Real-time data syncing~~ (done: `onSnapshot` everywhere). Remaining: Custom Service Worker (`firebase-messaging-sw.js`) and FCM Push Notifications.
- [ ] **Phase 5:** Conduct internal testing on actual mobile devices, fix UI/UX bugs, and deploy the official build to Vercel.

## 6. Data model

```
users/{uid}                      profile, points, partnerId, coupleId, locale
couples/{uidA_uidB}              { members: [uidA, uidB], nicknames }   (uids sorted)
couples/{coupleId}/quests/{id}   daily / weekly / special quests
couples/{coupleId}/rewards/{id}  maxClaims (null = unlimited), claimCount
couples/{coupleId}/claims/{id}   claim history; reward owner marks fulfilledAt
```

Pairing writes the couple doc and `coupleId` on both users in one transaction.
Nicknames live on the couple doc (`nicknames.{uid}`) and are cleared when the
couple disconnects, so a new partner never sees an old nickname.
Each completion stores the points it awarded (`awarded.{uid}`), so unticking
refunds exactly that amount even if the quest's points were edited since.
A claim can be cancelled by its claimer until it is marked given; the points are
refunded and the reward's `claimCount` goes back down.

## 7. Deploying

1. **Firestore rules** (do this first: the app depends on them)
   ```bash
   npx firebase-tools login
   npx firebase-tools deploy --only firestore:rules
   ```
   `.firebaserc` already points at the project.
2. **Vercel**: import the GitHub repo, add the six `NEXT_PUBLIC_FIREBASE_*`
   variables from `.env.local`, deploy.
3. **Firebase Auth**: add the Vercel domain under Authentication → Settings →
   Authorized domains.
4. **On each phone**: open the site, *Add to Home Screen*, sign in from the
   installed app. If Google sign-in fails inside the installed iOS app, switch
   `signInWithPopup` to `signInWithRedirect` in `lib/auth.ts`.
