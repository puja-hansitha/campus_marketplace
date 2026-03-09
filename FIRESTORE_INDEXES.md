# Firestore Indexes Required

## Go to Firebase Console:
https://console.firebase.google.com/project/campusmart-489520/firestore/indexes

## Required Composite Index:

### For Messages Query:
- **Collection**: `messages`
- **Fields**:
  1. `conversationId` (Ascending)
  2. `createdAt` (Ascending)

## How to Create:

### Method 1: Click the Link in Console Error
When you try to send a message, if there's an index error, the browser console will show a link like:
```
https://console.firebase.google.com/v1/r/project/campusmart-489520/firestore/indexes?create_composite=...
```
Just click that link and it will auto-create the index.

### Method 2: Manual Creation
1. Go to: https://console.firebase.google.com/project/campusmart-489520/firestore/indexes
2. Click "Create Index"
3. Collection ID: `messages`
4. Add fields:
   - Field: `conversationId`, Order: Ascending
   - Field: `createdAt`, Order: Ascending
5. Click "Create"
6. Wait 2-5 minutes for index to build

## Check if Index Exists:
Go to Indexes tab and look for:
- Collection: `messages`
- Fields indexed: `conversationId`, `createdAt`
- Status: Enabled (green)
