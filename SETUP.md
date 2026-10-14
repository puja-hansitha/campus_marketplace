# Campus Marketplace — Setup Guide

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- A Firebase project (Firestore + Storage enabled)

---

## 1. Firebase Setup

The app uses Firebase Firestore (database) and Firebase Storage (product photos).
Authentication is handled via localStorage — Firebase Auth is not currently used.

### Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** and follow the setup steps
3. Once created, click the **Web** icon (`</>`) to register a web app
4. Copy the `firebaseConfig` object shown — you'll need it in the next step

### Enable Firestore

1. In the Firebase Console, go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (allows open reads/writes for development)
4. Select a region and click **Done**

### Enable Storage

1. Go to **Storage** in the Firebase Console
2. Click **Get started**
3. Choose **Start in test mode**
4. Click **Done**

> ⚠️ Test mode allows anyone to read/write. Set proper security rules before going to production.

---

## 2. Configure Firebase in the Project

Open `client/src/firebase.ts` and replace the config values with your own:

```ts
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

---

## 3. Run Locally

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

---

## 4. Build for Production

```bash
cd client
npm run build
```

The production build is output to `client/dist/`.

---

## 5. Deploy

### Firebase Hosting (current live deployment)

```bash
# Install Firebase CLI if you haven't already
npm install -g firebase-tools

firebase login
firebase deploy
```

The live site is at: https://campusmart-489520.web.app

### Vercel (alternative)

A `vercel.json` is also present in the root. To deploy via Vercel:

```bash
npx vercel
```

Vercel will build with `cd client && npm ci && npm run build` and serve from `client/dist/`.

---

## 6. Admin Utilities

Two cleanup tools are available in the **Profile page** UI (visible to all logged-in users):

- **Remove Duplicate Products** — Scans Firestore for products with identical descriptions and deletes duplicates, keeping one copy.
- **Clear All Requests** — Deletes every document in the `interests` collection. Use this to reset buyer requests.

> ⚠️ These tools run against the live Firestore database. Use with caution.

The underlying functions are in `client/src/cleanupInterests.ts` and can also be called programmatically.

---

## Firestore Collections

| Collection | Purpose |
|---|---|
| `products` | All listed products (photo as base64, description, category, price, sellerId, sold flag) |
| `interests` | Buyer interest records (productId, buyerId, sellerId, buyerAgreed, sellerAgreed, sold) |
| `messages` | Chat messages (conversationId, senderId, text, createdAt) |

Conversations are identified by a `conversationId` derived from: `[buyerId, sellerId, productId].sort().join('_')`.

---

## Known Limitations

- Passwords are stored as plain text in `localStorage`. This is not suitable for production — migrate to Firebase Auth (see `Auth.tsx` for a ready implementation).
- Product photos are stored as base64 strings inside Firestore documents, not in Firebase Storage. Large photos will inflate document size and slow down reads.
- Firestore is running in test mode with no security rules — anyone with the config can read/write all data.
- The `interests` collection query is capped at 10 products (Firestore `in` query limit) in RequestsPage and HistoryPage.
