# Firestore Security Rules for Campus Marketplace

## Go to Firebase Console:
https://console.firebase.google.com/project/campusmart-489520/firestore/rules

## Replace with these rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Products collection - anyone can read, only owner can write
    match /products/{productId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null;
    }
    
    // Interests collection - anyone authenticated can read/write
    match /interests/{interestId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null;
    }
    
    // Messages collection - anyone authenticated can read/write
    match /messages/{messageId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null;
    }
    
    // Transactions collection - anyone authenticated can read/write
    match /transactions/{transactionId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null;
    }
  }
}
```

## TEMPORARY FIX (for testing):
If you want to test immediately, use this (OPEN ACCESS - NOT SECURE):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## Steps:
1. Go to Firebase Console → Firestore Database → Rules tab
2. Replace the rules with the code above
3. Click "Publish"
4. Test messaging again

## Note:
Your app doesn't use Firebase Authentication (you're using localStorage), so the rules need to allow unauthenticated access. The temporary fix above allows all access for testing.
