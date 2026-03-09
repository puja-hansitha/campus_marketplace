# Netlify Environment Variables

## Add these in Netlify Dashboard:
https://app.netlify.com/sites/ornate-faloodeh-3a7a8c/settings/env

Click "Add a variable" for each:

```
VITE_FIREBASE_API_KEY = AIzaSyADLr-TwnkPshZXAm6nXg4ifFauWY-MA5k
VITE_FIREBASE_AUTH_DOMAIN = campusmart-489520.firebaseapp.com
VITE_FIREBASE_PROJECT_ID = campusmart-489520
VITE_FIREBASE_STORAGE_BUCKET = campusmart-489520.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID = 990290742199
VITE_FIREBASE_APP_ID = 1:990290742199:web:5e245741559dd2a6197632
VITE_FIREBASE_MEASUREMENT_ID = G-7SP544H8TC
```

## Important:
- Add these BEFORE deploying
- Netlify will inject them during build
- Without these, the site won't connect to Firebase
