# Campus Marketplace - Setup Instructions

## Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable Authentication:
   - Go to Authentication → Sign-in method
   - Enable "Email/Password"
4. Create Firestore Database:
   - Go to Firestore Database → Create database
   - Start in test mode (for development)
5. Create Storage:
   - Go to Storage → Get started
   - Start in test mode (for development)
6. Get your Firebase config:
   - Go to Project Settings → General
   - Scroll down to "Your apps" → Web app
   - Copy the firebaseConfig object
7. Update `src/firebase.ts` with your config values

## Run Locally

```bash
cd client
npm run dev
```

Open http://localhost:5173 in your browser.

## Test the App

1. Register a new account with name, email, and password
2. Login with your credentials
3. You should see the dashboard with your name and logout button

## Next Steps

- Complete Firebase configuration
- Build out the main features (Sell, Buy, Messages, etc.)
- Add routing for different pages
