# Campus Marketplace v2 — Setup Guide

## Prerequisites
- Node.js 18+
- A Firebase project (free Spark plan is enough)

---

## Step 1 — Create a Firebase project

1. Go to https://console.firebase.google.com → **Add project**
2. Enable **Google Analytics** if you want (optional)

---

## Step 2 — Enable Firebase services

In your project console:

| Service | Where |
|---|---|
| **Authentication** | Build → Authentication → Get started → Enable Email/Password AND Google |
| **Firestore** | Build → Firestore Database → Create database → Start in **test mode** (you'll tighten rules later) |
| **Storage** | Build → Storage → Get started → Start in **test mode** |
| **Hosting** | Build → Hosting → Get started |

For **Google OAuth**, add your domain to "Authorized domains" in Authentication settings.

---

## Step 3 — Get your Firebase config

Project Settings (gear icon) → Your apps → Add app → Web → Register app → Copy the config object.

---

## Step 4 — Create your .env file

```bash
cp client/.env.example client/.env
```

Fill in client/.env:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_COLLEGE_EMAIL_DOMAIN=bvrithyderabad.edu.in
```

---

## Step 5 — Run locally

```bash
cd client
npm install      # skip if already done
npm run dev
```

Open http://localhost:5173

---

## Step 6 — Deploy Firestore rules & indexes

Install Firebase CLI if not already:
```bash
npm install -g firebase-tools
firebase login
```

Deploy rules:
```bash
# from project root
firebase deploy --only firestore:rules,firestore:indexes,storage
```

---

## Step 7 — Deploy to Firebase Hosting

```bash
cd client && npm run build && cd ..
firebase deploy --only hosting
```

---

## Firestore Collections (auto-created on first use)

| Collection | Purpose |
|---|---|
| `users` | User profiles (name, email, photoURL) |
| `products` | Listings with Firebase Storage image URLs |
| `interests` | Buyer interest records |
| `transactions` | Completed sales (Sold/Bought history) |
| `messages` | Real-time chat messages |
| `notifications` | In-app notifications |

---

## What's fixed vs the old version

| Issue | Old | New |
|---|---|---|
| Auth | localStorage (insecure) | Firebase Auth |
| Images | Base64 in Firestore (huge docs) | Firebase Storage URLs |
| User ID | Email string | Firebase UID |
| Notifications | Stub (always empty) | Fully wired |
| History Sold/Bought | Always empty | Fully wired via transactions |
| Edit lock | Not implemented | Price/category locked when buyers interested |
| Delete notification | Not implemented | Buyers notified when listing deleted |
| Styling | Custom CSS | Tailwind CSS |
